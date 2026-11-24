# Built Daily — Step challenges and daily health metrics

This is the design record for step challenges and the health-data pipeline
behind them. Steps come first. The same pipeline is meant to carry other daily
metrics later (active minutes, distance, sleep, weight) from manual entry,
the MCP server, an iOS Shortcut, and eventually Apple Health (HealthKit) and
Android Health Connect.

**Status: phase 1 built on `feat/step-challenge`, not yet merged.** Shipped:
the `dailyMetrics` docs and shared resolve rule, personal challenges (all
three rules, `days_hit` by default), the Home card with its start and
log-steps sheets, `POST /api/health/daily`, the `log_daily_metric` MCP tool,
Firestore rules, and unit tests for resolve and the rule evaluators. Not
shipped: group challenges (B, C), the iOS Shortcut bridge, native
HealthKit / Health Connect, a "disconnect a source" control, the
week-detail screen from the prototype, and deploying the new Firestore rules
(writes to the new collections are denied until they're deployed).
The design was explored on 2026-11-24. Two private Claude Artifacts show it
visually (ask Shane for access):

- Step Challenge prototype and alternatives: https://claude.ai/artifact/5ocGAmGs14Cc4sMwvjjqyx
- Health Data Pipeline: https://claude.ai/artifact/3FFHfWLrzsCYzfSrN1Vqe2

---

## Decisions

### 1. One document per day, holding every metric

```
users/{uid}/dailyMetrics/{YYYY-MM-DD}
```

The id is the user's **local calendar date**, using the same `YYYY-MM-DD` keys
as sessions and activities. Each metric lives under `metrics.<name>`. A week's
challenge is one range query returning 7 docs, and it works offline the same
way sessions do.

A doc per metric per day (`{date}_{metric}`) was considered and rejected. It
only pays off when a single metric is written very often, docs get large, or
metrics need different access rules. None of these apply to daily totals.

### 2. Keep every source's number, and resolve to one value

```ts
// users/{uid}/dailyMetrics/2026-11-24
{
  dateKey: "2026-11-24",
  metrics: {
    steps: {
      value: 9000,              // resolved: the only number consumers read
      resolvedFrom: "manual",
      sources: {
        manual:       { value: 9000, updatedAt },
        apple_health: { value: 8214, updatedAt },
        shortcut:     { value: 7730, updatedAt },
      },
    },
  },
  updatedAt,
}
```

**Resolve rule** (one pure function, shared by the client, the API route and
the MCP server):

1. **A manual edit wins.** If the user typed a number for that day, use it.
   They're correcting the sync.
2. **Otherwise use the highest synced value.** Sources are **never summed**.
   Apple Health and Health Connect already merge phone and watch data, so two
   sources reporting one day are almost always the same steps counted twice,
   or one source that hasn't caught up yet.
3. **Nothing is discarded.** Every source's value stays on the doc, so
   removing a manual edit or disconnecting a source falls back cleanly.

Sources send a **daily total they computed themselves**. Built Daily never
aggregates raw samples.

### 3. Daily totals only, no intraday samples

Daily totals cover every feature planned so far. "Steps so far today" is just
today's total updated through the day. If finer detail is ever needed:

| Need                                         | Shape                        | Where                                                                   |
| -------------------------------------------- | ---------------------------- | ----------------------------------------------------------------------- |
| Time-of-day challenges ("steps before 9 AM") | 24 hourly buckets            | Inside the same daily doc, e.g. `metrics.steps.hourly: number[24]`      |
| Walks or watch workouts as entries           | Events with start and end    | Their own collection, or as activities, matched against logged sessions |
| Heart rate during a logged workout           | A summary (average and peak) | On the session doc. Read the window from the device on demand           |
| Sleep                                        | A session crossing midnight  | Keyed to the date of the morning you woke                               |

Don't copy minute-level samples into Firestore. Apple Health and Health
Connect already keep that history on the device, and the app can query any
window when it needs one. Copying it costs writes and stores more health data
than any feature uses. Detailed analytics are also a non-goal (CLAUDE.md).

### 4. Challenges store a rule, not step data

```ts
// users/{uid}/challenges/{challengeId}
{
  metric: "steps",
  rule:
    | { kind: "days_hit", dailyTarget: 7000, daysNeeded: 5 }   // default
    | { kind: "total", target: 50000 }
    | { kind: "streak", dailyTarget: 6000, length: 7 },
  startDate: "2026-11-22",   // Sunday
  endDate: "2026-11-28",     // Saturday
  groupId: null,             // reserved for group challenges (phase 2)
  completedAt: Timestamp | null,
  createdAt, updatedAt,
}
```

Progress is **derived** from `dailyMetrics` for the date range and isn't
stored, apart from `completedAt`. A new rule kind is one pure function. Any
metric whose daily number is a sum where more is better (steps, active
minutes, distance) works with all three rules unchanged.

- **The default is forgiving.** "7,000 steps on 5 of 7 days" leaves room for
  rest days and bad days, which matches "consistency over optimization."
- **Streak is opt-in.** A broken streak feels bad, so it's never the default.
- **Weeks run Sunday to Saturday**, like the rest of the app. Use the existing
  week helpers in `lib/calendar-views.ts`.

### 5. Ways in

| Way in                      | Who uses it                              | Auth                                                  |
| --------------------------- | ---------------------------------------- | ----------------------------------------------------- |
| App write                   | Manual entry in the log sheet            | Signed-in user, guarded by Firestore rules            |
| MCP tool `log_daily_metric` | ChatGPT and Claude ("I walked 9k today") | Existing MCP auth                                     |
| `POST /api/health/daily`    | iOS Shortcut, future native apps         | Personal access token (same system as the MCP server) |

The API accepts a **batch** (`[{ date, metric, value, source }]`), so a
missed night can send the last 7 days at once. It validates bounds per metric
and writes only `metrics.<metric>.sources.<source>`, then recomputes `value`.

### 6. Privacy

- Store daily totals only. No samples and no locations.
- Disconnecting a source deletes its values and re-resolves.
- Group features (phase 2) only see derived progress, like which days were
  hit, never raw counts.

---

## Alternatives considered

|       | Design                                                                   | Verdict                                                                                                 |
| ----- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------- |
| **A** | Personal weekly challenge as a card on Home                              | **Build first.** Private and low-risk, and B and C reuse its pieces.                                    |
| **B** | Group challenge inside a group: same rule for everyone, rows of days hit | Phase 2. Each member's app writes a progress snapshot to `groups/{gid}/challenges/{id}/progress/{uid}`. |
| **C** | "Walk together": one pooled total for the group                          | After B. Needs a server-side total. One very active member can carry the group.                         |
| **D** | Steps count as showing up toward the weekly goal                         | Product decision. Not planned. It would dilute the workout habit.                                       |

---

## Roadmap

1. **Manual entry plus the API** (this branch): daily docs, resolve rule, log
   sheet, challenge card, ingest API, MCP tool.
2. **iOS Shortcut bridge**: a shared Shortcut reads today's steps from Apple
   Health and posts them nightly to the API. No App Store needed. A cheap way
   to test whether synced steps change behavior.
3. **Native shell**: wrap the app in Capacitor. iOS reads steps through
   HealthKit with background delivery (paced by iOS, roughly hourly at best).
   Android reads through Health Connect, and background reads need an extra
   permission. Both stores require a health-data privacy policy. The plugin
   calls the same API.
4. **More metrics**: add entries to the metric list (unit, how the day's
   number is built, bounds) and request the read permission.

### Metrics that could follow

| Metric             | Key                | Day's number              | Challenge?                                      |
| ------------------ | ------------------ | ------------------------- | ----------------------------------------------- |
| Steps              | `steps`            | Sum                       | Yes                                             |
| Active minutes     | `activeMinutes`    | Sum                       | Yes                                             |
| Distance           | `distanceMeters`   | Sum                       | Yes                                             |
| Watch workouts     | `externalWorkouts` | Count + list              | Maybe (must be matched against logged sessions) |
| Sleep              | `sleepMinutes`     | Night ending that morning | No                                              |
| Body weight        | `bodyWeightKg`     | Latest                    | No (could feed existing body weight tracking)   |
| Resting heart rate | `restingHr`        | Latest                    | No                                              |

---

## Open product questions

- Do steps ever count toward the weekly goal (design D)?
- In group challenges, do members see step counts or only which days were hit?
  (Proposal: days hit only.)
- Should a finished challenge repeat automatically next week, or offer a
  one-tap "Same again next week"? (Phase 1: one tap.)
- Should synced days get a visible "synced" mark in group challenges?

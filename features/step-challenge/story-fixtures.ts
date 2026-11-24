/** Sample step weeks for stories: Sun Nov 22 – Sat Nov 28 2026, today Tue Nov 24. */
import { addDaysToDateKey } from "@/lib/calendar-views";
import type { ChallengeRule, SavedChallenge } from "@/lib/challenge-types";
import { withSourceValue } from "@/lib/daily-metric-resolve";
import type { DailyMetricEntry, DailyMetricSource, DailyMetricsDoc } from "@/lib/daily-metric-types";
import {
  buildStepChallengeCardView,
  type StepChallengeCardView,
} from "@/features/step-challenge/step-challenge-model";

export const WEEK_START = "2026-11-22";
export const TODAY = "2026-11-24";

const at = new Date("2026-11-24T09:41:00");

export function challenge(rule: ChallengeRule, startDate = WEEK_START): SavedChallenge {
  return {
    id: `c-${startDate}-${rule.kind}`,
    challenge: {
      metric: "steps",
      rule,
      startDate,
      endDate: addDaysToDateKey(startDate, 6),
      groupId: null,
      completedAt: null,
      createdAt: new Date(`${startDate}T08:00:00`),
      updatedAt: new Date(`${startDate}T08:00:00`),
    },
  };
}

/** Each day's sources, Sunday first. `null` = nothing that day. */
type DaySources = Partial<Record<DailyMetricSource, number>> | null;

export function stepWeek(daySources: DaySources[], startDate = WEEK_START): Record<string, DailyMetricsDoc> {
  const out: Record<string, DailyMetricsDoc> = {};
  daySources.forEach((sources, i) => {
    if (!sources) return;
    const dateKey = addDaysToDateKey(startDate, i);
    let entry: DailyMetricEntry | null = null;
    for (const [source, value] of Object.entries(sources)) {
      entry = withSourceValue(entry, source as DailyMetricSource, value, at);
    }
    if (entry) out[dateKey] = { dateKey, metrics: { steps: entry }, updatedAt: at };
  });
  return out;
}

export const daysHit: ChallengeRule = { kind: "days_hit", dailyTarget: 7000, daysNeeded: 5 };

/** Sun and Mon hit (typed), Tue 3,100 so far. */
export const typedWeek = stepWeek([{ manual: 8200 }, { manual: 7500 }, { manual: 3100 }]);

/** The same week, synced from Apple Health; today's sync is still catching up. */
export const syncedWeek = stepWeek([
  { apple_health: 8214 },
  { apple_health: 7480, shortcut: 7120 },
  { apple_health: 4120 },
]);

/** Five days hit by Friday. */
export const finishedWeek = stepWeek([
  { apple_health: 8214 },
  { apple_health: 7480 },
  { manual: 9000, apple_health: 6900 },
  { apple_health: 7720 },
  { apple_health: 3010 },
  { apple_health: 10240 },
]);

export function cardView(
  saved: SavedChallenge,
  days: Record<string, DailyMetricsDoc>,
  todayKey = TODAY,
  upcoming: SavedChallenge | null = null,
): StepChallengeCardView {
  return buildStepChallengeCardView(saved, days, todayKey, upcoming);
}

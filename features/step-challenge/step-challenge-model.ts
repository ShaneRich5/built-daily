import {
  addDaysToDateKey,
  endOfMonthDateKey,
  endOfWeekDateKey,
  startOfMonthDateKey,
  startOfWeekDateKey,
} from "@/lib/calendar-views";
import {
  describeChallengeRule,
  evaluateChallenge,
  type ChallengeTone,
} from "@/lib/challenge-evaluate";
import type {
  ChallengePeriod,
  ChallengeRule,
  SavedChallenge,
} from "@/lib/challenge-types";
import { resolveDailyMetric } from "@/lib/daily-metric-resolve";
import {
  DAILY_METRIC_SOURCE_LABELS,
  type DailyMetricsDoc,
} from "@/lib/daily-metric-types";
import { dateFromLocalDateKey } from "@/lib/workout-date";

/** How long a finished challenge stays on Home after its last day. */
export const ENDED_VISIBLE_DAYS = 3;

/** The week (Sunday–Saturday) or calendar month containing `dateKey`. */
export function challengeRange(
  period: ChallengePeriod,
  dateKey: string,
): { startDate: string; endDate: string } {
  return period === "month"
    ? {
        startDate: startOfMonthDateKey(dateKey),
        endDate: endOfMonthDateKey(dateKey),
      }
    : {
        startDate: startOfWeekDateKey(dateKey),
        endDate: endOfWeekDateKey(dateKey),
      };
}

const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export type StepDayCell = {
  dateKey: string;
  /** "S", "M", … */
  letter: string;
  /** 1–31, for the month grid. */
  dayOfMonth: number;
  /** "8.2k", "–" (nothing yet), or "" for a day still ahead. */
  short: string;
  hit: boolean;
  isToday: boolean;
  isFuture: boolean;
  /** The day's number came from a sync rather than being typed. */
  synced: boolean;
  label: string;
};

export type StepChallengeCardView = {
  id: string;
  period: ChallengePeriod;
  /** `ended`: the period is over and fell short. `done` can come early. */
  state: "active" | "done" | "ended";
  heading: string;
  rangeLabel: string;
  title: string;
  /** "2" with "/ 5 days", or "32,400" with "/ 50,000". */
  bigValue: string;
  bigSuffix: string;
  status: string;
  tone: ChallengeTone;
  progress: number;
  /** The total rule shows a bar; day-based rules read better as dots. */
  showBar: boolean;
  days: StepDayCell[];
  /** Today's number and where it came from, while the challenge is running. */
  today: { value: string; source: string | null; synced: boolean } | null;
  /** "Same again next week" or "Same again this month"; null once that one is set. */
  repeatLabel: string | null;
  /** The next week's or month's challenge already exists. */
  nextSet: boolean;
  rule: ChallengeRule;
};

/** "8.2k", "950", "–" */
export function shortSteps(value: number | null): string {
  if (value == null) return "–";
  if (value < 1000) return String(value);
  return `${(value / 1000).toFixed(1).replace(/\.0$/, "")}k`;
}

/** "Nov 22–28", or "Nov 29 – Dec 5" across months. */
export function rangeLabel(startDate: string, endDate: string): string {
  const start = dateFromLocalDateKey(startDate);
  const end = dateFromLocalDateKey(endDate);
  if (!start || !end) return "";
  const month = (d: Date) =>
    new Intl.DateTimeFormat("en-US", { month: "short" }).format(d);
  return start.getMonth() === end.getMonth()
    ? `${month(start)} ${start.getDate()}–${end.getDate()}`
    : `${month(start)} ${start.getDate()} – ${month(end)} ${end.getDate()}`;
}

/** "Tuesday, Nov 24" */
export function dayTitle(dateKey: string): string {
  const d = dateFromLocalDateKey(dateKey);
  if (!d) return dateKey;
  const md = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(d);
  return `${DAY_NAMES[d.getDay()]}, ${md}`;
}

function dayName(dateKey: string): string {
  const d = dateFromLocalDateKey(dateKey);
  return d ? DAY_NAMES[d.getDay()]! : dateKey;
}

/** Resolved step count per day, for the evaluator. */
export function stepValuesByDate(
  days: Record<string, DailyMetricsDoc>,
): Record<string, number | null> {
  const out: Record<string, number | null> = {};
  for (const [dateKey, day] of Object.entries(days)) {
    out[dateKey] = day.metrics.steps?.value ?? null;
  }
  return out;
}

export type HomeChallengePick = {
  /** The running challenge, or one that ended in the last few days. */
  shown: SavedChallenge | null;
  /** A challenge already set to start after the shown one. */
  upcoming: SavedChallenge | null;
};

/** Which challenge Home shows. Latest created wins if two cover the same day. */
export function pickHomeChallenge(
  rows: SavedChallenge[],
  todayKey: string,
): HomeChallengePick {
  const newestFirst = [...rows].sort(
    (a, b) => b.challenge.createdAt.getTime() - a.challenge.createdAt.getTime(),
  );
  const current = newestFirst.find(
    (r) => r.challenge.startDate <= todayKey && todayKey <= r.challenge.endDate,
  );
  const upcoming =
    newestFirst.find((r) => r.challenge.startDate > todayKey) ?? null;
  if (current) return { shown: current, upcoming };

  const recentlyEnded = newestFirst
    .filter(
      (r) =>
        r.challenge.endDate < todayKey &&
        addDaysToDateKey(r.challenge.endDate, ENDED_VISIBLE_DAYS) >= todayKey,
    )
    .sort((a, b) => b.challenge.endDate.localeCompare(a.challenge.endDate))[0];
  return { shown: recentlyEnded ?? null, upcoming };
}

/**
 * The range a repeat covers, in the same period: the next one while this one
 * runs, else the one containing today.
 */
export function repeatRange(
  saved: SavedChallenge,
  todayKey: string,
): { startDate: string; endDate: string } {
  const { period, endDate } = saved.challenge;
  const from = endDate >= todayKey ? addDaysToDateKey(endDate, 1) : todayKey;
  return challengeRange(period, from);
}

export function buildStepChallengeCardView(
  saved: SavedChallenge,
  days: Record<string, DailyMetricsDoc>,
  todayKey: string,
  upcoming: SavedChallenge | null,
): StepChallengeCardView {
  const { challenge } = saved;
  const progress = evaluateChallenge(
    challenge,
    stepValuesByDate(days),
    todayKey,
  );
  const state = progress.done ? "done" : progress.ended ? "ended" : "active";
  const isTotal = challenge.rule.kind === "total";
  const { period } = challenge;
  const noun = period === "month" ? "month" : "week";

  const cells: StepDayCell[] = progress.days.map((d) => {
    const resolvedFrom = days[d.dateKey]?.metrics.steps?.resolvedFrom ?? null;
    const synced =
      !d.isFuture && resolvedFrom != null && resolvedFrom !== "manual";
    const name = dayName(d.dateKey);
    // In a month grid the weekday alone is ambiguous, so say the date too.
    const spoken = period === "month" ? dayTitle(d.dateKey) : name;
    const amount =
      d.value == null
        ? "nothing logged"
        : `${d.value.toLocaleString("en-US")} steps`;
    return {
      dateKey: d.dateKey,
      letter: name[0]!,
      dayOfMonth: Number(d.dateKey.slice(8, 10)),
      short: d.isFuture ? "" : shortSteps(d.value),
      hit: d.hit,
      isToday: d.isToday,
      isFuture: d.isFuture,
      synced,
      label: d.isFuture
        ? `${spoken}, not yet`
        : `${spoken}, ${amount}${synced && resolvedFrom ? `, from ${DAILY_METRIC_SOURCE_LABELS[resolvedFrom]}` : ""}${
            d.hit && !isTotal ? ", target hit" : ""
          }. Edit steps.`,
    };
  });

  const todayEntry = days[todayKey]?.metrics.steps ?? null;
  const running =
    challenge.startDate <= todayKey && todayKey <= challenge.endDate;
  const repeatStart = repeatRange(saved, todayKey).startDate;
  const nextSet =
    upcoming != null && upcoming.challenge.startDate <= repeatStart;

  return {
    id: saved.id,
    period,
    state,
    heading: progress.ended
      ? `Last ${noun}’s steps`
      : progress.done
        ? "Challenge complete"
        : `This ${noun}’s steps`,
    rangeLabel: rangeLabel(challenge.startDate, challenge.endDate),
    title: describeChallengeRule(challenge.rule, challenge.metric, period),
    bigValue: progress.current.toLocaleString("en-US"),
    bigSuffix: isTotal
      ? `/ ${progress.goal.toLocaleString("en-US")}`
      : `/ ${progress.goal} days`,
    status: progress.status,
    tone: progress.tone,
    progress: progress.progress,
    showBar: isTotal,
    days: cells,
    today: running
      ? {
          value:
            todayEntry?.value != null
              ? todayEntry.value.toLocaleString("en-US")
              : "nothing yet",
          source: todayEntry?.resolvedFrom
            ? DAILY_METRIC_SOURCE_LABELS[todayEntry.resolvedFrom]
            : null,
          synced:
            todayEntry?.resolvedFrom != null &&
            todayEntry.resolvedFrom !== "manual",
        }
      : null,
    repeatLabel:
      state === "active" || nextSet
        ? null
        : running
          ? `Same again next ${noun}`
          : `Same again this ${noun}`,
    nextSet,
    rule: challenge.rule,
  };
}

/** What the log sheet needs to know about one day. */
export type LogStepsDay = {
  dateKey: string;
  title: string;
  /** The number the user typed, if any. */
  manual: number | null;
  /** The highest synced number and its source, if any. */
  synced: { value: number; source: string } | null;
};

export function buildLogStepsDay(
  dateKey: string,
  days: Record<string, DailyMetricsDoc>,
): LogStepsDay {
  const sources = days[dateKey]?.metrics.steps?.sources ?? {};
  // What the day would show without the typed number.
  const { manual, ...syncedSources } = sources;
  const fallback = resolveDailyMetric(syncedSources);
  return {
    dateKey,
    title: `Steps for ${dayTitle(dateKey)}`,
    manual: manual?.value ?? null,
    synced:
      fallback.value != null && fallback.resolvedFrom
        ? {
            value: fallback.value,
            source: DAILY_METRIC_SOURCE_LABELS[fallback.resolvedFrom],
          }
        : null,
  };
}

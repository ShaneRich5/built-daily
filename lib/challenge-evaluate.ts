import { addDaysToDateKey } from "@/lib/calendar-views";
import type {
  ChallengeRule,
  DaysHitRule,
  StreakRule,
  TotalRule,
} from "@/lib/challenge-types";
import { DAILY_METRICS, type DailyMetricKey } from "@/lib/daily-metric-types";

/**
 * Pure challenge progress: one evaluator per rule kind, all reading the same
 * list of days. Nothing here is stored except `completedAt`, which the app
 * sets the first time `done` turns true.
 */

export type ChallengeDay = {
  dateKey: string;
  /** Resolved value for the day; null when nothing is logged or synced. */
  value: number | null;
  /** At or above the day's target (for `total`, the fair daily share). */
  hit: boolean;
  isToday: boolean;
  isFuture: boolean;
};

/** Where the week stands, in a word. There is no "failed". */
export type ChallengeTone = "on" | "tight" | "off" | "done";

export type ChallengeProgress = {
  done: boolean;
  /** 0–1, for a bar or a screen reader. */
  progress: number;
  /** Days hit, total so far, or current run, against `goal`. */
  current: number;
  goal: number;
  tone: ChallengeTone;
  /** One calm sentence: what's left, or that it's done. */
  status: string;
  /** True once the last day has passed. */
  ended: boolean;
  days: ChallengeDay[];
};

export type ChallengeInput = {
  metric: DailyMetricKey;
  rule: ChallengeRule;
  startDate: string;
  endDate: string;
};

/** Safety cap on a range's length (challenges are one week today). */
const MAX_RANGE_DAYS = 31;

function fmt(n: number): string {
  return n.toLocaleString("en-US");
}

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

/** "7,000 steps on 5 of 7 days" */
export function describeChallengeRule(
  rule: ChallengeRule,
  metric: DailyMetricKey = "steps",
): string {
  const unit = DAILY_METRICS[metric].unit;
  switch (rule.kind) {
    case "days_hit":
      return `${fmt(rule.dailyTarget)} ${unit} on ${rule.daysNeeded} of 7 days`;
    case "total":
      return `${fmt(rule.target)} ${unit} this week`;
    case "streak":
      return `${fmt(rule.dailyTarget)} a day, ${rule.length} days running`;
  }
}

/** The date keys from `startDate` to `endDate`, inclusive. */
export function challengeDateKeys(startDate: string, endDate: string): string[] {
  const keys: string[] = [];
  let key = startDate;
  while (key <= endDate && keys.length < MAX_RANGE_DAYS) {
    keys.push(key);
    key = addDaysToDateKey(key, 1);
  }
  return keys;
}

type DayValues = Record<string, number | null | undefined>;

/** Days still to play for: today (unless already hit) and every day after it. */
function openDayCount(days: ChallengeDay[]): number {
  return days.filter((d) => d.isFuture || (d.isToday && !d.hit)).length;
}

function buildDays(
  input: ChallengeInput,
  values: DayValues,
  todayKey: string,
  dayTarget: number,
): ChallengeDay[] {
  return challengeDateKeys(input.startDate, input.endDate).map((dateKey) => {
    const isFuture = dateKey > todayKey;
    // A future day can't count yet, even if a source sent something early.
    const value = isFuture ? null : (values[dateKey] ?? null);
    return {
      dateKey,
      value,
      hit: value != null && value >= dayTarget,
      isToday: dateKey === todayKey,
      isFuture,
    };
  });
}

const FRESH_START = "A new week is a fresh start.";

export function evaluateDaysHit(
  input: ChallengeInput & { rule: DaysHitRule },
  values: DayValues,
  todayKey: string,
): ChallengeProgress {
  const { dailyTarget, daysNeeded } = input.rule;
  const days = buildDays(input, values, todayKey, dailyTarget);
  const hit = days.filter((d) => d.hit).length;
  const done = hit >= daysNeeded;
  const ended = todayKey > input.endDate;
  const need = daysNeeded - hit;
  const open = openDayCount(days);
  const base = { done, ended, days, current: hit, goal: daysNeeded };
  const progress = Math.min(1, hit / daysNeeded);

  if (done) {
    return { ...base, progress, tone: "done", status: "Enough days are in. Anything more is a bonus." };
  }
  if (ended) {
    return { ...base, progress, tone: "off", status: `${hit} of ${daysNeeded} days this time. ${FRESH_START}` };
  }
  if (need > open) {
    return {
      ...base,
      progress,
      tone: "off",
      status: `Needs ${plural(need, "more day")} and ${open} ${open === 1 ? "is" : "are"} left. A new week starts Sunday.`,
    };
  }
  if (need === open) {
    return { ...base, progress, tone: "tight", status: `Needs ${need} of the ${plural(open, "day")} left. No spare days.` };
  }
  return {
    ...base,
    progress,
    tone: "on",
    status: `Needs ${need} of the ${plural(open, "day")} left, ${open - need} to spare.`,
  };
}

export function evaluateTotal(
  input: ChallengeInput & { rule: TotalRule },
  values: DayValues,
  todayKey: string,
): ChallengeProgress {
  const { target } = input.rule;
  const unit = DAILY_METRICS[input.metric].unit;
  const keys = challengeDateKeys(input.startDate, input.endDate);
  // A day "counts" in the dots when it carries its fair share of the target.
  const fairShare = Math.round(target / Math.max(1, keys.length) / 100) * 100;
  const days = buildDays(input, values, todayKey, fairShare);
  const sum = days.reduce((acc, d) => acc + (d.value ?? 0), 0);
  const done = sum >= target;
  const ended = todayKey > input.endDate;
  const base = { done, ended, days, current: sum, goal: target, progress: Math.min(1, sum / target) };

  if (done) {
    return { ...base, tone: "done", status: "Target reached. Anything more is a bonus." };
  }
  if (ended) {
    return { ...base, tone: "off", status: `${fmt(sum)} ${unit} this time. ${FRESH_START}` };
  }
  const daysLeft = days.filter((d) => d.isToday || d.isFuture).length;
  const perDay = Math.ceil((target - sum) / Math.max(1, daysLeft) / 100) * 100;
  const tone: ChallengeTone = perDay > 20_000 ? "off" : perDay > 12_000 ? "tight" : "on";
  return {
    ...base,
    tone,
    status: `About ${fmt(perDay)} a day for the ${plural(daysLeft, "day")} left.`,
  };
}

/**
 * A run is consecutive days at target. Today not being hit yet doesn't break
 * the run (the day isn't over); any earlier miss does. Done once any run in
 * the range reaches `length`.
 */
export function evaluateStreak(
  input: ChallengeInput & { rule: StreakRule },
  values: DayValues,
  todayKey: string,
): ChallengeProgress {
  const { dailyTarget, length } = input.rule;
  const days = buildDays(input, values, todayKey, dailyTarget);
  let run = 0;
  let best = 0;
  for (const day of days) {
    if (day.isFuture) break;
    if (day.hit) run += 1;
    else if (!day.isToday) run = 0;
    best = Math.max(best, run);
  }
  const done = best >= length;
  const ended = todayKey > input.endDate;
  const current = done ? length : run;
  const base = { done, ended, days, current, goal: length, progress: Math.min(1, current / length) };

  if (done) {
    return { ...base, tone: "done", status: `${length} days in a row. Anything more is a bonus.` };
  }
  if (ended) {
    return { ...base, tone: "off", status: `Longest run: ${plural(best, "day")}. ${FRESH_START}` };
  }
  if (length - run > openDayCount(days)) {
    return {
      ...base,
      tone: "off",
      status: `A ${length}-day run can't fit in what's left of this week. Start a new one Sunday.`,
    };
  }
  return {
    ...base,
    tone: "on",
    status:
      run === 0
        ? `Every day at ${fmt(dailyTarget)} from here builds the run.`
        : `${run}-day run. Every day from here keeps it going.`,
  };
}

/** Progress for any rule kind. `values` maps date keys to the resolved daily value. */
export function evaluateChallenge(
  input: ChallengeInput,
  values: DayValues,
  todayKey: string,
): ChallengeProgress {
  const { rule } = input;
  switch (rule.kind) {
    case "days_hit":
      return evaluateDaysHit({ ...input, rule }, values, todayKey);
    case "total":
      return evaluateTotal({ ...input, rule }, values, todayKey);
    case "streak":
      return evaluateStreak({ ...input, rule }, values, todayKey);
  }
}

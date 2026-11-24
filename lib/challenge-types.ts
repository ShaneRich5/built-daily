import type { DailyMetricKey } from "@/lib/daily-metric-types";

/**
 * Challenges store a rule and a date range, never step data. Progress is
 * derived from `dailyMetrics` (see `lib/challenge-evaluate.ts`). Each rule
 * works for any daily metric where the day's number is a sum and more is
 * better (steps today; active minutes or distance later).
 */

/** "7,000 steps on 5 of 7 days". The default: leaves room for rest days. */
export type DaysHitRule = {
  kind: "days_hit";
  dailyTarget: number;
  daysNeeded: number;
};

/** "50,000 steps this week", any mix of days. */
export type TotalRule = { kind: "total"; target: number };

/** "6,000 a day, 7 days running". Opt-in only, since a broken streak feels bad. */
export type StreakRule = {
  kind: "streak";
  dailyTarget: number;
  length: number;
};

export type ChallengeRule = DaysHitRule | TotalRule | StreakRule;
export type ChallengeRuleKind = ChallengeRule["kind"];

/** A Sunday–Saturday week, or a whole calendar month. */
export type ChallengePeriod = "week" | "month";

/** `users/{uid}/challenges/{challengeId}` */
export type ChallengeDoc = {
  metric: DailyMetricKey;
  rule: ChallengeRule;
  /** Missing on docs written before monthly challenges, which were all weekly. */
  period: ChallengePeriod;
  /** `YYYY-MM-DD`: a Sunday, or the 1st for a month. */
  startDate: string;
  /** `YYYY-MM-DD`: a Saturday, or the month's last day. */
  endDate: string;
  /** Reserved for group challenges (phase 2). Always null for now. */
  groupId: null;
  /** Set the first time the challenge is done; never cleared by later edits to a day. */
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type SavedChallenge = {
  id: string;
  challenge: ChallengeDoc;
};

export function isChallengePeriod(v: unknown): v is ChallengePeriod {
  return v === "week" || v === "month";
}

type Limit = { min: number; max: number; step: number };

export type ChallengeLimits = {
  dailyTarget: Limit;
  daysNeeded: Limit;
  total: Limit;
  streakLength: Limit;
};

const DAILY_TARGET: Limit = { min: 1_000, max: 50_000, step: 500 };

/**
 * Bounds for each rule field, shared by the start sheet, mapper and rules.
 * A month allows up to 31 days; the start sheet caps it at the month's length.
 */
export const CHALLENGE_LIMITS: Record<ChallengePeriod, ChallengeLimits> = {
  week: {
    dailyTarget: DAILY_TARGET,
    daysNeeded: { min: 1, max: 7, step: 1 },
    total: { min: 5_000, max: 500_000, step: 5_000 },
    streakLength: { min: 2, max: 7, step: 1 },
  },
  month: {
    dailyTarget: DAILY_TARGET,
    daysNeeded: { min: 1, max: 31, step: 1 },
    total: { min: 20_000, max: 1_500_000, step: 10_000 },
    streakLength: { min: 2, max: 31, step: 1 },
  },
};

export type ChallengePreset = {
  kind: ChallengeRuleKind;
  rule: ChallengeRule;
  hint: string;
};

/** The three one-tap presets per period. `days_hit` first: it's the default. */
export const CHALLENGE_PRESETS: Record<ChallengePeriod, ChallengePreset[]> = {
  week: [
    {
      kind: "days_hit",
      rule: { kind: "days_hit", dailyTarget: 7_000, daysNeeded: 5 },
      hint: "Room for two off days. The default.",
    },
    {
      kind: "total",
      rule: { kind: "total", target: 50_000 },
      hint: "Any mix of days. Good for uneven weeks.",
    },
    {
      kind: "streak",
      rule: { kind: "streak", dailyTarget: 6_000, length: 7 },
      hint: "For people who already walk daily.",
    },
  ],
  month: [
    {
      kind: "days_hit",
      rule: { kind: "days_hit", dailyTarget: 7_000, daysNeeded: 20 },
      hint: "About two off days a week. The default.",
    },
    {
      kind: "total",
      rule: { kind: "total", target: 200_000 },
      hint: "Any mix of days. Busy weeks even out.",
    },
    {
      kind: "streak",
      rule: { kind: "streak", dailyTarget: 6_000, length: 14 },
      hint: "Two weeks running, any time in the month.",
    },
  ],
};

export function defaultChallengeRule(period: ChallengePeriod): ChallengeRule {
  return CHALLENGE_PRESETS[period][0]!.rule;
}

export const DEFAULT_CHALLENGE_RULE: ChallengeRule =
  defaultChallengeRule("week");

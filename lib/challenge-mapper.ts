import { Timestamp } from "firebase/firestore";
import {
  CHALLENGE_LIMITS,
  type ChallengeDoc,
  type ChallengeRule,
} from "@/lib/challenge-types";
import { isDailyMetricKey } from "@/lib/daily-metric-types";

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;

function asDate(v: unknown): Date | null {
  return v instanceof Timestamp ? v.toDate() : null;
}

function inRange(v: unknown, limits: { min: number; max: number }): v is number {
  return (
    typeof v === "number" &&
    Number.isInteger(v) &&
    v >= limits.min &&
    v <= limits.max
  );
}

/** A rule with every field inside `CHALLENGE_LIMITS`, or null. */
export function parseChallengeRule(raw: unknown): ChallengeRule | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  switch (r.kind) {
    case "days_hit":
      return inRange(r.dailyTarget, CHALLENGE_LIMITS.dailyTarget) &&
        inRange(r.daysNeeded, CHALLENGE_LIMITS.daysNeeded)
        ? { kind: "days_hit", dailyTarget: r.dailyTarget, daysNeeded: r.daysNeeded }
        : null;
    case "total":
      return inRange(r.target, CHALLENGE_LIMITS.total)
        ? { kind: "total", target: r.target }
        : null;
    case "streak":
      return inRange(r.dailyTarget, CHALLENGE_LIMITS.dailyTarget) &&
        inRange(r.length, CHALLENGE_LIMITS.streakLength)
        ? { kind: "streak", dailyTarget: r.dailyTarget, length: r.length }
        : null;
    default:
      return null;
  }
}

/** Only the rule's own fields, so a preset's extras never reach Firestore. */
export function challengeRuleToFirestore(rule: ChallengeRule): Record<string, unknown> {
  switch (rule.kind) {
    case "days_hit":
      return { kind: rule.kind, dailyTarget: rule.dailyTarget, daysNeeded: rule.daysNeeded };
    case "total":
      return { kind: rule.kind, target: rule.target };
    case "streak":
      return { kind: rule.kind, dailyTarget: rule.dailyTarget, length: rule.length };
  }
}

export function challengeDocToFirestore(doc: ChallengeDoc): Record<string, unknown> {
  return {
    metric: doc.metric,
    rule: challengeRuleToFirestore(doc.rule),
    startDate: doc.startDate,
    endDate: doc.endDate,
    groupId: null,
    completedAt: doc.completedAt ? Timestamp.fromDate(doc.completedAt) : null,
    createdAt: Timestamp.fromDate(doc.createdAt),
    updatedAt: Timestamp.fromDate(doc.updatedAt),
  };
}

export function firestoreToChallengeDoc(
  data: Record<string, unknown>,
): ChallengeDoc | null {
  if (!isDailyMetricKey(data.metric)) return null;
  const rule = parseChallengeRule(data.rule);
  if (!rule) return null;

  const { startDate, endDate } = data;
  if (typeof startDate !== "string" || !DATE_KEY.test(startDate)) return null;
  if (typeof endDate !== "string" || !DATE_KEY.test(endDate)) return null;
  if (endDate < startDate) return null;

  const createdAt = asDate(data.createdAt);
  if (!createdAt) return null;

  return {
    metric: data.metric,
    rule,
    startDate,
    endDate,
    groupId: null,
    completedAt: asDate(data.completedAt),
    createdAt,
    updatedAt: asDate(data.updatedAt) ?? createdAt,
  };
}

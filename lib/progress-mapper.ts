import { Timestamp } from "firebase/firestore";
import {
  DEFAULT_PROGRESS_SETTINGS,
  MOVEMENT_GOAL_OPTIONS,
  type BodyWeightEntryDoc,
  type MovementGoalTarget,
  type ProgressSettingsDoc,
  type WeeklyGoalTarget,
  WEEKLY_GOAL_OPTIONS,
} from "@/lib/progress-types";

function asTimestamp(v: unknown): Date | null {
  if (v instanceof Timestamp) return v.toDate();
  if (
    v &&
    typeof v === "object" &&
    "seconds" in v &&
    typeof (v as { seconds: unknown }).seconds === "number"
  ) {
    return new Timestamp(
      (v as { seconds: number }).seconds,
      "nanoseconds" in v &&
        typeof (v as { nanoseconds: unknown }).nanoseconds === "number"
        ? (v as { nanoseconds: number }).nanoseconds
        : 0,
    ).toDate();
  }
  return null;
}

function asWeeklyGoal(v: unknown): WeeklyGoalTarget {
  if (typeof v === "number" && WEEKLY_GOAL_OPTIONS.includes(v as WeeklyGoalTarget)) {
    return v as WeeklyGoalTarget;
  }
  return DEFAULT_PROGRESS_SETTINGS.weeklyGoal;
}

function asMovementGoal(v: unknown): MovementGoalTarget {
  if (
    typeof v === "number" &&
    MOVEMENT_GOAL_OPTIONS.includes(v as MovementGoalTarget)
  ) {
    return v as MovementGoalTarget;
  }
  return DEFAULT_PROGRESS_SETTINGS.movementGoalDays;
}

export function progressSettingsToFirestore(
  doc: ProgressSettingsDoc,
): Record<string, unknown> {
  return {
    weeklyGoal: doc.weeklyGoal,
    movementGoalDays: doc.movementGoalDays,
    goalWeightLbs: doc.goalWeightLbs,
    updatedAt: Timestamp.fromDate(doc.updatedAt),
  };
}

export function firestoreToProgressSettings(
  data: Record<string, unknown> | undefined,
): ProgressSettingsDoc {
  if (!data) return { ...DEFAULT_PROGRESS_SETTINGS };
  const goalRaw = data.goalWeightLbs;
  const goalWeightLbs =
    goalRaw == null
      ? null
      : typeof goalRaw === "number" && Number.isFinite(goalRaw) && goalRaw > 0
        ? Math.round(goalRaw * 10) / 10
        : null;
  return {
    weeklyGoal: asWeeklyGoal(data.weeklyGoal),
    movementGoalDays: asMovementGoal(data.movementGoalDays),
    goalWeightLbs,
    updatedAt: asTimestamp(data.updatedAt) ?? new Date(0),
  };
}

export function bodyWeightEntryToFirestore(
  doc: BodyWeightEntryDoc,
): Record<string, unknown> {
  return {
    dateKey: doc.dateKey,
    weightLbs: doc.weightLbs,
    createdAt: Timestamp.fromDate(doc.createdAt),
  };
}

export function firestoreToBodyWeightEntry(
  data: Record<string, unknown>,
): BodyWeightEntryDoc | null {
  const dateKey =
    typeof data.dateKey === "string" && /^\d{4}-\d{2}-\d{2}$/.test(data.dateKey)
      ? data.dateKey
      : "";
  const weightLbs =
    typeof data.weightLbs === "number" && Number.isFinite(data.weightLbs)
      ? Math.round(data.weightLbs * 10) / 10
      : NaN;
  const createdAt = asTimestamp(data.createdAt);
  if (!dateKey || !Number.isFinite(weightLbs) || weightLbs <= 0 || !createdAt) {
    return null;
  }
  return { dateKey, weightLbs, createdAt };
}

import { Timestamp } from "firebase/firestore";
import {
  PUBLIC_PROFILE_LIMITS,
  type PublicActivityByDay,
  type PublicProfileDoc,
} from "@/lib/public-profile-types";
import { weekStartMondayKey } from "@/lib/progress-insights";
import {
  activityMapToRecord,
  pruneActivityByDay,
  type WorkoutActivityByDay,
} from "@/lib/workout-activity";

export { activityMapToRecord, pruneActivityByDay };

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

function asDateKey(v: unknown): string | null {
  if (v == null || v === "") return null;
  if (typeof v !== "string") return null;
  return /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null;
}

function asNonNegInt(v: unknown): number {
  if (typeof v === "number" && Number.isFinite(v)) {
    return Math.max(0, Math.round(v));
  }
  return 0;
}

export function activityRecordToMap(
  record: PublicActivityByDay,
): WorkoutActivityByDay {
  const map: WorkoutActivityByDay = new Map();
  for (const [key, count] of Object.entries(record)) {
    if (count > 0) map.set(key, count);
  }
  return map;
}

function asActivityByDay(v: unknown): PublicActivityByDay {
  if (!v || typeof v !== "object" || Array.isArray(v)) return {};
  const out: PublicActivityByDay = {};
  for (const [key, count] of Object.entries(v as Record<string, unknown>)) {
    const dateKey = asDateKey(key);
    if (!dateKey) continue;
    const n = asNonNegInt(count);
    if (n > 0) out[dateKey] = n;
  }
  return pruneActivityByDay(out);
}

export function publicProfileDocToFirestore(doc: PublicProfileDoc) {
  return {
    displayName: doc.displayName.slice(0, PUBLIC_PROFILE_LIMITS.displayName),
    profilePublic: doc.profilePublic,
    currentStreak: doc.currentStreak,
    workoutsThisWeek: doc.workoutsThisWeek,
    lastWorkoutDateKey: doc.lastWorkoutDateKey,
    activityByDay: pruneActivityByDay(doc.activityByDay),
    updatedAt: Timestamp.fromDate(doc.updatedAt),
  };
}

export function firestoreToPublicProfileDoc(
  data: Record<string, unknown>,
): PublicProfileDoc | null {
  const displayName =
    typeof data.displayName === "string" ? data.displayName.trim() : "";
  if (!displayName) return null;
  if (typeof data.profilePublic !== "boolean") return null;
  const updatedAt = asTimestamp(data.updatedAt);
  if (!updatedAt) return null;

  return {
    displayName: displayName.slice(0, PUBLIC_PROFILE_LIMITS.displayName),
    profilePublic: data.profilePublic,
    currentStreak: asNonNegInt(data.currentStreak),
    workoutsThisWeek: asNonNegInt(data.workoutsThisWeek),
    lastWorkoutDateKey: asDateKey(data.lastWorkoutDateKey),
    activityByDay: asActivityByDay(data.activityByDay),
    updatedAt,
  };
}

/**
 * Denormalized week count is relative to the week of the last workout.
 * If that week is not the current local week, treat as 0.
 */
export function effectiveWorkoutsThisWeek(
  profile: Pick<PublicProfileDoc, "workoutsThisWeek" | "lastWorkoutDateKey">,
  todayKey: string,
): number {
  if (!profile.lastWorkoutDateKey) return 0;
  if (
    weekStartMondayKey(profile.lastWorkoutDateKey) !==
    weekStartMondayKey(todayKey)
  ) {
    return 0;
  }
  return profile.workoutsThisWeek;
}

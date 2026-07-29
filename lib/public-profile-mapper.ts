import { Timestamp } from "firebase/firestore";
import {
  PUBLIC_PROFILE_LIMITS,
  type PublicActivityByDay,
  type PublicProfileDoc,
} from "@/lib/public-profile-types";
import { weekStartMondayKey } from "@/lib/progress-insights";
import {
  shiftLocalDateKey,
  type WorkoutActivityByDay,
} from "@/lib/workout-activity";
import { localDateKeyFromMs } from "@/lib/workout-date";

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

export function activityMapToRecord(
  activity: WorkoutActivityByDay,
): PublicActivityByDay {
  const out: PublicActivityByDay = {};
  for (const [key, count] of activity) {
    if (count > 0 && /^\d{4}-\d{2}-\d{2}$/.test(key)) {
      out[key] = Math.max(0, Math.round(count));
    }
  }
  return pruneActivityByDay(out);
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

/** Keep only days within the last ~26 weeks (chart window). */
export function pruneActivityByDay(
  record: PublicActivityByDay,
  todayKey: string = localDateKeyFromMs(Date.now()),
): PublicActivityByDay {
  const cutoff = shiftLocalDateKey(todayKey, -(26 * 7));
  const entries = Object.entries(record)
    .filter(([key, count]) => count > 0 && key >= cutoff && key <= todayKey)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));

  if (entries.length > PUBLIC_PROFILE_LIMITS.activityByDayEntries) {
    entries.splice(0, entries.length - PUBLIC_PROFILE_LIMITS.activityByDayEntries);
  }

  const out: PublicActivityByDay = {};
  for (const [key, count] of entries) {
    out[key] = count;
  }
  return out;
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

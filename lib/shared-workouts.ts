/**
 * Opt-in workout sharing with a group: what a member chose to show
 * groupmates, kept at `groups/{groupId}/sharedWorkouts/{uid}`.
 *
 * One doc per member holding this week's and last week's workouts and
 * activities (the same window as `trainedDays`). It's rebuilt from source on
 * every workout sync, so edits and deletes heal themselves, and it's deleted
 * when the member stops sharing or leaves.
 *
 * Exercises and logged sets only. Workout notes, exercise notes and set notes
 * never leave the member's own data, and neither does body weight.
 *
 * Pure and SDK-agnostic: the client (lib/group-repository.ts) and the Admin
 * SDK (lib/workout-signals-admin.ts) both feed it raw session data. Times are
 * stored as epoch ms so neither SDK's Timestamp type leaks in.
 */
import { startOfWeekDateKey } from "@/lib/calendar-views";
import type { ExerciseMetric } from "@/lib/exercise-catalog";
import { shiftLocalDateKey } from "@/lib/workout-activity";
import { localDateKeyFromMs } from "@/lib/workout-date";

export const SHARED_WORKOUT_LIMITS = {
  /** Workouts + activities across the two weeks. */
  workouts: 21,
  exercises: 30,
  setsPerExercise: 20,
  title: 80,
  exerciseName: 80,
} as const;

/** A logged set, minus its note and checkbox state. Weights are lb. */
export type SharedSet = {
  weight: number | null;
  reps: number | null;
  durationSec: number | null;
  timedSetSec: number | null;
  paceMph: number | null;
  inclinePercent: number | null;
  resistanceLevel: number | null;
  distanceMiles: number | null;
};

export type SharedExercise = {
  name: string;
  metric: ExerciseMetric;
  sets: SharedSet[];
};

export type SharedWorkout = {
  /** Session id, or `activity-{id}` for a logged activity. */
  id: string;
  kind: "workout" | "activity";
  /** Local day `YYYY-MM-DD`. */
  dateKey: string;
  /** "Push day", "Run". */
  title: string;
  durationMin: number | null;
  /** Activities only (a run's distance). Workout cardio lives on its sets. */
  distanceMiles: number | null;
  /** Empty for activities. */
  exercises: SharedExercise[];
  /** For ordering within a day. */
  atMs: number;
};

export type SharedWorkoutsDoc = {
  uid: string;
  /** Newest first. */
  workouts: SharedWorkout[];
  updatedAtMs: number;
};

/** A completed session as either SDK reads it. `lines` is the raw stored array. */
export type SharedWorkoutSessionInput = {
  id: string;
  status: string;
  title: string;
  workoutDate: string | null;
  startedAt: Date;
  endedAt: Date | null;
  activeDurationSec: number | null;
  lines: unknown;
};

export type SharedWorkoutActivityInput = {
  id: string;
  activityDate: string;
  /** Activity name ("Run"). */
  label: string;
  durationMin: number | null;
  distanceMiles: number | null;
  at: Date;
};

const METRICS: readonly ExerciseMetric[] = [
  "weight_reps",
  "bodyweight_reps",
  "duration",
  "cardio",
];

const SET_FIELDS = [
  "weight",
  "reps",
  "durationSec",
  "timedSetSec",
  "paceMph",
  "inclinePercent",
  "resistanceLevel",
  "distanceMiles",
] as const satisfies readonly (keyof SharedSet)[];

function num(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : null;
}

function shortText(v: unknown, max: number): string {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

function isDateKey(v: unknown): v is string {
  return typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);
}

/** First day shared: last week's Sunday. */
export function sharedWindowStart(todayKey: string): string {
  return shiftLocalDateKey(startOfWeekDateKey(todayKey), -7);
}

/** Numbers only; anything else (notes, `done`, unknown keys) is dropped. */
function toSharedSet(raw: unknown): SharedSet | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const set = Object.fromEntries(
    SET_FIELDS.map((k) => [k, num(r[k])]),
  ) as SharedSet;
  const hasValues = SET_FIELDS.some((k) => set[k] !== null);
  return hasValues ? set : null;
}

/**
 * Logged sets only: a set unchecked in the active workout (`done: false`)
 * wasn't performed. Sets without `done` (older or MCP-written) count when
 * they have values, matching `isSetLogDone`.
 */
function toSharedExercise(
  raw: unknown,
  fromStorage: boolean,
): SharedExercise | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const name = shortText(
    fromStorage ? r.name : r.nameSnapshot,
    SHARED_WORKOUT_LIMITS.exerciseName,
  );
  const metric = METRICS.includes(r.metric as ExerciseMetric)
    ? (r.metric as ExerciseMetric)
    : "weight_reps";
  if (!name || !Array.isArray(r.sets)) return null;
  const sets: SharedSet[] = [];
  for (const s of r.sets) {
    if (
      !fromStorage &&
      s &&
      typeof s === "object" &&
      (s as { done?: unknown }).done === false
    ) {
      continue;
    }
    const set = toSharedSet(s);
    if (set) sets.push(set);
    if (sets.length >= SHARED_WORKOUT_LIMITS.setsPerExercise) break;
  }
  return sets.length > 0 ? { name, metric, sets } : null;
}

function toSharedExercises(
  lines: unknown,
  fromStorage: boolean,
): SharedExercise[] {
  if (!Array.isArray(lines)) return [];
  const out: SharedExercise[] = [];
  for (const line of lines) {
    const ex = toSharedExercise(line, fromStorage);
    if (ex) out.push(ex);
    if (out.length >= SHARED_WORKOUT_LIMITS.exercises) break;
  }
  return out;
}

function newestFirst(a: SharedWorkout, b: SharedWorkout): number {
  return b.dateKey.localeCompare(a.dateKey) || b.atMs - a.atMs;
}

/** Completed sessions + activities → what the group sees, for this week and last. */
export function buildSharedWorkouts(
  sessions: SharedWorkoutSessionInput[],
  activities: SharedWorkoutActivityInput[],
  todayKey: string = localDateKeyFromMs(Date.now()),
): SharedWorkout[] {
  const from = sharedWindowStart(todayKey);
  const inWindow = (key: string) => key >= from && key <= todayKey;
  const out: SharedWorkout[] = [];

  for (const s of sessions) {
    if (s.status !== "completed") continue;
    const at = s.endedAt ?? s.startedAt;
    const dateKey = s.workoutDate ?? localDateKeyFromMs(at.getTime());
    if (!inWindow(dateKey)) continue;
    const sec = num(s.activeDurationSec);
    out.push({
      id: s.id,
      kind: "workout",
      dateKey,
      title: shortText(s.title, SHARED_WORKOUT_LIMITS.title) || "Workout",
      durationMin: sec !== null && sec >= 60 ? Math.round(sec / 60) : null,
      distanceMiles: null,
      exercises: toSharedExercises(s.lines, false),
      atMs: at.getTime(),
    });
  }

  for (const a of activities) {
    if (!inWindow(a.activityDate)) continue;
    out.push({
      id: `activity-${a.id}`,
      kind: "activity",
      dateKey: a.activityDate,
      title: shortText(a.label, SHARED_WORKOUT_LIMITS.title) || "Activity",
      durationMin: num(a.durationMin),
      distanceMiles: num(a.distanceMiles),
      exercises: [],
      atMs: a.at.getTime(),
    });
  }

  return out.sort(newestFirst).slice(0, SHARED_WORKOUT_LIMITS.workouts);
}

export function sharedWorkoutsDocToFirestore(
  doc: SharedWorkoutsDoc,
): Record<string, unknown> {
  return {
    uid: doc.uid,
    workouts: doc.workouts.map((w) => ({
      ...w,
      exercises: w.exercises.map((e) => ({ ...e })),
    })),
    updatedAtMs: doc.updatedAtMs,
  };
}

/** Defensive read: anything malformed is dropped rather than shown. */
export function firestoreToSharedWorkoutsDoc(
  data: Record<string, unknown>,
): SharedWorkoutsDoc | null {
  const uid = typeof data.uid === "string" ? data.uid : "";
  if (!uid) return null;
  const workouts: SharedWorkout[] = [];
  for (const raw of Array.isArray(data.workouts) ? data.workouts : []) {
    if (!raw || typeof raw !== "object") continue;
    const r = raw as Record<string, unknown>;
    if (typeof r.id !== "string" || !isDateKey(r.dateKey)) continue;
    workouts.push({
      id: r.id,
      kind: r.kind === "activity" ? "activity" : "workout",
      dateKey: r.dateKey,
      title: shortText(r.title, SHARED_WORKOUT_LIMITS.title) || "Workout",
      durationMin: num(r.durationMin),
      distanceMiles: num(r.distanceMiles),
      exercises: toSharedExercises(r.exercises, true),
      atMs: num(r.atMs) ?? 0,
    });
  }
  return {
    uid,
    workouts: workouts
      .sort(newestFirst)
      .slice(0, SHARED_WORKOUT_LIMITS.workouts),
    updatedAtMs: num(data.updatedAtMs) ?? 0,
  };
}

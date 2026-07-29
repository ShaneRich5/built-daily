import { Timestamp } from "firebase/firestore";
import type { CatalogExercise, ExerciseMetric } from "@/lib/exercise-catalog";
import {
  normalizeWorkoutDate,
  normalizeWorkoutTime,
  resolveWorkoutTitle,
} from "@/lib/workout-date";
import {
  NOTE_LIMITS,
  type SessionLine,
  type SetLog,
  type WorkoutSessionDoc,
  type WorkoutSessionStatus,
} from "@/lib/workout-types";

/** UI set row shape (matches active workout component). */
export type UiSetRow = {
  weight: string;
  reps: string;
  seconds: string;
  timedSetSec: string;
  paceMph: string;
  inclinePercent: string;
  resistanceLevel: string;
  distanceMiles: string;
  note: string;
};

/** Snapshot passed from the active workout screen on finish or autosave. */
export type ActiveWorkoutFinishSnapshot = {
  title: string;
  /** Journal day `YYYY-MM-DD`, or empty when unset. */
  workoutDate: string;
  /** Local `HH:mm`, or empty when unset. */
  workoutTime: string;
  exercises: CatalogExercise[];
  setsByExercise: UiSetRow[][];
  workoutNote: string;
  exerciseNotesByExerciseId: Record<string, string>;
  /** Milliseconds shown on the session timer (0 if never started). */
  activeDurationMs: number;
  /** `Date.now()` when the session screen mounted / original start. */
  sessionStartedAtMs: number;
  planId?: string | null;
  /** Stable line ids parallel to `exercises` (required for updates). */
  lineIds: string[];
};

function trimToNull(s: string, max: number): string | null {
  const t = s.trim().slice(0, max);
  return t.length > 0 ? t : null;
}

function parseNumberLoose(raw: string): number | null {
  const t = raw.trim();
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

function parseIntLoose(raw: string): number | null {
  const t = raw.trim();
  if (!t) return null;
  const n = parseInt(t, 10);
  return Number.isFinite(n) ? n : null;
}

function emptyCardioFields(): Pick<
  SetLog,
  "paceMph" | "inclinePercent" | "resistanceLevel" | "distanceMiles"
> {
  return {
    paceMph: null,
    inclinePercent: null,
    resistanceLevel: null,
    distanceMiles: null,
  };
}

export function uiSetRowToSetLog(row: UiSetRow, metric: ExerciseMetric): SetLog {
  const note = trimToNull(row.note, NOTE_LIMITS.setNote);
  const timedSetSec = parseIntLoose(row.timedSetSec);

  switch (metric) {
    case "weight_reps":
      return {
        weight: parseNumberLoose(row.weight),
        reps: parseIntLoose(row.reps),
        durationSec: null,
        timedSetSec,
        ...emptyCardioFields(),
        note,
      };
    case "bodyweight_reps":
      return {
        weight: null,
        reps: parseIntLoose(row.reps),
        durationSec: null,
        timedSetSec,
        ...emptyCardioFields(),
        note,
      };
    case "duration":
      return {
        weight: null,
        reps: null,
        durationSec: parseIntLoose(row.seconds),
        timedSetSec,
        ...emptyCardioFields(),
        note,
      };
    case "cardio":
      return {
        weight: null,
        reps: null,
        durationSec: parseIntLoose(row.seconds),
        timedSetSec: null,
        paceMph: parseNumberLoose(row.paceMph),
        inclinePercent: parseNumberLoose(row.inclinePercent),
        resistanceLevel: parseNumberLoose(row.resistanceLevel),
        distanceMiles: parseNumberLoose(row.distanceMiles),
        note,
      };
    default: {
      const _exhaustive: never = metric;
      return _exhaustive;
    }
  }
}

function newLineId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `line-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function createLineId(): string {
  return newLineId();
}

/** Convert a persisted set back into active-workout UI fields. */
export function setLogToUiSetRow(set: SetLog): UiSetRow {
  return {
    weight: set.weight != null ? String(set.weight) : "",
    reps: set.reps != null ? String(set.reps) : "",
    seconds: set.durationSec != null ? String(set.durationSec) : "",
    timedSetSec: set.timedSetSec != null ? String(set.timedSetSec) : "",
    paceMph: set.paceMph != null ? String(set.paceMph) : "",
    inclinePercent: set.inclinePercent != null ? String(set.inclinePercent) : "",
    resistanceLevel:
      set.resistanceLevel != null ? String(set.resistanceLevel) : "",
    distanceMiles: set.distanceMiles != null ? String(set.distanceMiles) : "",
    note: set.note ?? "",
  };
}

export function buildWorkoutSessionDoc(
  snap: ActiveWorkoutFinishSnapshot,
  options?: {
    status?: WorkoutSessionStatus;
    endedAt?: Date | null;
  },
): WorkoutSessionDoc {
  const status = options?.status ?? "completed";
  const endedAt =
    options?.endedAt !== undefined
      ? options.endedAt
      : status === "completed"
        ? new Date()
        : null;
  const startedAt = new Date(snap.sessionStartedAtMs);

  const lineIds = snap.lineIds;
  const lines: SessionLine[] = snap.exercises.map((ex, i) => {
    const lineId = lineIds[i] && lineIds[i]!.length > 0 ? lineIds[i]! : newLineId();
    const rows = snap.setsByExercise[i] ?? [];
    const sets = rows.map((row) => uiSetRowToSetLog(row, ex.metric));
    return {
      lineId,
      exerciseId: ex.id,
      nameSnapshot: ex.name,
      metric: ex.metric,
      sets,
    };
  });

  const exerciseNotesByLineId: Record<string, string> = {};
  for (const line of lines) {
    const raw = snap.exerciseNotesByExerciseId[line.exerciseId];
    const n = trimToNull(raw ?? "", NOTE_LIMITS.exerciseNote);
    if (n) exerciseNotesByLineId[line.lineId] = n;
  }

  const setCount = lines.reduce((acc, l) => acc + l.sets.length, 0);
  const previewExerciseNames = lines.slice(0, 3).map((l) => l.nameSnapshot);

  const activeDurationSec =
    snap.activeDurationMs > 0
      ? Math.max(0, Math.round(snap.activeDurationMs / 1000))
      : null;

  const dateMs = endedAt?.getTime() ?? startedAt.getTime();
  const workoutDate = normalizeWorkoutDate(snap.workoutDate);
  const workoutTime = normalizeWorkoutTime(snap.workoutTime);

  return {
    status,
    title: resolveWorkoutTitle(snap.title, workoutDate, dateMs),
    planId: snap.planId ?? null,
    workoutDate,
    workoutTime,
    startedAt,
    endedAt,
    activeDurationSec,
    workoutNote: trimToNull(snap.workoutNote, NOTE_LIMITS.workoutNote),
    exerciseNotesByLineId:
      Object.keys(exerciseNotesByLineId).length > 0
        ? exerciseNotesByLineId
        : null,
    lines,
    exerciseCount: lines.length,
    setCount,
    previewExerciseNames,
  };
}

/** Firestore-serializable object (Timestamps, plain objects). */
export function sessionDocToFirestore(
  doc: WorkoutSessionDoc,
): Record<string, unknown> {
  return {
    status: doc.status,
    title: doc.title,
    planId: doc.planId,
    workoutDate: doc.workoutDate,
    workoutTime: doc.workoutTime,
    startedAt: Timestamp.fromDate(doc.startedAt),
    endedAt: doc.endedAt ? Timestamp.fromDate(doc.endedAt) : null,
    activeDurationSec: doc.activeDurationSec,
    workoutNote: doc.workoutNote,
    exerciseNotesByLineId: doc.exerciseNotesByLineId,
    lines: doc.lines.map((line) => ({
      lineId: line.lineId,
      exerciseId: line.exerciseId,
      nameSnapshot: line.nameSnapshot,
      metric: line.metric,
      sets: line.sets.map((s) => ({
        weight: s.weight,
        reps: s.reps,
        durationSec: s.durationSec,
        timedSetSec: s.timedSetSec,
        paceMph: s.paceMph,
        inclinePercent: s.inclinePercent,
        resistanceLevel: s.resistanceLevel,
        distanceMiles: s.distanceMiles,
        note: s.note,
      })),
    })),
    exerciseCount: doc.exerciseCount,
    setCount: doc.setCount,
    previewExerciseNames: doc.previewExerciseNames,
  };
}

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

function asMetric(v: unknown): ExerciseMetric | null {
  if (
    v === "weight_reps" ||
    v === "bodyweight_reps" ||
    v === "duration" ||
    v === "cardio"
  ) {
    return v;
  }
  return null;
}

function asStatus(v: unknown): WorkoutSessionStatus | null {
  if (v === "in_progress" || v === "completed" || v === "discarded") return v;
  return null;
}

function asNullableNumber(v: unknown): number | null {
  if (v == null) return null;
  if (typeof v === "number" && Number.isFinite(v)) return v;
  return null;
}

function parseSetLog(raw: unknown): SetLog | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const note =
    o.note == null
      ? null
      : typeof o.note === "string"
        ? o.note.slice(0, NOTE_LIMITS.setNote)
        : null;
  return {
    weight: asNullableNumber(o.weight),
    reps: asNullableNumber(o.reps),
    durationSec: asNullableNumber(o.durationSec),
    timedSetSec: asNullableNumber(o.timedSetSec),
    paceMph: asNullableNumber(o.paceMph),
    inclinePercent: asNullableNumber(o.inclinePercent),
    resistanceLevel: asNullableNumber(o.resistanceLevel),
    distanceMiles: asNullableNumber(o.distanceMiles),
    note: note && note.trim().length > 0 ? note : null,
  };
}

function parseSessionLine(raw: unknown): SessionLine | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const lineId = typeof o.lineId === "string" ? o.lineId : "";
  const exerciseId = typeof o.exerciseId === "string" ? o.exerciseId : "";
  const nameSnapshot =
    typeof o.nameSnapshot === "string" ? o.nameSnapshot.slice(0, 200) : "";
  const metric = asMetric(o.metric);
  if (!lineId || !exerciseId || !nameSnapshot || !metric) return null;
  if (!Array.isArray(o.sets)) return null;
  const sets: SetLog[] = [];
  for (const item of o.sets) {
    const set = parseSetLog(item);
    if (set) sets.push(set);
  }
  return { lineId, exerciseId, nameSnapshot, metric, sets };
}

function parseExerciseNotesMap(
  raw: unknown,
): Record<string, string> | null {
  if (raw == null) return null;
  if (!raw || typeof raw !== "object") return null;
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof v === "string" && v.trim()) {
      out[k] = v.slice(0, NOTE_LIMITS.exerciseNote);
    }
  }
  return Object.keys(out).length > 0 ? out : null;
}

/** Parse a Firestore session document into `WorkoutSessionDoc`, or null if invalid. */
export function firestoreToWorkoutSessionDoc(
  data: Record<string, unknown>,
): WorkoutSessionDoc | null {
  const status = asStatus(data.status);
  const title =
    typeof data.title === "string"
      ? data.title.trim().slice(0, NOTE_LIMITS.title)
      : "";
  const workoutDateRaw = data.workoutDate;
  const workoutDate =
    workoutDateRaw == null || workoutDateRaw === ""
      ? null
      : typeof workoutDateRaw === "string" &&
          workoutDateRaw.length === 10 &&
          /^\d{4}-\d{2}-\d{2}$/.test(workoutDateRaw)
        ? workoutDateRaw
        : null;
  const workoutTimeRaw = data.workoutTime;
  const workoutTime =
    workoutTimeRaw == null || workoutTimeRaw === ""
      ? null
      : typeof workoutTimeRaw === "string" &&
          /^([01]\d|2[0-3]):[0-5]\d$/.test(workoutTimeRaw)
        ? workoutTimeRaw
        : null;
  const startedAt = asTimestamp(data.startedAt);
  const endedAtRaw = data.endedAt;
  const endedAt =
    endedAtRaw == null ? null : asTimestamp(endedAtRaw);
  if (!status || !title || !startedAt) return null;
  if (status === "completed" && !endedAt) return null;
  if (status === "in_progress" && endedAt != null) {
    /* tolerate legacy docs that still have endedAt */
  }
  if (data.planId != null && typeof data.planId !== "string") return null;
  if (!Array.isArray(data.lines)) return null;

  const lines: SessionLine[] = [];
  for (const item of data.lines) {
    const line = parseSessionLine(item);
    if (line) lines.push(line);
  }
  // Empty completed sessions are valid ("logged without details").
  // Reject only when lines existed but none could be parsed.
  if (data.lines.length > 0 && lines.length === 0) return null;

  const exerciseCount =
    typeof data.exerciseCount === "number"
      ? data.exerciseCount
      : lines.length;
  const setCount =
    typeof data.setCount === "number"
      ? data.setCount
      : lines.reduce((acc, l) => acc + l.sets.length, 0);

  const previewRaw = data.previewExerciseNames;
  const previewExerciseNames = Array.isArray(previewRaw)
    ? previewRaw
        .filter((x): x is string => typeof x === "string")
        .slice(0, 5)
    : lines.slice(0, 3).map((l) => l.nameSnapshot);

  const workoutNote =
    data.workoutNote == null
      ? null
      : typeof data.workoutNote === "string"
        ? data.workoutNote.trim().slice(0, NOTE_LIMITS.workoutNote) || null
        : null;

  const activeDurationSec =
    data.activeDurationSec == null
      ? null
      : typeof data.activeDurationSec === "number" &&
          Number.isFinite(data.activeDurationSec)
        ? data.activeDurationSec
        : null;

  return {
    status,
    title,
    planId:
      data.planId == null || data.planId === ""
        ? null
        : (data.planId as string),
    workoutDate,
    workoutTime,
    startedAt,
    endedAt: status === "in_progress" ? null : endedAt,
    activeDurationSec,
    workoutNote,
    exerciseNotesByLineId: parseExerciseNotesMap(data.exerciseNotesByLineId),
    lines,
    exerciseCount,
    setCount,
    previewExerciseNames,
  };
}

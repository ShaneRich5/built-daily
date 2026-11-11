import type { CatalogExercise, ExerciseMetric } from "@/lib/exercise-catalog";
import {
  combineToTotalSeconds,
  splitTotalSeconds,
} from "@/lib/duration-input";
import type { LineSection } from "@/lib/line-grouping";
import { formatSetSummary } from "@/lib/workout-journal-export";
import {
  emptyUiSetRow,
  setLogToUiSetRow,
  uiSetRowToSetLog,
  type UiSetRow,
} from "@/lib/workout-session-mapper";
import type { SetLog } from "@/lib/workout-types";

/** One set as the session screen edits it (string inputs + done flag). */
export type SetRow = UiSetRow;

/** One exercise in the live session, with its sets and note kept together. */
export type SessionExercise = {
  lineId: string;
  exercise: CatalogExercise;
  sets: SetRow[];
  note: string;
  /** "plan" = doing it today; "maybe" = only if there's time. */
  section: LineSection;
  /** Other exercises that fill this slot (whichever machine is free). */
  alternates: CatalogExercise[];
};

export type ExerciseProgress = "not_started" | "in_progress" | "done";

export const MAX_SESSION_EXERCISES = 40;

export const NOTE_MAX = {
  workout: 500,
  exercise: 400,
  set: 200,
} as const;

export const emptySetRow = emptyUiSetRow;

/** The fields that hold a measurement (not the note, timer, or done flag). */
const MEASUREMENT_KEYS = [
  "weight",
  "reps",
  "seconds",
  "paceMph",
  "inclinePercent",
  "resistanceLevel",
  "distanceMiles",
] as const satisfies ReadonlyArray<keyof SetRow>;

export function setRowHasMeasurements(row: SetRow): boolean {
  return MEASUREMENT_KEYS.some((key) => row[key].trim() !== "");
}

/** Nothing typed at all — safe to remove without asking. */
export function setRowIsBlank(row: SetRow): boolean {
  return (
    !setRowHasMeasurements(row) &&
    !row.timedSetSec.trim() &&
    !row.note.trim()
  );
}

/** Copy the measurements into a fresh, not-done set. */
export function copySetRow(row: SetRow): SetRow {
  const copy = emptySetRow();
  for (const key of MEASUREMENT_KEYS) copy[key] = row[key];
  return copy;
}

/** Fill any empty measurement with the suggested value (what the user sees greyed out). */
export function fillFromSuggestion(row: SetRow, suggestion: SetRow | null): SetRow {
  if (!suggestion) return row;
  const next = { ...row };
  for (const key of MEASUREMENT_KEYS) {
    if (!next[key].trim() && suggestion[key].trim()) {
      next[key] = suggestion[key];
    }
  }
  return next;
}

/** Turn past sets into rows for "Use these" (not done, no timer, no note). */
export function rowsFromHistory(sets: SetLog[]): SetRow[] {
  return sets.map((set) => ({
    ...setLogToUiSetRow(set),
    timedSetSec: "",
    note: "",
    done: false,
  }));
}

/**
 * What to show greyed out in an empty set: the previous set in this session,
 * otherwise the same set from last time.
 */
export function suggestionForSet(
  sets: SetRow[],
  setIndex: number,
  lastTimeSets: SetLog[] | undefined,
): SetRow | null {
  for (let i = setIndex - 1; i >= 0; i--) {
    const previous = sets[i];
    if (previous && setRowHasMeasurements(previous)) return previous;
  }
  const fromHistory =
    lastTimeSets?.[setIndex] ?? lastTimeSets?.[lastTimeSets.length - 1];
  return fromHistory ? setLogToUiSetRow(fromHistory) : null;
}

export function exerciseProgress(sets: SetRow[]): ExerciseProgress {
  const doneCount = sets.filter((set) => set.done).length;
  if (sets.length > 0 && doneCount === sets.length) return "done";
  if (doneCount > 0 || sets.some(setRowHasMeasurements)) return "in_progress";
  return "not_started";
}

/** A maybe nobody touched never counts: not in the header, not in the saved workout. */
export function isUntouchedMaybe(item: SessionExercise): boolean {
  return item.section === "maybe" && exerciseProgress(item.sets) === "not_started";
}

export function countDoneSets(exercises: SessionExercise[]): number {
  return exercises.reduce(
    (total, item) => total + item.sets.filter((set) => set.done).length,
    0,
  );
}

/** "3 sets · 30 lb × 12" when every set matches, otherwise each set in order. */
export function summarizeSetLogs(sets: SetLog[]): string {
  const parts = sets.map(formatSetSummary).filter((part) => part !== "");
  if (parts.length === 0) return "";
  const allSame = parts.every((part) => part === parts[0]);
  if (allSame) {
    return parts.length === 1 ? parts[0]! : `${parts.length} sets · ${parts[0]}`;
  }
  return parts.join(", ");
}

export function summarizeSetRows(sets: SetRow[], metric: ExerciseMetric): string {
  return summarizeSetLogs(
    sets
      .filter(setRowHasMeasurements)
      .map((row) => uiSetRowToSetLog(row, metric)),
  );
}

export function metricLabel(metric: ExerciseMetric): string {
  switch (metric) {
    case "weight_reps":
      return "Reps + weight";
    case "bodyweight_reps":
      return "Reps";
    case "duration":
      return "Hold time";
    case "cardio":
      return "Cardio";
  }
}

/** One editable number in a set row. Minutes/seconds both map onto `seconds`. */
export type SetFieldSpec = {
  id: string;
  /** Column header, e.g. "lb". */
  label: string;
  /** Screen-reader label, e.g. "Weight for set 2". */
  ariaLabel: (setNumber: number) => string;
  inputMode: "decimal" | "numeric";
  read: (row: SetRow) => string;
  write: (row: SetRow, value: string) => Partial<SetRow>;
};

const weightField: SetFieldSpec = {
  id: "weight",
  label: "lb",
  ariaLabel: (n) => `Weight for set ${n}`,
  inputMode: "decimal",
  read: (row) => row.weight,
  write: (_row, value) => ({ weight: value }),
};

const repsField: SetFieldSpec = {
  id: "reps",
  label: "Reps",
  ariaLabel: (n) => `Reps for set ${n}`,
  inputMode: "numeric",
  read: (row) => row.reps,
  write: (_row, value) => ({ reps: value }),
};

const minutesField: SetFieldSpec = {
  id: "minutes",
  label: "Min",
  ariaLabel: (n) => `Minutes for set ${n}`,
  inputMode: "numeric",
  read: (row) => splitTotalSeconds(row.seconds).minutes,
  write: (row, value) => ({
    seconds: combineToTotalSeconds(value, splitTotalSeconds(row.seconds).seconds),
  }),
};

const secondsField: SetFieldSpec = {
  id: "seconds",
  label: "Sec",
  ariaLabel: (n) => `Seconds for set ${n}`,
  inputMode: "numeric",
  read: (row) => splitTotalSeconds(row.seconds).seconds,
  write: (row, value) => {
    const n = parseInt(value, 10);
    const clamped = value === "" || !Number.isFinite(n) ? "" : String(Math.min(59, Math.max(0, n)));
    return {
      seconds: combineToTotalSeconds(splitTotalSeconds(row.seconds).minutes, clamped),
    };
  },
};

const distanceField: SetFieldSpec = {
  id: "distance",
  label: "Mi",
  ariaLabel: (n) => `Distance in miles for set ${n}`,
  inputMode: "decimal",
  read: (row) => row.distanceMiles,
  write: (_row, value) => ({ distanceMiles: value }),
};

const paceField: SetFieldSpec = {
  id: "pace",
  label: "mph",
  ariaLabel: (n) => `Pace in mph for set ${n}`,
  inputMode: "decimal",
  read: (row) => row.paceMph,
  write: (_row, value) => ({ paceMph: value }),
};

const inclineField: SetFieldSpec = {
  id: "incline",
  label: "Incline %",
  ariaLabel: (n) => `Incline percent for set ${n}`,
  inputMode: "decimal",
  read: (row) => row.inclinePercent,
  write: (_row, value) => ({ inclinePercent: value }),
};

const resistanceField: SetFieldSpec = {
  id: "resistance",
  label: "Level",
  ariaLabel: (n) => `Resistance level for set ${n}`,
  inputMode: "decimal",
  read: (row) => row.resistanceLevel,
  write: (_row, value) => ({ resistanceLevel: value }),
};

/** Fields shown inline on the quick card. */
export function quickFieldsForMetric(metric: ExerciseMetric): SetFieldSpec[] {
  switch (metric) {
    case "weight_reps":
      return [weightField, repsField];
    case "bodyweight_reps":
      return [repsField];
    case "duration":
      return [minutesField, secondsField];
    case "cardio":
      return [minutesField, secondsField, distanceField];
  }
}

/** Extra fields that only appear on the details screen. */
export function extraFieldsForMetric(metric: ExerciseMetric): SetFieldSpec[] {
  return metric === "cardio" ? [paceField, inclineField, resistanceField] : [];
}

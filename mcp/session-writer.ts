import { randomUUID } from "node:crypto";
import { getCatalogExerciseById } from "@/lib/exercise-catalog";
import {
  NOTE_LIMITS,
  type SessionLine,
  type SetLog,
} from "@/lib/workout-types";

/** Per-set fields an MCP caller can supply (already numeric — no UI string parsing). */
export type McpSetInput = {
  weight?: number;
  reps?: number;
  durationSec?: number;
  distanceMiles?: number;
  paceMph?: number;
  inclinePercent?: number;
  resistanceLevel?: number;
  note?: string;
};

/** One exercise line an MCP caller can supply. */
export type McpExerciseInput = {
  exerciseId: string;
  note?: string;
  sets: McpSetInput[];
};

function trimToNull(raw: string | undefined, max: number): string | null {
  if (!raw) return null;
  const t = raw.trim().slice(0, max);
  return t.length > 0 ? t : null;
}

function num(v: number | undefined): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

/** Zero out fields that don't apply to this exercise's metric — mirrors uiSetRowToSetLog. */
function setInputToSetLog(
  input: McpSetInput,
  metric: SessionLine["metric"],
): SetLog {
  const note = trimToNull(input.note, NOTE_LIMITS.setNote);
  switch (metric) {
    case "weight_reps":
      return {
        weight: num(input.weight),
        reps: num(input.reps),
        durationSec: null,
        timedSetSec: null,
        paceMph: null,
        inclinePercent: null,
        resistanceLevel: null,
        distanceMiles: null,
        note,
      };
    case "bodyweight_reps":
      return {
        weight: null,
        reps: num(input.reps),
        durationSec: null,
        timedSetSec: null,
        paceMph: null,
        inclinePercent: null,
        resistanceLevel: null,
        distanceMiles: null,
        note,
      };
    case "duration":
      return {
        weight: null,
        reps: null,
        durationSec: num(input.durationSec),
        timedSetSec: null,
        paceMph: null,
        inclinePercent: null,
        resistanceLevel: null,
        distanceMiles: null,
        note,
      };
    case "cardio":
      return {
        weight: null,
        reps: null,
        durationSec: num(input.durationSec),
        timedSetSec: null,
        paceMph: num(input.paceMph),
        inclinePercent: num(input.inclinePercent),
        resistanceLevel: num(input.resistanceLevel),
        distanceMiles: num(input.distanceMiles),
        note,
      };
    default: {
      const _exhaustive: never = metric;
      return _exhaustive;
    }
  }
}

export type BuildSessionLinesResult = {
  lines: SessionLine[];
  exerciseNotesByLineId: Record<string, string> | null;
  /** exerciseIds that don't exist in the catalog — build stops (returns no lines) if any. */
  unknownExerciseIds: string[];
};

/** Resolve MCP exercise input into Firestore-ready session lines. */
export function buildSessionLines(
  exercises: McpExerciseInput[],
): BuildSessionLinesResult {
  const unknownExerciseIds: string[] = [];
  for (const ex of exercises) {
    if (!getCatalogExerciseById(ex.exerciseId)) {
      unknownExerciseIds.push(ex.exerciseId);
    }
  }
  if (unknownExerciseIds.length > 0) {
    return { lines: [], exerciseNotesByLineId: null, unknownExerciseIds };
  }

  const lines: SessionLine[] = [];
  const exerciseNotesByLineId: Record<string, string> = {};
  for (const ex of exercises) {
    const catalog = getCatalogExerciseById(ex.exerciseId)!;
    const lineId = randomUUID();
    const sets = ex.sets.map((s) => setInputToSetLog(s, catalog.metric));
    lines.push({
      lineId,
      exerciseId: catalog.id,
      nameSnapshot: catalog.name,
      metric: catalog.metric,
      sets,
    });
    const note = trimToNull(ex.note, NOTE_LIMITS.exerciseNote);
    if (note) exerciseNotesByLineId[lineId] = note;
  }

  return {
    lines,
    exerciseNotesByLineId:
      Object.keys(exerciseNotesByLineId).length > 0
        ? exerciseNotesByLineId
        : null,
    unknownExerciseIds: [],
  };
}

/** Recompute denormalized counts — mirrors normalizeSessionForWrite. */
export function deriveSessionCounts(lines: SessionLine[]): {
  exerciseCount: number;
  setCount: number;
  previewExerciseNames: string[];
} {
  return {
    exerciseCount: lines.length,
    setCount: lines.reduce((acc, l) => acc + l.sets.length, 0),
    previewExerciseNames: lines.slice(0, 3).map((l) => l.nameSnapshot),
  };
}

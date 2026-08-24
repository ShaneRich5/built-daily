"use client";

import Link from "next/link";
import {
  ArrowDown,
  ArrowUp,
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  CopyPlus,
  Download,
  List,
  MoreHorizontal,
  Pause,
  Play,
  Rows3,
  RotateCcw,
  Replace,
  Timer,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { WorkoutAddExerciseCard } from "@/components/workout-add-exercise-card";
import { ExerciseHistoryControls } from "@/components/exercise-history-controls";
import { WorkoutMetaFields } from "@/components/workout-meta-fields";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  catalogExerciseFromCustomName,
  getCatalogExerciseById,
  type CatalogExercise,
  type ExerciseMetric,
} from "@/lib/exercise-catalog";
import {
  buildWorkoutSessionDoc,
  createLineId,
  setLogToUiSetRow,
  uiSetRowToSetLog,
  type ActiveWorkoutFinishSnapshot,
} from "@/lib/workout-session-mapper";
import {
  getExerciseHistories,
  type ExerciseHistoryById,
} from "@/lib/workout-session-repository";
import {
  formatSetSummary,
  formatWorkoutJournalEntry,
  workoutJournalFilename,
} from "@/lib/workout-journal-export";
import type { SetLog } from "@/lib/workout-types";
import {
  combineToTotalSeconds,
  splitTotalSeconds,
} from "@/lib/duration-input";
import {
  localDateKeyFromMs,
  formatSessionVolumeMeta,
} from "@/lib/workout-date";

/** One row of logged fields; only fields relevant to `metric` are shown. */
type SetRow = {
  weight: string;
  reps: string;
  seconds: string;
  /** Filled by set stopwatch for weight / bodyweight (optional). Whole seconds. */
  timedSetSec: string;
  paceMph: string;
  inclinePercent: string;
  resistanceLevel: string;
  distanceMiles: string;
  /** Optional free text for this set (form cues, RPE, how it felt). */
  note: string;
};

function emptySetRow(): SetRow {
  return {
    weight: "",
    reps: "",
    seconds: "",
    timedSetSec: "",
    paceMph: "",
    inclinePercent: "",
    resistanceLevel: "",
    distanceMiles: "",
    note: "",
  };
}

/** Copy measurable fields into a new set; leave timer + note blank. */
function duplicateSetRow(row: SetRow): SetRow {
  return {
    weight: row.weight,
    reps: row.reps,
    seconds: row.seconds,
    timedSetSec: "",
    paceMph: row.paceMph,
    inclinePercent: row.inclinePercent,
    resistanceLevel: row.resistanceLevel,
    distanceMiles: row.distanceMiles,
    note: "",
  };
}

function historySetToRow(set: SetLog): SetRow {
  const row = setLogToUiSetRow(set);
  return {
    ...row,
    timedSetSec: "",
    note: "",
  };
}

function setRowHasValues(row: SetRow): boolean {
  return Boolean(
    row.weight.trim() ||
      row.reps.trim() ||
      row.seconds.trim() ||
      row.timedSetSec.trim() ||
      row.paceMph.trim() ||
      row.inclinePercent.trim() ||
      row.resistanceLevel.trim() ||
      row.distanceMiles.trim() ||
      row.note.trim(),
  );
}

/** Compact one-line summary of logged sets for collapsed exercise cards. */
function summarizeExerciseSets(
  sets: SetRow[],
  metric: ExerciseMetric,
): string {
  const filled = sets.filter(setRowHasValues);
  if (filled.length === 0) {
    return sets.length === 0
      ? "No sets yet"
      : `${sets.length} empty set${sets.length === 1 ? "" : "s"}`;
  }

  const summaries = filled.map((row) =>
    formatSetSummary(uiSetRowToSetLog(row, metric)),
  );
  const allSame = summaries.every((s) => s === summaries[0]);
  if (allSame) {
    return `${filled.length} set${filled.length === 1 ? "" : "s"} · ${summaries[0]}`;
  }
  return summaries.map((s, i) => `${i + 1}. ${s}`).join(" · ");
}

function formatElapsed(ms: number) {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }
  return `${m}:${s.toString().padStart(2, "0")}`;
}

async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through */
  }
  try {
    const el = document.createElement("textarea");
    el.value = text;
    el.setAttribute("readonly", "");
    el.style.position = "fixed";
    el.style.left = "-9999px";
    document.body.appendChild(el);
    el.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(el);
    return ok;
  } catch {
    return false;
  }
}

function downloadTextFile(filename: string, text: string) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function metricHint(metric: ExerciseMetric): string {
  switch (metric) {
    case "weight_reps":
      return "Weight + reps";
    case "bodyweight_reps":
      return "Reps only";
    case "duration":
      return "Hold time";
    case "cardio":
      return "Time · pace · incline · resistance";
  }
}

type ActiveWorkoutViewProps = {
  title: string;
  exercises: CatalogExercise[];
  planId?: string | null;
  /** Stable line ids parallel to `exercises` when resuming. */
  initialLineIds?: string[];
  initialSetsByExercise?: SetRow[][];
  initialWorkoutNote?: string;
  initialExerciseNotesById?: Record<string, string>;
  /** Journal date `YYYY-MM-DD`; defaults to today when omitted. */
  initialWorkoutDate?: string | null;
  /** Local `HH:mm`; empty when omitted. */
  initialWorkoutTime?: string | null;
  /** When false, start with empty title (shows default placeholder). */
  titleIsCustom?: boolean;
  /** Prior session timer value when resuming (ms). */
  initialActiveDurationMs?: number;
  /** Original session start time. */
  sessionStartedAtMs?: number;
  /** Debounced while editing; also used before finish. */
  onPersist?: (snapshot: ActiveWorkoutFinishSnapshot) => void | Promise<void>;
  onFinish?: (snapshot: ActiveWorkoutFinishSnapshot) => void | Promise<void>;
  /** Discard / delete this session (signed-in in-progress workouts). */
  onDiscard?: () => void | Promise<void>;
};

const MAX_SESSION_EXERCISES = 40;
const LS_EXERCISE_DENSITY = "built-daily-active-workout-exercise-density";

type ExerciseListDensity = "comfortable" | "compact";

function readStoredExerciseDensity(): ExerciseListDensity {
  if (typeof window === "undefined") return "comfortable";
  const v = window.localStorage.getItem(LS_EXERCISE_DENSITY);
  if (v === "compact" || v === "comfortable") return v;
  return "comfortable";
}

type SetTimerActive = {
  exerciseIndex: number;
  setIndex: number;
  startedAt: number;
};

export function ActiveWorkoutView({
  title: titleProp,
  exercises,
  planId: planIdProp = null,
  initialLineIds,
  initialSetsByExercise,
  initialWorkoutNote = "",
  initialExerciseNotesById,
  initialWorkoutDate,
  initialWorkoutTime,
  titleIsCustom = true,
  initialActiveDurationMs = 0,
  sessionStartedAtMs: sessionStartedAtMsProp,
  onPersist,
  onFinish,
  onDiscard,
}: ActiveWorkoutViewProps) {
  const [sessionStartedAtMs] = useState(
    () => sessionStartedAtMsProp ?? Date.now(),
  );

  const [title, setTitle] = useState(() =>
    titleIsCustom ? titleProp : "",
  );
  const [workoutDate, setWorkoutDate] = useState(
    () =>
      initialWorkoutDate === null
        ? ""
        : (initialWorkoutDate ?? localDateKeyFromMs(sessionStartedAtMsProp ?? Date.now())),
  );
  const [workoutTime, setWorkoutTime] = useState(
    () => initialWorkoutTime ?? "",
  );

  const [activeExercises, setActiveExercises] =
    useState<CatalogExercise[]>(exercises);

  const [lineIds, setLineIds] = useState<string[]>(() =>
    initialLineIds && initialLineIds.length === exercises.length
      ? initialLineIds
      : exercises.map(() => createLineId()),
  );

  const [setsByExercise, setSetsByExercise] = useState<SetRow[][]>(() =>
    initialSetsByExercise &&
    initialSetsByExercise.length === exercises.length
      ? initialSetsByExercise
      : exercises.map(() => [emptySetRow()]),
  );
  const [expandedExerciseIndex, setExpandedExerciseIndex] = useState<
    number | null
  >(() => (exercises.length > 0 ? 0 : null));
  /** When set, that exercise card shows a replacement picker. */
  const [replacingExerciseIndex, setReplacingExerciseIndex] = useState<
    number | null
  >(null);
  const [flashLineId, setFlashLineId] = useState<string | null>(null);
  const [exerciseDensity, setExerciseDensity] =
    useState<ExerciseListDensity>("comfortable");
  const [densityPrefsReady, setDensityPrefsReady] = useState(false);
  const exerciseHistoryKey = activeExercises
    .map((exercise) => `${exercise.id}:${exercise.metric}:${exercise.name}`)
    .join("|");
  const [historyResult, setHistoryResult] = useState<{
    key: string;
    history: ExerciseHistoryById;
  }>({ key: "", history: {} });
  const exerciseHistory =
    historyResult.key === exerciseHistoryKey ? historyResult.history : {};
  const historyLoading = historyResult.key !== exerciseHistoryKey;
  const compact = exerciseDensity === "compact";

  useEffect(() => {
    setExerciseDensity(readStoredExerciseDensity());
    setDensityPrefsReady(true);
  }, []);

  useEffect(() => {
    if (!densityPrefsReady) return;
    window.localStorage.setItem(LS_EXERCISE_DENSITY, exerciseDensity);
  }, [exerciseDensity, densityPrefsReady]);

  useEffect(() => {
    if (!flashLineId) return;
    const el = document.getElementById(`exercise-card-${flashLineId}`);
    el?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    const timeoutId = window.setTimeout(() => {
      setFlashLineId(null);
    }, 1600);
    return () => window.clearTimeout(timeoutId);
  }, [flashLineId]);

  useEffect(() => {
    let cancelled = false;
    void getExerciseHistories(activeExercises)
      .then((history) => {
        if (!cancelled) {
          setHistoryResult({ key: exerciseHistoryKey, history });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setHistoryResult({ key: exerciseHistoryKey, history: {} });
        }
      });
    return () => {
      cancelled = true;
    };
    // The stable string prevents refetches when unrelated workout state changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exerciseHistoryKey]);

  const handleAddCatalogExercise = useCallback((exerciseId: string) => {
    const ex = getCatalogExerciseById(exerciseId);
    if (!ex) return;
    let addedLineId: string | null = null;
    setActiveExercises((prev) => {
      if (prev.length >= MAX_SESSION_EXERCISES) return prev;
      const newLineId = createLineId();
      addedLineId = newLineId;
      setLineIds((idsPrev) => {
        if (idsPrev.length >= MAX_SESSION_EXERCISES) return idsPrev;
        return [newLineId, ...idsPrev];
      });
      setSetsByExercise((setsPrev) => {
        if (setsPrev.length >= MAX_SESSION_EXERCISES) return setsPrev;
        return [[emptySetRow()], ...setsPrev];
      });
      setExpandedExerciseIndex(0);
      // Newest first — keeps the new exercise near the add control.
      return [ex, ...prev];
    });
    if (addedLineId) setFlashLineId(addedLineId);
  }, []);

  const handleAddCustomExercise = useCallback((trimmed: string): boolean => {
    const ex = catalogExerciseFromCustomName(trimmed);
    if (!ex) return false;
    let didAdd = false;
    let addedLineId: string | null = null;
    setActiveExercises((prev) => {
      if (prev.length >= MAX_SESSION_EXERCISES) return prev;
      didAdd = true;
      const newLineId = createLineId();
      addedLineId = newLineId;
      setLineIds((idsPrev) => {
        if (idsPrev.length >= MAX_SESSION_EXERCISES) return idsPrev;
        return [newLineId, ...idsPrev];
      });
      setSetsByExercise((setsPrev) => {
        if (setsPrev.length >= MAX_SESSION_EXERCISES) return setsPrev;
        return [[emptySetRow()], ...setsPrev];
      });
      setExpandedExerciseIndex(0);
      return [ex, ...prev];
    });
    if (addedLineId) setFlashLineId(addedLineId);
    return didAdd;
  }, []);

  const [workoutNote, setWorkoutNote] = useState(initialWorkoutNote);
  const [exerciseNotesById, setExerciseNotesById] = useState<
    Record<string, string>
  >(() => initialExerciseNotesById ?? {});

  const updateExerciseNote = useCallback((exerciseId: string, value: string) => {
    setExerciseNotesById((prev) => ({ ...prev, [exerciseId]: value }));
  }, []);

  /** `idle` = timer not started; `running` = counting; `paused` = stopped mid-session */
  const [timerPhase, setTimerPhase] = useState<"idle" | "running" | "paused">(
    () => (initialActiveDurationMs > 0 ? "paused" : "idle"),
  );
  const [accumulatedMs, setAccumulatedMs] = useState(initialActiveDurationMs);
  const [segmentStart, setSegmentStart] = useState<number | null>(null);
  const [displayedMs, setDisplayedMs] = useState(initialActiveDurationMs);

  useEffect(() => {
    if (timerPhase !== "running" || segmentStart === null) return;

    const tick = () => {
      setDisplayedMs(accumulatedMs + (Date.now() - segmentStart));
    };

    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [timerPhase, segmentStart, accumulatedMs]);

  const startOrResumeTimer = useCallback(() => {
    setSegmentStart(Date.now());
    setTimerPhase("running");
  }, []);

  const pauseTimer = useCallback(() => {
    if (segmentStart === null) return;
    const nextAccumulated = accumulatedMs + (Date.now() - segmentStart);
    setAccumulatedMs(nextAccumulated);
    setDisplayedMs(nextAccumulated);
    setSegmentStart(null);
    setTimerPhase("paused");
  }, [accumulatedMs, segmentStart]);

  const resetTimer = useCallback(() => {
    setAccumulatedMs(0);
    setDisplayedMs(0);
    setSegmentStart(null);
    setTimerPhase("idle");
  }, []);

  /** Separate per-set stopwatch (at most one active). */
  const [setTimerActive, setSetTimerActive] = useState<SetTimerActive | null>(
    null,
  );
  const [setTimerLiveMs, setSetTimerLiveMs] = useState(0);

  useEffect(() => {
    if (setTimerActive === null) return;
    const { startedAt } = setTimerActive;
    const tick = () => {
      setSetTimerLiveMs(Date.now() - startedAt);
    };
    tick();
    const id = window.setInterval(tick, 250);
    return () => window.clearInterval(id);
  }, [setTimerActive]);

  const startSetTimer = useCallback(
    (exerciseIndex: number, setIndex: number) => {
      setSetTimerLiveMs(0);
      setSetTimerActive({
        exerciseIndex,
        setIndex,
        startedAt: Date.now(),
      });
    },
    [],
  );

  const cancelSetTimer = useCallback(() => {
    setSetTimerActive(null);
    setSetTimerLiveMs(0);
  }, []);

  const setCountLabel = useMemo(
    () =>
      setsByExercise.reduce((acc, sets) => acc + sets.length, 0).toString(),
    [setsByExercise],
  );

  const updateSet = useCallback(
    (
      exerciseIndex: number,
      setIndex: number,
      field: keyof SetRow,
      value: string,
    ) => {
      setSetsByExercise((prev) => {
        const next = prev.map((sets) => sets.map((s) => ({ ...s })));
        const row = next[exerciseIndex]?.[setIndex];
        if (!row) return prev;
        row[field] = value;
        return next;
      });
    },
    [],
  );

  const saveSetTimer = useCallback(() => {
    if (setTimerActive === null) return;
    const { exerciseIndex, setIndex, startedAt } = setTimerActive;
    const sec = Math.max(1, Math.round((Date.now() - startedAt) / 1000));
    const metric = activeExercises[exerciseIndex]?.metric;
    if (metric === "duration" || metric === "cardio") {
      updateSet(exerciseIndex, setIndex, "seconds", String(sec));
    } else {
      updateSet(exerciseIndex, setIndex, "timedSetSec", String(sec));
    }
    setSetTimerActive(null);
    setSetTimerLiveMs(0);
  }, [activeExercises, setTimerActive, updateSet]);

  const addSet = useCallback((exerciseIndex: number) => {
    setSetsByExercise((prev) => {
      const next = prev.map((sets) => [...sets]);
      const sets = next[exerciseIndex];
      if (!sets) return prev;
      sets.push(emptySetRow());
      return next;
    });
  }, []);

  const duplicateSet = useCallback(
    (exerciseIndex: number, setIndex: number) => {
      setSetsByExercise((prev) => {
        const next = prev.map((sets) => [...sets]);
        const sets = next[exerciseIndex];
        const source = sets?.[setIndex];
        if (!sets || !source) return prev;
        sets.splice(setIndex + 1, 0, duplicateSetRow(source));
        return next;
      });
      setSetTimerActive((active) => {
        if (!active || active.exerciseIndex !== exerciseIndex) return active;
        if (active.setIndex > setIndex) {
          return { ...active, setIndex: active.setIndex + 1 };
        }
        return active;
      });
    },
    [],
  );

  const removeSet = useCallback(
    (exerciseIndex: number, setIndex: number) => {
      const sets = setsByExercise[exerciseIndex];
      if (!sets || sets.length <= 1) return;
      const target = sets[setIndex];
      if (!target) return;
      if (setRowHasValues(target)) {
        const exerciseName =
          activeExercises[exerciseIndex]?.name ?? "this exercise";
        if (
          !window.confirm(
            `Remove set ${setIndex + 1} from ${exerciseName}?`,
          )
        ) {
          return;
        }
      }
      setSetsByExercise((prev) => {
        const current = prev[exerciseIndex];
        if (!current || current.length <= 1) return prev;
        const next = prev.map((row) => [...row]);
        next[exerciseIndex] = current.filter((_, i) => i !== setIndex);
        return next;
      });
      setSetTimerActive((active) => {
        if (!active || active.exerciseIndex !== exerciseIndex) return active;
        if (active.setIndex === setIndex) return null;
        if (active.setIndex > setIndex) {
          return { ...active, setIndex: active.setIndex - 1 };
        }
        return active;
      });
    },
    [activeExercises, setsByExercise],
  );

  const applyHistoricalSets = useCallback(
    (
      exerciseIndex: number,
      historicalSets: SetLog[],
      mode: "replace" | "append",
    ) => {
      const copied = historicalSets.map(historySetToRow);
      if (copied.length === 0) return;

      setSetsByExercise((prev) => {
        const next = prev.map((sets) => [...sets]);
        const current = next[exerciseIndex];
        if (!current) return prev;

        if (mode === "replace") {
          next[exerciseIndex] = copied;
        } else {
          const hasValues = current.some(setRowHasValues);
          next[exerciseIndex] = hasValues ? [...current, ...copied] : copied;
        }
        return next;
      });
      setSetTimerActive((active) =>
        active?.exerciseIndex === exerciseIndex ? null : active,
      );
      setSetTimerLiveMs(0);
      setExpandedExerciseIndex(exerciseIndex);
    },
    [],
  );

  const moveExercise = useCallback((index: number, delta: -1 | 1) => {
    setActiveExercises((prev) => {
      const j = index + delta;
      if (j < 0 || j >= prev.length) return prev;

      const swap = <T,>(arr: T[]): T[] => {
        const next = [...arr];
        const tmp = next[index]!;
        next[index] = next[j]!;
        next[j] = tmp;
        return next;
      };

      setLineIds((ids) => (ids.length === prev.length ? swap(ids) : ids));
      setSetsByExercise((sets) =>
        sets.length === prev.length ? swap(sets) : sets,
      );
      setExpandedExerciseIndex((expanded) => {
        if (expanded === null) return null;
        if (expanded === index) return j;
        if (expanded === j) return index;
        return expanded;
      });
      setSetTimerActive((active) => {
        if (!active) return null;
        if (active.exerciseIndex === index) {
          return { ...active, exerciseIndex: j };
        }
        if (active.exerciseIndex === j) {
          return { ...active, exerciseIndex: index };
        }
        return active;
      });
      return swap(prev);
    });
  }, []);

  const removeExercise = useCallback(
    (exerciseIndex: number) => {
      const removed = activeExercises[exerciseIndex];
      if (!removed) return;
      if (
        !window.confirm(
          `Remove “${removed.name}” and all of its sets from this workout?`,
        )
      ) {
        return;
      }
      setReplacingExerciseIndex(null);
      setActiveExercises((prev) => prev.filter((_, i) => i !== exerciseIndex));
      setLineIds((ids) => ids.filter((_, i) => i !== exerciseIndex));
      setSetsByExercise((sets) => sets.filter((_, i) => i !== exerciseIndex));
      setExerciseNotesById((notes) => {
        const next = { ...notes };
        delete next[removed.id];
        return next;
      });
      setSetTimerActive((active) => {
        if (!active) return null;
        if (active.exerciseIndex === exerciseIndex) return null;
        if (active.exerciseIndex > exerciseIndex) {
          return { ...active, exerciseIndex: active.exerciseIndex - 1 };
        }
        return active;
      });
      setExpandedExerciseIndex((prev) => {
        if (prev === null) return null;
        if (prev === exerciseIndex) {
          const nextLen = activeExercises.length - 1;
          if (nextLen <= 0) return null;
          return Math.min(exerciseIndex, nextLen - 1);
        }
        if (prev > exerciseIndex) return prev - 1;
        return prev;
      });
    },
    [activeExercises],
  );

  const changeExercise = useCallback(
    (exerciseIndex: number, next: CatalogExercise) => {
      const current = activeExercises[exerciseIndex];
      if (!current) return;
      if (current.id === next.id) {
        setReplacingExerciseIndex(null);
        return;
      }

      const metricChanged = current.metric !== next.metric;
      const sets = setsByExercise[exerciseIndex] ?? [];
      const hasSetValues = sets.some(setRowHasValues);
      if (
        metricChanged &&
        hasSetValues &&
        !window.confirm(
          `“${next.name}” tracks differently than “${current.name}”. Clear the sets you already logged for this slot?`,
        )
      ) {
        return;
      }

      setActiveExercises((prev) => {
        if (!prev[exerciseIndex]) return prev;
        const copy = [...prev];
        copy[exerciseIndex] = next;
        return copy;
      });

      if (metricChanged) {
        setSetsByExercise((prev) => {
          if (!prev[exerciseIndex]) return prev;
          const copy = [...prev];
          copy[exerciseIndex] = [emptySetRow()];
          return copy;
        });
        setSetTimerActive((active) =>
          active?.exerciseIndex === exerciseIndex ? null : active,
        );
      }

      setExerciseNotesById((notes) => {
        const existing = notes[current.id];
        if (existing === undefined && notes[next.id] === undefined) {
          return notes;
        }
        const copy = { ...notes };
        if (existing !== undefined) {
          copy[next.id] = existing;
          delete copy[current.id];
        }
        return copy;
      });

      setReplacingExerciseIndex(null);
      const lineId = lineIds[exerciseIndex];
      if (lineId) setFlashLineId(lineId);
    },
    [activeExercises, lineIds, setsByExercise],
  );

  const handleChangeToCatalog = useCallback(
    (exerciseIndex: number, exerciseId: string) => {
      const ex = getCatalogExerciseById(exerciseId);
      if (!ex) return;
      changeExercise(exerciseIndex, ex);
    },
    [changeExercise],
  );

  const handleChangeToCustom = useCallback(
    (exerciseIndex: number, trimmed: string): boolean => {
      const ex = catalogExerciseFromCustomName(trimmed);
      if (!ex) return false;
      changeExercise(exerciseIndex, ex);
      return true;
    },
    [changeExercise],
  );

  const handleDiscard = useCallback(async () => {
    if (!onDiscard) return;
    if (
      !window.confirm(
        "Delete this workout permanently? Progress will be removed and cannot be undone.",
      )
    ) {
      return;
    }
    await onDiscard();
  }, [onDiscard]);

  const buildSnapshot = useCallback((): ActiveWorkoutFinishSnapshot => {
    return {
      title,
      workoutDate,
      workoutTime,
      exercises: activeExercises,
      setsByExercise,
      workoutNote,
      exerciseNotesByExerciseId: exerciseNotesById,
      activeDurationMs: displayedMs,
      sessionStartedAtMs,
      planId: planIdProp,
      lineIds,
    };
  }, [
    title,
    workoutDate,
    workoutTime,
    activeExercises,
    setsByExercise,
    workoutNote,
    exerciseNotesById,
    displayedMs,
    sessionStartedAtMs,
    planIdProp,
    lineIds,
  ]);

  const displayedMsRef = useRef(displayedMs);
  useEffect(() => {
    displayedMsRef.current = displayedMs;
  }, [displayedMs]);

  useEffect(() => {
    if (!onPersist) return;
    const id = window.setTimeout(() => {
      void onPersist({
        title,
        workoutDate,
        workoutTime,
        exercises: activeExercises,
        setsByExercise,
        workoutNote,
        exerciseNotesByExerciseId: exerciseNotesById,
        activeDurationMs: displayedMsRef.current,
        sessionStartedAtMs,
        planId: planIdProp,
        lineIds,
      });
    }, 1200);
    return () => window.clearTimeout(id);
  }, [
    onPersist,
    title,
    workoutDate,
    workoutTime,
    activeExercises,
    setsByExercise,
    workoutNote,
    exerciseNotesById,
    sessionStartedAtMs,
    planIdProp,
    lineIds,
  ]);

  const handleFinish = useCallback(async () => {
    if (!onFinish) return;
    await onFinish(buildSnapshot());
  }, [onFinish, buildSnapshot]);

  const journalPreviewDoc = useMemo(
    () =>
      buildWorkoutSessionDoc(buildSnapshot(), {
        status: "in_progress",
        endedAt: null,
      }),
    [buildSnapshot],
  );
  const journalText = useMemo(
    () => formatWorkoutJournalEntry(journalPreviewDoc),
    [journalPreviewDoc],
  );
  const [copied, setCopied] = useState(false);

  const handleCopyJournal = useCallback(async () => {
    const ok = await copyText(journalText);
    if (ok) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    }
  }, [journalText]);

  const handleDownloadJournal = useCallback(() => {
    downloadTextFile(workoutJournalFilename(journalPreviewDoc), journalText);
  }, [journalPreviewDoc, journalText]);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <header className="flex shrink-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 dark:border-amber-900/60 dark:bg-amber-950/40">
            <span
              className="relative flex size-2 shrink-0"
              aria-hidden
            >
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-amber-400 opacity-60" />
              <span className="relative inline-flex size-2 rounded-full bg-amber-500" />
            </span>
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-800 dark:text-amber-300">
              In progress
            </p>
          </div>
          <p className="mt-2 text-xs text-zinc-500">
            {formatSessionVolumeMeta(
              activeExercises.length,
              Number(setCountLabel),
              "in_progress",
            )}
          </p>
          <details className="mt-2 group">
            <summary className="cursor-pointer list-none text-xs text-zinc-400 marker:content-none hover:text-zinc-600 dark:hover:text-zinc-300 [&::-webkit-details-marker]:hidden">
              <span className="inline-flex items-center gap-1.5">
                <Timer className="size-3.5 shrink-0 opacity-70" aria-hidden />
                {displayedMs > 0 || timerPhase === "running" ? (
                  <>
                    Session time{" "}
                    <span
                      className="font-mono tabular-nums text-zinc-500"
                      aria-live="polite"
                      aria-atomic="true"
                    >
                      {formatElapsed(displayedMs)}
                    </span>
                    {timerPhase === "paused" ? (
                      <span className="sr-only">paused</span>
                    ) : null}
                  </>
                ) : (
                  "Optional session timer"
                )}
              </span>
            </summary>
            <div
              className="mt-2 inline-flex items-center gap-1"
              role="group"
              aria-label="Workout session timer"
            >
              {timerPhase === "idle" && (
                <button
                  type="button"
                  onClick={startOrResumeTimer}
                  aria-label="Start workout timer"
                  className="inline-flex h-8 items-center gap-1.5 rounded-md px-2 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  <Play className="size-3.5" />
                  Start
                </button>
              )}
              {timerPhase === "running" && (
                <button
                  type="button"
                  onClick={pauseTimer}
                  aria-label="Pause workout timer"
                  className="inline-flex h-8 items-center gap-1.5 rounded-md px-2 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  <Pause className="size-3.5" />
                  Pause
                </button>
              )}
              {timerPhase === "paused" && (
                <button
                  type="button"
                  onClick={startOrResumeTimer}
                  aria-label="Resume workout timer"
                  className="inline-flex h-8 items-center gap-1.5 rounded-md px-2 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  <Play className="size-3.5" />
                  Resume
                </button>
              )}
              <button
                type="button"
                onClick={resetTimer}
                disabled={timerPhase === "idle" && displayedMs === 0}
                aria-label="Reset workout timer"
                className="inline-flex h-8 items-center gap-1.5 rounded-md px-2 text-xs font-medium text-zinc-500 transition-colors hover:bg-zinc-100 disabled:pointer-events-none disabled:opacity-30 dark:hover:bg-zinc-800"
              >
                <RotateCcw className="size-3.5" />
                Reset
              </button>
            </div>
          </details>
        </div>
        <Link
          href="/"
          className="shrink-0 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
        >
          Home
        </Link>
      </header>

      <section className="shrink-0 space-y-2 rounded-xl border border-zinc-200 bg-white px-3 py-2 dark:border-zinc-800 dark:bg-zinc-950">
        <WorkoutMetaFields
          title={title}
          workoutDate={workoutDate}
          workoutTime={workoutTime}
          onTitleChange={setTitle}
          onWorkoutDateChange={setWorkoutDate}
          onWorkoutTimeChange={setWorkoutTime}
          titleFallbackMs={sessionStartedAtMs}
          collapsible
        />
        <CollapsibleNote
          id="workout-session-note"
          summary="Workout note"
          value={workoutNote}
          onChange={setWorkoutNote}
          maxLength={500}
          placeholder="How you felt, sleep, context for this session…"
        />
      </section>

      <WorkoutAddExerciseCard
        currentCount={activeExercises.length}
        maxExercises={MAX_SESSION_EXERCISES}
        onAddCatalog={handleAddCatalogExercise}
        onAddCustom={handleAddCustomExercise}
        collapsible
      />

      <div className="flex shrink-0 items-center justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
          Exercises
        </p>
        <div
          className="inline-flex rounded-lg border border-zinc-200 bg-white p-0.5 dark:border-zinc-700 dark:bg-zinc-950"
          role="group"
          aria-label="Exercise list density"
        >
          <button
            type="button"
            onClick={() => setExerciseDensity("comfortable")}
            aria-pressed={exerciseDensity === "comfortable"}
            className={`inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition-colors ${
              exerciseDensity === "comfortable"
                ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50"
                : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
            }`}
          >
            <List className="size-3.5" aria-hidden />
            Comfortable
          </button>
          <button
            type="button"
            onClick={() => setExerciseDensity("compact")}
            aria-pressed={exerciseDensity === "compact"}
            className={`inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition-colors ${
              exerciseDensity === "compact"
                ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50"
                : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
            }`}
          >
            <Rows3 className="size-3.5" aria-hidden />
            Compact
          </button>
        </div>
      </div>

      <ul
        className={`flex min-h-0 flex-1 flex-col overflow-y-auto ${
          compact ? "gap-1.5" : "gap-3"
        } ${onDiscard ? "pb-40" : "pb-36"}`}
      >
        {activeExercises.length === 0 ? (
          <li className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50/80 px-4 py-8 text-center dark:border-zinc-800 dark:bg-zinc-950/40">
            <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
              No exercises yet
            </p>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              Open Add Exercise above to search the catalog or add a custom
              name. You can still finish without details if you just want to
              log that you showed up.
            </p>
          </li>
        ) : null}
        {activeExercises.map((exercise, exerciseIndex) => {
          const sets = setsByExercise[exerciseIndex] ?? [];
          const lineId = lineIds[exerciseIndex] ?? `${exerciseIndex}-${exercise.id}`;
          const expanded = expandedExerciseIndex === exerciseIndex;
          const summary = summarizeExerciseSets(sets, exercise.metric);
          const flashing = flashLineId === lineId;

          return (
            <li
              key={lineId}
              id={`exercise-card-${lineId}`}
              className={`rounded-xl border transition-[box-shadow,background-color,border-color] duration-500 ${
                flashing
                  ? "border-emerald-400 bg-emerald-50 shadow-[0_0_0_3px_rgba(16,185,129,0.35)] dark:border-emerald-500 dark:bg-emerald-950/40"
                  : "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950"
              }`}
            >
              <div className="flex items-start">
                <button
                  type="button"
                  onClick={() => {
                    if (expanded) {
                      setReplacingExerciseIndex(null);
                      setExpandedExerciseIndex(null);
                    } else {
                      setReplacingExerciseIndex(null);
                      setExpandedExerciseIndex(exerciseIndex);
                    }
                  }}
                  className={`min-w-0 flex-1 text-left ${
                    compact ? "px-2.5 py-2" : "p-3"
                  }`}
                  aria-expanded={expanded}
                >
                  <span className="flex w-full items-start gap-2">
                    <span className="min-w-0 flex-1">
                      <span
                        className={`block font-medium text-zinc-900 dark:text-zinc-50 ${
                          compact ? "text-sm leading-snug" : ""
                        }`}
                      >
                        {exercise.name}
                      </span>
                      <span className="mt-0.5 block text-xs text-zinc-500">
                        {metricHint(exercise.metric)}
                        {!compact && exerciseNotesById[exercise.id]?.trim()
                          ? " · has note"
                          : ""}
                      </span>
                      {!expanded ? (
                        <span
                          className={`block text-zinc-600 dark:text-zinc-300 ${
                            compact
                              ? "mt-0.5 line-clamp-1 text-xs"
                              : "mt-1.5 line-clamp-2 text-sm"
                          }`}
                        >
                          {summary}
                          {compact && exerciseNotesById[exercise.id]?.trim()
                            ? " · note"
                            : ""}
                        </span>
                      ) : null}
                    </span>
                    <span
                      className={`inline-flex shrink-0 items-center justify-center rounded-full text-zinc-500 ${
                        compact ? "mt-0 size-7" : "mt-0.5 size-8"
                      }`}
                    >
                      {expanded ? (
                        <ChevronUp className="size-4" aria-hidden />
                      ) : (
                        <ChevronDown className="size-4" aria-hidden />
                      )}
                      <span className="sr-only">
                        {expanded ? "Collapse" : "Expand"} {exercise.name}
                      </span>
                    </span>
                  </span>
                </button>
                <div
                  className={`flex shrink-0 flex-col gap-0.5 pr-1.5 ${
                    compact ? "pt-1.5" : "pt-2.5"
                  }`}
                  role="group"
                  aria-label={`Reorder ${exercise.name}`}
                >
                  <button
                    type="button"
                    onClick={() => moveExercise(exerciseIndex, -1)}
                    disabled={exerciseIndex === 0}
                    className="inline-flex size-8 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 disabled:pointer-events-none disabled:opacity-30 dark:hover:bg-zinc-900 dark:hover:text-zinc-200"
                    aria-label={`Move ${exercise.name} up`}
                  >
                    <ArrowUp className="size-3.5" aria-hidden />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveExercise(exerciseIndex, 1)}
                    disabled={exerciseIndex >= activeExercises.length - 1}
                    className="inline-flex size-8 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 disabled:pointer-events-none disabled:opacity-30 dark:hover:bg-zinc-900 dark:hover:text-zinc-200"
                    aria-label={`Move ${exercise.name} down`}
                  >
                    <ArrowDown className="size-3.5" aria-hidden />
                  </button>
                </div>
              </div>

              {expanded ? (
                <div
                  className={`border-t border-zinc-100 dark:border-zinc-800 ${
                    compact
                      ? "space-y-2 px-2.5 pb-2.5 pt-2"
                      : "space-y-3 px-3 pb-3 pt-3"
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap gap-1.5">
                      {replacingExerciseIndex !== exerciseIndex ? (
                        <>
                          <Button
                            type="button"
                            variant="outline"
                            size="xs"
                            onClick={() => addSet(exerciseIndex)}
                          >
                            Add set
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="xs"
                            onClick={() =>
                              setReplacingExerciseIndex(exerciseIndex)
                            }
                            aria-label={`Change ${exercise.name}`}
                          >
                            <Replace className="size-3" aria-hidden />
                            Change
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="xs"
                            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                            onClick={() => removeExercise(exerciseIndex)}
                            aria-label={`Remove ${exercise.name}`}
                          >
                            <Trash2 className="size-3" aria-hidden />
                            Remove
                          </Button>
                        </>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setReplacingExerciseIndex(null);
                        setExpandedExerciseIndex(null);
                      }}
                      className="text-xs font-semibold text-emerald-700 dark:text-emerald-400"
                    >
                      Done
                    </button>
                  </div>

                  {replacingExerciseIndex === exerciseIndex ? (
                    <WorkoutAddExerciseCard
                      embedded
                      currentCount={0}
                      replacingName={exercise.name}
                      onCancelReplace={() => setReplacingExerciseIndex(null)}
                      onAddCatalog={(id) =>
                        handleChangeToCatalog(exerciseIndex, id)
                      }
                      onAddCustom={(name) =>
                        handleChangeToCustom(exerciseIndex, name)
                      }
                    />
                  ) : (
                    <>
                  {!compact ? (
                    <>
                      <CollapsibleNote
                        id={`exercise-note-${exercise.id}`}
                        summary="Exercise note"
                        value={exerciseNotesById[exercise.id] ?? ""}
                        onChange={(v) => updateExerciseNote(exercise.id, v)}
                        maxLength={400}
                        placeholder="Equipment swaps, pain/limitations, cues for this lift…"
                      />
                      <ExerciseHistoryControls
                        exerciseName={exercise.name}
                        entries={exerciseHistory[exercise.id] ?? []}
                        loading={historyLoading}
                        hasCurrentValues={sets.some(setRowHasValues)}
                        onUseSets={(historicalSets, mode) =>
                          applyHistoricalSets(
                            exerciseIndex,
                            historicalSets,
                            mode,
                          )
                        }
                      />
                    </>
                  ) : (
                    <details className="rounded-lg border border-zinc-100 bg-zinc-50/60 px-2 py-1 dark:border-zinc-800 dark:bg-zinc-900/40">
                      <summary className="cursor-pointer list-none text-xs font-medium text-zinc-500 marker:content-none [&::-webkit-details-marker]:hidden">
                        <span className="underline-offset-2 hover:underline">
                          Note & history
                        </span>
                      </summary>
                      <div className="mt-2 space-y-2">
                        <CollapsibleNote
                          id={`exercise-note-${exercise.id}`}
                          summary="Exercise note"
                          value={exerciseNotesById[exercise.id] ?? ""}
                          onChange={(v) => updateExerciseNote(exercise.id, v)}
                          maxLength={400}
                          placeholder="Equipment swaps, pain/limitations, cues for this lift…"
                        />
                        <ExerciseHistoryControls
                          exerciseName={exercise.name}
                          entries={exerciseHistory[exercise.id] ?? []}
                          loading={historyLoading}
                          hasCurrentValues={sets.some(setRowHasValues)}
                          onUseSets={(historicalSets, mode) =>
                            applyHistoricalSets(
                              exerciseIndex,
                              historicalSets,
                              mode,
                            )
                          }
                        />
                      </div>
                    </details>
                  )}
                  <div className={compact ? "space-y-1.5" : "space-y-2"}>
                    {sets.map((set, setIndex) => (
                      <SetRowFields
                        key={`${exerciseIndex}-${exercise.id}-${setIndex}`}
                        exercise={exercise}
                        exerciseIndex={exerciseIndex}
                        setIndex={setIndex}
                        set={set}
                        compact={compact}
                        updateSet={updateSet}
                        onDuplicateSet={duplicateSet}
                        onRemoveSet={removeSet}
                        canRemoveSet={sets.length > 1}
                        setTimerActive={setTimerActive}
                        setTimerLiveMs={setTimerLiveMs}
                        onStartSetTimer={startSetTimer}
                        onSaveSetTimer={saveSetTimer}
                        onCancelSetTimer={cancelSetTimer}
                      />
                    ))}
                  </div>
                    </>
                  )}
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>

      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-zinc-200 bg-zinc-50/95 p-4 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/95">
        <div className="mx-auto w-full max-w-2xl px-4 sm:px-5">
          <p className="mb-2 text-center text-xs text-zinc-500">
            {activeExercises.length === 0
              ? "No exercises yet — you can still finish to log that you showed up."
              : "Progress saves automatically when you’re signed in. You can leave and continue later from Recent workouts."}
          </p>
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-lg"
                    className="size-12 shrink-0 rounded-xl"
                    aria-label="More actions"
                  />
                }
              >
                <MoreHorizontal className="size-5" />
              </DropdownMenuTrigger>
              <DropdownMenuContent
                side="top"
                align="start"
                sideOffset={8}
                className="min-w-52 w-56"
              >
                <DropdownMenuItem
                  className="min-h-10 gap-2"
                  onClick={() => void handleCopyJournal()}
                >
                  {copied ? (
                    <Check className="size-4" />
                  ) : (
                    <Copy className="size-4" />
                  )}
                  {copied ? "Copied" : "Copy journal"}
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="min-h-10 gap-2"
                  onClick={handleDownloadJournal}
                >
                  <Download className="size-4" />
                  Download .txt
                </DropdownMenuItem>
                {onDiscard ? (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      variant="destructive"
                      className="min-h-10 gap-2"
                      onClick={() => void handleDiscard()}
                    >
                      <Trash2 className="size-4" />
                      Delete workout
                    </DropdownMenuItem>
                  </>
                ) : null}
              </DropdownMenuContent>
            </DropdownMenu>

            <button
              type="button"
              onClick={handleFinish}
              className="flex h-12 min-w-0 flex-1 items-center justify-center rounded-xl bg-emerald-600 text-base font-semibold text-white dark:bg-emerald-500"
            >
              {activeExercises.length === 0
                ? "Finish without details"
                : "Finish workout"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

type CollapsibleNoteProps = {
  id: string;
  summary: string;
  value: string;
  onChange: (value: string) => void;
  maxLength?: number;
  placeholder?: string;
  className?: string;
};

function CollapsibleNote({
  id,
  summary,
  value,
  onChange,
  maxLength = 500,
  placeholder = "",
  className = "",
}: CollapsibleNoteProps) {
  const filled = value.trim().length > 0;
  return (
    <details
      className={`rounded-lg border border-zinc-100 bg-zinc-50/60 px-2 py-1.5 dark:border-zinc-800 dark:bg-zinc-900/40 ${className}`}
    >
      <summary className="cursor-pointer list-none text-xs font-medium text-zinc-600 marker:content-none dark:text-zinc-400 [&::-webkit-details-marker]:hidden">
        <span className="underline-offset-2 hover:underline">{summary}</span>
        <span className="ml-1.5 font-normal text-zinc-400">(optional)</span>
        {filled ? (
          <span
            className="ml-1.5 text-[10px] font-normal uppercase tracking-wide text-emerald-700 dark:text-emerald-400"
            aria-hidden
          >
            · has text
          </span>
        ) : null}
      </summary>
      <div className="mt-2">
        <label htmlFor={id} className="sr-only">
          {summary}
        </label>
        <textarea
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value.slice(0, maxLength))}
          placeholder={placeholder}
          rows={2}
          maxLength={maxLength}
          className="w-full resize-y rounded-md border border-zinc-200 bg-white px-2.5 py-2 text-sm text-zinc-900 outline-none ring-zinc-900/10 placeholder:text-zinc-400 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:ring-white/10"
        />
        <p className="mt-1 text-right text-[10px] text-zinc-400">
          {value.length}/{maxLength}
        </p>
      </div>
    </details>
  );
}

type SetRowFieldsProps = {
  exercise: CatalogExercise;
  exerciseIndex: number;
  setIndex: number;
  set: SetRow;
  compact?: boolean;
  setTimerActive: SetTimerActive | null;
  setTimerLiveMs: number;
  onStartSetTimer: (exerciseIndex: number, setIndex: number) => void;
  onSaveSetTimer: () => void;
  onCancelSetTimer: () => void;
  onDuplicateSet: (exerciseIndex: number, setIndex: number) => void;
  onRemoveSet: (exerciseIndex: number, setIndex: number) => void;
  canRemoveSet: boolean;
  updateSet: (
    exerciseIndex: number,
    setIndex: number,
    field: keyof SetRow,
    value: string,
  ) => void;
};

function SetRowFields({
  exercise,
  exerciseIndex,
  setIndex,
  set,
  compact = false,
  setTimerActive,
  setTimerLiveMs,
  onStartSetTimer,
  onSaveSetTimer,
  onCancelSetTimer,
  onDuplicateSet,
  onRemoveSet,
  canRemoveSet,
  updateSet,
}: SetRowFieldsProps) {
  const setNo = setIndex + 1;
  const idBase = `${exercise.id}-${setIndex}`;
  const isEmptySet = !setRowHasValues(set);

  const setHeader = (
    <div className="flex items-center justify-between gap-2">
      <span className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
        Set {setNo}
      </span>
      <div className="flex items-center gap-0.5">
        <button
          type="button"
          onClick={() => onDuplicateSet(exerciseIndex, setIndex)}
          className={`inline-flex items-center gap-1 rounded-md text-xs font-medium text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 dark:hover:bg-zinc-900 dark:hover:text-zinc-200 ${
            compact ? "h-7 px-1.5" : "h-8 px-2"
          }`}
          aria-label={`Duplicate set ${setNo}`}
          title="Duplicate this set’s weight and reps"
        >
          <CopyPlus className="size-3.5" aria-hidden />
          Duplicate
        </button>
        <button
          type="button"
          onClick={() => onRemoveSet(exerciseIndex, setIndex)}
          disabled={!canRemoveSet}
          className={`inline-flex items-center justify-center rounded-md text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 disabled:opacity-30 dark:hover:bg-zinc-900 dark:hover:text-zinc-200 ${
            isEmptySet
              ? compact
                ? "h-7 gap-1 px-1.5 text-xs font-medium"
                : "h-8 gap-1 px-2 text-xs font-medium"
              : compact
                ? "size-7"
                : "size-8"
          }`}
          aria-label={
            isEmptySet ? `Clear empty set ${setNo}` : `Remove set ${setNo}`
          }
          title={isEmptySet ? "Clear this empty set" : "Remove this set"}
        >
          <Trash2 className="size-3.5" aria-hidden />
          {isEmptySet ? "Clear" : null}
        </button>
      </div>
    </div>
  );

  const setTimerThis =
    setTimerActive !== null &&
    setTimerActive.exerciseIndex === exerciseIndex &&
    setTimerActive.setIndex === setIndex;

  const timedHint =
    set.timedSetSec && Number(set.timedSetSec) > 0
      ? `${set.timedSetSec}s`
      : null;

  const setTimerField = (
    <details
      className={`rounded-lg border border-zinc-100 bg-zinc-50/60 px-2 dark:border-zinc-800 dark:bg-zinc-900/40 ${
        compact ? "mt-1 py-1" : "mt-1.5 py-1.5"
      }`}
      open={setTimerThis ? true : undefined}
    >
      <summary className="cursor-pointer list-none text-xs font-medium text-zinc-600 marker:content-none dark:text-zinc-400 [&::-webkit-details-marker]:hidden">
        <span className="underline-offset-2 hover:underline">Set timer</span>
        <span className="ml-1.5 font-normal text-zinc-400">(optional)</span>
        {setTimerThis ? (
          <span
            className="ml-1.5 font-mono text-[10px] font-normal tabular-nums text-zinc-500"
            aria-live="polite"
          >
            · {formatElapsed(setTimerLiveMs)}
          </span>
        ) : timedHint ? (
          <span className="ml-1.5 text-[10px] font-normal uppercase tracking-wide text-zinc-500">
            · {timedHint}
          </span>
        ) : null}
      </summary>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {setTimerThis ? (
          <>
            <span
              className="font-mono text-xs tabular-nums text-zinc-700 dark:text-zinc-200"
              aria-live="polite"
            >
              {formatElapsed(setTimerLiveMs)}
            </span>
            <button
              type="button"
              onClick={onSaveSetTimer}
              className="rounded-md bg-zinc-800 px-2 py-1 text-[11px] font-semibold text-white dark:bg-zinc-200 dark:text-zinc-900"
            >
              Stop &amp; save
            </button>
            <button
              type="button"
              onClick={onCancelSetTimer}
              className="rounded-md px-2 py-1 text-[11px] font-medium text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
            >
              Cancel
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => onStartSetTimer(exerciseIndex, setIndex)}
            disabled={setTimerActive !== null && !setTimerThis}
            className="rounded-md border border-zinc-200 bg-white px-2.5 py-1.5 text-[11px] font-medium text-zinc-700 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-200"
            title={
              setTimerActive !== null && !setTimerThis
                ? "Stop the other set timer first, or save/cancel it"
                : undefined
            }
          >
            Start timer
          </button>
        )}
      </div>
    </details>
  );

  const setNoteField = (
    <CollapsibleNote
      id={`set-note-${idBase}`}
      summary={`Set ${setNo} note`}
      value={set.note}
      onChange={(v) => updateSet(exerciseIndex, setIndex, "note", v)}
      maxLength={200}
      placeholder="One-off detail for this set only…"
      className={compact ? "mt-1" : "mt-1.5"}
    />
  );

  const numberFieldClassName = compact
    ? "h-9 w-full rounded-md border border-zinc-200 bg-zinc-50 px-2.5 font-mono text-sm text-zinc-800 tabular-nums outline-none placeholder:font-sans placeholder:text-zinc-400 [appearance:textfield] dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
    : "h-11 w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 font-mono text-zinc-800 tabular-nums outline-none placeholder:font-sans placeholder:text-zinc-400 [appearance:textfield] dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none";

  const setShellClassName = compact
    ? "space-y-1.5 rounded-md border border-zinc-100 p-1.5 dark:border-zinc-800/80"
    : "space-y-2 rounded-lg border border-zinc-100 p-2 dark:border-zinc-800/80";

  if (exercise.metric === "duration") {
    const parts = splitTotalSeconds(set.seconds);
    const setDuration = (minutes: string, seconds: string) => {
      updateSet(
        exerciseIndex,
        setIndex,
        "seconds",
        combineToTotalSeconds(minutes, seconds),
      );
    };

    return (
      <div className={setShellClassName}>
        {setHeader}
        <div className="grid grid-cols-2 items-end gap-2 text-sm">
          <div>
            <label
              className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-zinc-500"
              htmlFor={`min-${idBase}`}
            >
              Min
            </label>
            <input
              id={`min-${idBase}`}
              type="number"
              inputMode="numeric"
              min={0}
              step={1}
              autoComplete="off"
              value={parts.minutes}
              onChange={(e) => setDuration(e.target.value, parts.seconds)}
              placeholder="0"
              className={numberFieldClassName}
            />
          </div>
          <div>
            <label
              className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-zinc-500"
              htmlFor={`sec-${idBase}`}
            >
              Sec
            </label>
            <input
              id={`sec-${idBase}`}
              type="number"
              inputMode="numeric"
              min={0}
              max={59}
              step={1}
              autoComplete="off"
              value={parts.seconds}
              onChange={(e) => {
                const raw = e.target.value;
                if (raw === "") {
                  setDuration(parts.minutes, "");
                  return;
                }
                const n = parseInt(raw, 10);
                if (!Number.isFinite(n)) return;
                setDuration(parts.minutes, String(Math.min(59, Math.max(0, n))));
              }}
              placeholder="0"
              className={numberFieldClassName}
            />
          </div>
        </div>
        {setTimerField}
        {setNoteField}
      </div>
    );
  }

  if (exercise.metric === "cardio") {
    const parts = splitTotalSeconds(set.seconds);
    const setDuration = (minutes: string, seconds: string) => {
      updateSet(
        exerciseIndex,
        setIndex,
        "seconds",
        combineToTotalSeconds(minutes, seconds),
      );
    };

    return (
      <div className={setShellClassName}>
        {setHeader}
        <div className="grid grid-cols-2 items-end gap-2 text-sm">
          <div>
            <label
              className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-zinc-500"
              htmlFor={`min-${idBase}`}
            >
              Min
            </label>
            <input
              id={`min-${idBase}`}
              type="number"
              inputMode="numeric"
              min={0}
              step={1}
              autoComplete="off"
              value={parts.minutes}
              onChange={(e) => setDuration(e.target.value, parts.seconds)}
              placeholder="0"
              className={numberFieldClassName}
            />
          </div>
          <div>
            <label
              className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-zinc-500"
              htmlFor={`sec-${idBase}`}
            >
              Sec
            </label>
            <input
              id={`sec-${idBase}`}
              type="number"
              inputMode="numeric"
              min={0}
              max={59}
              step={1}
              autoComplete="off"
              value={parts.seconds}
              onChange={(e) => {
                const raw = e.target.value;
                if (raw === "") {
                  setDuration(parts.minutes, "");
                  return;
                }
                const n = parseInt(raw, 10);
                if (!Number.isFinite(n)) return;
                setDuration(
                  parts.minutes,
                  String(Math.min(59, Math.max(0, n))),
                );
              }}
              placeholder="0"
              className={numberFieldClassName}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <label
              className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-zinc-500"
              htmlFor={`pace-${idBase}`}
            >
              Pace (mph)
            </label>
            <input
              id={`pace-${idBase}`}
              type="number"
              inputMode="decimal"
              min={0}
              step="any"
              autoComplete="off"
              value={set.paceMph}
              onChange={(e) =>
                updateSet(exerciseIndex, setIndex, "paceMph", e.target.value)
              }
              placeholder="Optional"
              className={numberFieldClassName}
            />
          </div>
          <div>
            <label
              className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-zinc-500"
              htmlFor={`incline-${idBase}`}
            >
              Incline (%)
            </label>
            <input
              id={`incline-${idBase}`}
              type="number"
              inputMode="decimal"
              min={0}
              step="any"
              autoComplete="off"
              value={set.inclinePercent}
              onChange={(e) =>
                updateSet(
                  exerciseIndex,
                  setIndex,
                  "inclinePercent",
                  e.target.value,
                )
              }
              placeholder="Optional"
              className={numberFieldClassName}
            />
          </div>
          <div>
            <label
              className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-zinc-500"
              htmlFor={`resist-${idBase}`}
            >
              Resistance
            </label>
            <input
              id={`resist-${idBase}`}
              type="number"
              inputMode="decimal"
              min={0}
              step="any"
              autoComplete="off"
              value={set.resistanceLevel}
              onChange={(e) =>
                updateSet(
                  exerciseIndex,
                  setIndex,
                  "resistanceLevel",
                  e.target.value,
                )
              }
              placeholder="Optional"
              className={numberFieldClassName}
            />
          </div>
          <div>
            <label
              className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-zinc-500"
              htmlFor={`dist-${idBase}`}
            >
              Distance (mi)
            </label>
            <input
              id={`dist-${idBase}`}
              type="number"
              inputMode="decimal"
              min={0}
              step="any"
              autoComplete="off"
              value={set.distanceMiles}
              onChange={(e) =>
                updateSet(
                  exerciseIndex,
                  setIndex,
                  "distanceMiles",
                  e.target.value,
                )
              }
              placeholder="Optional"
              className={numberFieldClassName}
            />
          </div>
        </div>
        {setTimerField}
        {setNoteField}
      </div>
    );
  }

  if (exercise.metric === "bodyweight_reps") {
    return (
      <div className={setShellClassName}>
        {setHeader}
        <div className="text-sm">
          <label className="sr-only" htmlFor={`r-${idBase}`}>
            Reps, set {setNo}
          </label>
          <input
            id={`r-${idBase}`}
            type="number"
            inputMode="numeric"
            min={0}
            step={1}
            autoComplete="off"
            value={set.reps}
            onChange={(e) =>
              updateSet(exerciseIndex, setIndex, "reps", e.target.value)
            }
            placeholder="Reps"
            className={numberFieldClassName}
          />
        </div>
        {setTimerField}
        {setNoteField}
      </div>
    );
  }

  return (
    <div className={setShellClassName}>
      {setHeader}
      <div className="grid grid-cols-2 items-center gap-2 text-sm">
        <div>
          <label className="sr-only" htmlFor={`w-${idBase}`}>
            Weight for set {setNo}
          </label>
          <input
            id={`w-${idBase}`}
            type="number"
            inputMode="decimal"
            min={0}
            step="any"
            autoComplete="off"
            value={set.weight}
            onChange={(e) =>
              updateSet(exerciseIndex, setIndex, "weight", e.target.value)
            }
            placeholder="lb"
            className={numberFieldClassName}
          />
        </div>
        <div>
          <label className="sr-only" htmlFor={`r-${idBase}`}>
            Reps for set {setNo}
          </label>
          <input
            id={`r-${idBase}`}
            type="number"
            inputMode="numeric"
            min={0}
            step={1}
            autoComplete="off"
            value={set.reps}
            onChange={(e) =>
              updateSet(exerciseIndex, setIndex, "reps", e.target.value)
            }
            placeholder="reps"
            className={numberFieldClassName}
          />
        </div>
      </div>
      {setTimerField}
      {setNoteField}
    </div>
  );
}

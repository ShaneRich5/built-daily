"use client";

import { ArrowUpDown } from "lucide-react";
import { useEffect, useState } from "react";
import type { CatalogExercise } from "@/lib/exercise-catalog";
import { resolveWorkoutTitle } from "@/lib/workout-date";
import {
  formatWorkoutJournalEntry,
  workoutJournalFilename,
} from "@/lib/workout-journal-export";
import {
  buildWorkoutSessionDoc,
  type ActiveWorkoutFinishSnapshot,
} from "@/lib/workout-session-mapper";
import type { ExerciseHistoryEntry } from "@/lib/workout-session-repository";
import { AddExerciseFooter } from "@/features/workout-session/add-exercise-footer";
import { ExerciseCard } from "@/features/workout-session/exercise-card";
import { ExerciseDetailsSheet } from "@/features/workout-session/exercise-details-sheet";
import { ExerciseSearchSheet } from "@/features/workout-session/exercise-search-sheet";
import { copyText, downloadTextFile } from "@/features/workout-session/journal-actions";
import { MoveExerciseSheet } from "@/features/workout-session/move-exercise-sheet";
import { ReorderSheet } from "@/features/workout-session/reorder-sheet";
import { SessionActionBar } from "@/features/workout-session/session-action-bar";
import { SessionHeader } from "@/features/workout-session/session-header";
import {
  countDoneSets,
  MAX_SESSION_EXERCISES,
  rowsFromHistory,
  setRowHasMeasurements,
  setRowIsBlank,
  type SetRow,
} from "@/features/workout-session/session-model";
import { nextUnfinishedAfter } from "@/features/workout-session/session-reducer";
import type { WorkoutSessionInitialData } from "@/features/workout-session/session-snapshot";
import { useWorkoutSession } from "@/features/workout-session/use-workout-session";
import { WorkoutDetailsSheet } from "@/features/workout-session/workout-details-sheet";

export type WorkoutSessionScreenProps = WorkoutSessionInitialData & {
  /** Debounced while editing. */
  onPersist?: (snapshot: ActiveWorkoutFinishSnapshot) => void | Promise<void>;
  onFinish?: (snapshot: ActiveWorkoutFinishSnapshot) => void | Promise<void>;
  /** Delete this session (only for workouts that are already saved). */
  onDiscard?: () => void | Promise<void>;
};

/** Which sheet is showing. Sheets stay mounted so they can animate closed. */
type Panel = "add" | "replace" | "details" | "move" | "reorder" | "workout" | null;

/** The active workout: quick cards for logging, sheets for everything else. */
export function WorkoutSessionScreen({
  onPersist,
  onFinish,
  onDiscard,
  ...data
}: WorkoutSessionScreenProps) {
  const session = useWorkoutSession(data, onPersist);
  const { state, dispatch, history } = session;

  const [panel, setPanel] = useState<Panel>(null);
  /** The exercise the details / move / change sheet is about. Kept after closing for the exit animation. */
  const [focusLineId, setFocusLineId] = useState<string | null>(null);
  /** Bumped on every open so the search sheet starts fresh. */
  const [searchKey, setSearchKey] = useState(0);
  const [journalCopied, setJournalCopied] = useState(false);

  const exercises = state.exercises;
  const focusIndex = exercises.findIndex((item) => item.lineId === focusLineId);
  const focusItem = focusIndex >= 0 ? exercises[focusIndex] : undefined;
  const setCount = exercises.reduce((total, item) => total + item.sets.length, 0);
  const atLimit = exercises.length >= MAX_SESSION_EXERCISES;
  const title = resolveWorkoutTitle(
    state.title,
    state.workoutDate || null,
    session.startedAtMs,
  );

  // Bring a newly opened card into view (after adding, or "Next exercise").
  useEffect(() => {
    if (!state.openLineId) return;
    document
      .getElementById(`exercise-${state.openLineId}`)
      ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [state.openLineId]);

  const closePanel = (open: boolean) => {
    if (!open) setPanel(null);
  };

  const openSearch = (kind: "add" | "replace") => {
    setSearchKey((key) => key + 1);
    setPanel(kind);
  };

  const openDetails = (lineId: string) => {
    setFocusLineId(lineId);
    setPanel("details");
  };

  const addExercises = (picked: CatalogExercise[]) => {
    dispatch({ type: "addExercises", exercises: picked });
    setPanel(null);
  };

  const replaceExercise = (next: CatalogExercise) => {
    if (!focusItem) return;
    const metricChanges = focusItem.exercise.metric !== next.metric;
    if (
      metricChanges &&
      focusItem.sets.some(setRowHasMeasurements) &&
      !window.confirm(
        `${next.name} is logged differently than ${focusItem.exercise.name}. Clear the sets you already logged?`,
      )
    ) {
      return;
    }
    dispatch({ type: "replaceExercise", lineId: focusItem.lineId, exercise: next });
    dispatch({ type: "openExercise", lineId: focusItem.lineId });
    setPanel(null);
  };

  const removeExercise = () => {
    if (!focusItem) return;
    if (!window.confirm(`Remove ${focusItem.exercise.name} and all of its sets from this workout?`)) {
      return;
    }
    dispatch({ type: "removeExercise", lineId: focusItem.lineId });
    setPanel(null);
  };

  const removeSet = (lineId: string, setIndex: number, name: string, set: SetRow | undefined) => {
    if (set && !setRowIsBlank(set) && !window.confirm(`Remove set ${setIndex + 1} from ${name}?`)) {
      return;
    }
    dispatch({ type: "removeSet", lineId, setIndex });
  };

  const applyHistory = (entry: ExerciseHistoryEntry) => {
    if (!focusItem) return;
    if (
      focusItem.sets.some(setRowHasMeasurements) &&
      !window.confirm(`Replace the sets you've logged for ${focusItem.exercise.name}?`)
    ) {
      return;
    }
    dispatch({ type: "replaceSets", lineId: focusItem.lineId, sets: rowsFromHistory(entry.line.sets) });
  };

  const journal = () => {
    const doc = buildWorkoutSessionDoc(session.buildSnapshot(), {
      status: "in_progress",
      endedAt: null,
    });
    return { doc, text: formatWorkoutJournalEntry(doc) };
  };

  const copyJournal = async () => {
    if (await copyText(journal().text)) {
      setJournalCopied(true);
      window.setTimeout(() => setJournalCopied(false), 2000);
    }
  };

  const downloadJournal = () => {
    const { doc, text } = journal();
    downloadTextFile(workoutJournalFilename(doc), text);
  };

  const deleteWorkout = onDiscard
    ? async () => {
        if (
          window.confirm(
            "Delete this workout permanently? Progress will be removed and cannot be undone.",
          )
        ) {
          await onDiscard();
        }
      }
    : undefined;

  return (
    <div className="flex flex-1 flex-col gap-5 pb-[calc(5rem+env(safe-area-inset-bottom))]">
      <SessionHeader
        title={title}
        exerciseCount={exercises.length}
        setCount={setCount}
        doneSetCount={countDoneSets(exercises)}
        onOpenWorkoutDetails={() => setPanel("workout")}
      />

      <section aria-labelledby="exercises-heading" className="flex flex-col gap-2">
        <div className="flex min-h-8 items-center justify-between">
          <h2
            id="exercises-heading"
            className="text-xs font-medium tracking-wide text-zinc-500 uppercase dark:text-zinc-400"
          >
            Exercises
          </h2>
          {exercises.length > 1 ? (
            <button
              type="button"
              onClick={() => setPanel("reorder")}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg px-2 text-[13px] font-medium text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-900"
            >
              <ArrowUpDown className="size-3.5" aria-hidden />
              Reorder
            </button>
          ) : null}
        </div>

        {exercises.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Add your first exercise below, or finish without details if you just want to log
            that you showed up.
          </p>
        ) : (
          <ol className="flex flex-col gap-2">
            {exercises.map((item) => (
              <li key={item.lineId} id={`exercise-${item.lineId}`} className="scroll-mt-4 scroll-mb-28">
                <ExerciseCard
                  item={item}
                  open={state.openLineId === item.lineId}
                  lastTimeSets={history[item.exercise.id]?.[0]?.line.sets}
                  hasNextExercise={nextUnfinishedAfter(exercises, item.lineId) !== null}
                  onToggleOpen={() =>
                    dispatch({
                      type: "openExercise",
                      lineId: state.openLineId === item.lineId ? null : item.lineId,
                    })
                  }
                  onOpenDetails={() => openDetails(item.lineId)}
                  onUpdateSet={(setIndex, patch) =>
                    dispatch({ type: "updateSet", lineId: item.lineId, setIndex, patch })
                  }
                  onToggleSetDone={(setIndex, suggestion) =>
                    dispatch({ type: "toggleSetDone", lineId: item.lineId, setIndex, suggestion })
                  }
                  onAddSet={() => dispatch({ type: "addSet", lineId: item.lineId })}
                  onCopyLastSet={() => dispatch({ type: "copyLastSet", lineId: item.lineId })}
                  onNextExercise={() =>
                    dispatch({ type: "openNextExercise", afterLineId: item.lineId })
                  }
                />
              </li>
            ))}
          </ol>
        )}

        <AddExerciseFooter
          suggestions={session.suggestions}
          isFirst={exercises.length === 0}
          atLimit={atLimit}
          onOpenSearch={() => openSearch("add")}
          onAddSuggestion={(exercise) => addExercises([exercise])}
        />
      </section>

      <SessionActionBar
        hasExercises={exercises.length > 0}
        canAdd={!atLimit}
        journalCopied={journalCopied}
        onAddExercise={() => openSearch("add")}
        onFinish={() => void onFinish?.(session.buildSnapshot())}
        onOpenWorkoutDetails={() => setPanel("workout")}
        onReorder={() => setPanel("reorder")}
        onCopyJournal={() => void copyJournal()}
        onDownloadJournal={downloadJournal}
        onDelete={deleteWorkout ? () => void deleteWorkout() : undefined}
      />

      <ExerciseSearchSheet
        key={searchKey}
        open={panel === "add" || panel === "replace"}
        onOpenChange={closePanel}
        mode={
          panel === "replace" && focusItem
            ? { kind: "replace", currentName: focusItem.exercise.name }
            : {
                kind: "add",
                afterName: exercises[exercises.length - 1]?.exercise.name ?? null,
                room: MAX_SESSION_EXERCISES - exercises.length,
              }
        }
        suggested={session.suggestedForSearch}
        recent={session.recentExercises}
        onAdd={addExercises}
        onReplace={replaceExercise}
      />

      {focusItem ? (
        <ExerciseDetailsSheet
          key={focusItem.lineId}
          open={panel === "details"}
          onOpenChange={closePanel}
          item={focusItem}
          position={focusIndex + 1}
          total={exercises.length}
          history={history[focusItem.exercise.id] ?? []}
          historyLoading={session.historyLoading}
          onUpdateSet={(setIndex, patch) =>
            dispatch({ type: "updateSet", lineId: focusItem.lineId, setIndex, patch })
          }
          onAddSet={() => dispatch({ type: "addSet", lineId: focusItem.lineId })}
          onCopyLastSet={() => dispatch({ type: "copyLastSet", lineId: focusItem.lineId })}
          onRemoveSet={(setIndex) =>
            removeSet(focusItem.lineId, setIndex, focusItem.exercise.name, focusItem.sets[setIndex])
          }
          onUseHistory={applyHistory}
          onNoteChange={(note) =>
            dispatch({ type: "setExerciseNote", lineId: focusItem.lineId, note })
          }
          onChangeExercise={() => openSearch("replace")}
          onMoveExercise={() => setPanel("move")}
          onRemoveExercise={removeExercise}
        />
      ) : null}

      {focusItem ? (
        <MoveExerciseSheet
          open={panel === "move"}
          onOpenChange={closePanel}
          exercises={exercises}
          lineId={focusItem.lineId}
          onMove={(lineId, toIndex) => dispatch({ type: "moveExercise", lineId, toIndex })}
        />
      ) : null}

      <ReorderSheet
        open={panel === "reorder"}
        onOpenChange={closePanel}
        exercises={exercises}
        onMove={(lineId, toIndex) => dispatch({ type: "moveExercise", lineId, toIndex })}
      />

      <WorkoutDetailsSheet
        open={panel === "workout"}
        onOpenChange={closePanel}
        state={state}
        startedAtMs={session.startedAtMs}
        exercises={exercises.map((item) => item.exercise)}
        onMetaChange={(patch) => dispatch({ type: "updateMeta", patch })}
      />
    </div>
  );
}

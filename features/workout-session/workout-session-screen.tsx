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
import { AlternateChips } from "@/features/workout-session/alternate-chips";
import { ExerciseCard } from "@/features/workout-session/exercise-card";
import { ExerciseDetailsSheet } from "@/features/workout-session/exercise-details-sheet";
import { ExerciseSearchSheet } from "@/features/workout-session/exercise-search-sheet";
import { copyText, downloadTextFile } from "@/features/workout-session/journal-actions";
import { AddMaybeButton, MaybeSection } from "@/features/workout-session/maybe-section";
import { MoveExerciseSheet } from "@/features/workout-session/move-exercise-sheet";
import { ReorderSheet } from "@/features/workout-session/reorder-sheet";
import { SessionActionBar } from "@/features/workout-session/session-action-bar";
import { SessionHeader } from "@/features/workout-session/session-header";
import {
  countDoneSets,
  exerciseProgress,
  isUntouchedMaybe,
  MAX_SESSION_EXERCISES,
  rowsFromHistory,
  setRowHasMeasurements,
  setRowIsBlank,
  type SetRow,
} from "@/features/workout-session/session-model";
import {
  fullIndexForSectionMove,
  nextUnfinishedAfter,
} from "@/features/workout-session/session-reducer";
import type { WorkoutSessionInitialData } from "@/features/workout-session/session-snapshot";
import { SwapExerciseSheet } from "@/features/workout-session/swap-exercise-sheet";
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
type Panel =
  | "add"
  | "addMaybe"
  | "swap"
  | "swapSearch"
  | "details"
  | "move"
  | "reorder"
  | "workout"
  | null;

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
  const planItems = exercises.filter((item) => item.section === "plan");
  const maybeItems = exercises.filter((item) => item.section === "maybe");
  const focusItem = exercises.find((item) => item.lineId === focusLineId);
  /** The plan or the maybes, whichever the focused exercise is in. */
  const focusSection = focusItem?.section === "maybe" ? maybeItems : planItems;
  const focusIndex = focusItem ? focusSection.indexOf(focusItem) : -1;
  // Untouched maybes don't count toward the workout until you start one.
  const counted = exercises.filter((item) => !isUntouchedMaybe(item));
  const setCount = counted.reduce((total, item) => total + item.sets.length, 0);
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

  const openSearch = (kind: "add" | "addMaybe" | "swapSearch") => {
    setSearchKey((key) => key + 1);
    setPanel(kind);
  };

  const openDetails = (lineId: string) => {
    setFocusLineId(lineId);
    setPanel("details");
  };

  const addExercises = (picked: CatalogExercise[], section: "plan" | "maybe" = "plan") => {
    dispatch({ type: "addExercises", exercises: picked, section });
    setPanel(null);
  };

  /** Machine taken: put `next` in this slot. The old exercise stays one tap away as an alternate. */
  const swapExercise = (lineId: string, next: CatalogExercise) => {
    const item = exercises.find((candidate) => candidate.lineId === lineId);
    if (!item) return;
    const metricChanges = item.exercise.metric !== next.metric;
    if (
      metricChanges &&
      item.sets.some(setRowHasMeasurements) &&
      !window.confirm(
        `${next.name} is logged differently than ${item.exercise.name}. Clear the sets you already logged?`,
      )
    ) {
      return;
    }
    dispatch({ type: "swapExercise", lineId, exercise: next });
    if (item.section === "plan") dispatch({ type: "openExercise", lineId });
    setPanel(null);
  };

  const moveWithinSection = (lineId: string, toIndex: number) =>
    dispatch({
      type: "moveExercise",
      lineId,
      toIndex: fullIndexForSectionMove(exercises, lineId, toIndex),
    });

  const toggleSection = () => {
    if (!focusItem) return;
    dispatch({
      type: "setSection",
      lineId: focusItem.lineId,
      section: focusItem.section === "maybe" ? "plan" : "maybe",
    });
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
        exerciseCount={counted.length}
        setCount={setCount}
        doneSetCount={countDoneSets(counted)}
        onOpenWorkoutDetails={() => setPanel("workout")}
      />

      <section aria-labelledby="exercises-heading" className="flex flex-col gap-2">
        <div className="flex min-h-8 items-center justify-between">
          <h2
            id="exercises-heading"
            className="text-xs font-medium tracking-wide text-zinc-500 uppercase dark:text-zinc-400"
          >
            {maybeItems.length > 0 ? "Plan" : "Exercises"}
          </h2>
          {planItems.length > 1 ? (
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

        {planItems.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {maybeItems.length > 0
              ? "Nothing in the plan yet. Tap Do it on a maybe, or add an exercise below."
              : "Add your first exercise below, or finish without details if you just want to log that you showed up."}
          </p>
        ) : (
          <ol className="flex flex-col gap-2">
            {planItems.map((item) => (
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
                {state.openLineId !== item.lineId &&
                exerciseProgress(item.sets) === "not_started" ? (
                  <AlternateChips
                    currentName={item.exercise.name}
                    alternates={item.alternates}
                    onSwap={(next) => swapExercise(item.lineId, next)}
                  />
                ) : null}
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

      {maybeItems.length > 0 ? (
        <MaybeSection
          items={maybeItems}
          lastTimeById={Object.fromEntries(
            maybeItems.map((item) => [item.exercise.id, history[item.exercise.id]?.[0]?.line.sets]),
          )}
          canAdd={!atLimit}
          onDoIt={(lineId) =>
            dispatch({ type: "setSection", lineId, section: "plan", open: true })
          }
          onOpenDetails={openDetails}
          onAddMaybe={() => openSearch("addMaybe")}
        />
      ) : planItems.length > 0 && !atLimit ? (
        <AddMaybeButton quiet onClick={() => openSearch("addMaybe")} />
      ) : null}

      <SessionActionBar
        hasExercises={exercises.length > 0}
        canAdd={!atLimit}
        journalCopied={journalCopied}
        onAddExercise={() => openSearch("add")}
        onFinish={() => void onFinish?.(session.buildFinishSnapshot())}
        onOpenWorkoutDetails={() => setPanel("workout")}
        onReorder={() => setPanel("reorder")}
        onCopyJournal={() => void copyJournal()}
        onDownloadJournal={downloadJournal}
        onDelete={deleteWorkout ? () => void deleteWorkout() : undefined}
      />

      <ExerciseSearchSheet
        key={searchKey}
        open={panel === "add" || panel === "addMaybe" || panel === "swapSearch"}
        onOpenChange={closePanel}
        mode={
          panel === "swapSearch" && focusItem
            ? { kind: "replace", currentName: focusItem.exercise.name }
            : {
                kind: "add",
                afterName:
                  panel === "addMaybe"
                    ? null
                    : (planItems[planItems.length - 1]?.exercise.name ?? null),
                room: MAX_SESSION_EXERCISES - exercises.length,
              }
        }
        suggested={session.suggestedForSearch}
        recent={session.recentExercises}
        onAdd={(picked) => addExercises(picked, panel === "addMaybe" ? "maybe" : "plan")}
        onReplace={(next) => focusItem && swapExercise(focusItem.lineId, next)}
      />

      {focusItem ? (
        <ExerciseDetailsSheet
          key={focusItem.lineId}
          open={panel === "details"}
          onOpenChange={closePanel}
          item={focusItem}
          position={focusIndex + 1}
          total={focusSection.length}
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
          onSwapExercise={() => setPanel("swap")}
          onMoveExercise={() => setPanel("move")}
          onToggleSection={toggleSection}
          onRemoveExercise={removeExercise}
        />
      ) : null}

      {focusItem ? (
        <SwapExerciseSheet
          key={`swap-${focusItem.lineId}`}
          open={panel === "swap"}
          onOpenChange={closePanel}
          item={focusItem}
          onSwap={(next) => swapExercise(focusItem.lineId, next)}
          onSearchAll={() => openSearch("swapSearch")}
        />
      ) : null}

      {focusItem ? (
        <MoveExerciseSheet
          open={panel === "move"}
          onOpenChange={closePanel}
          exercises={focusSection}
          lineId={focusItem.lineId}
          onMove={moveWithinSection}
        />
      ) : null}

      <ReorderSheet
        open={panel === "reorder"}
        onOpenChange={closePanel}
        exercises={planItems}
        onMove={moveWithinSection}
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

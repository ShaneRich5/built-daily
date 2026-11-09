"use client";

import {
  ArrowLeftRight,
  ArrowUpDown,
  Check,
  ChevronLeft,
  Copy,
  NotebookText,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { useState } from "react";
import { BottomSheet, BottomSheetClose } from "@/components/ui/bottom-sheet";
import { muscleTargetSummary, targetingForExercise } from "@/lib/exercise-muscle";
import { formatLocalDateKey, formatWorkoutHeaderDate } from "@/lib/workout-date";
import type { ExerciseHistoryEntry } from "@/lib/workout-session-repository";
import { cn } from "@/lib/utils";
import {
  extraFieldsForMetric,
  metricLabel,
  NOTE_MAX,
  quickFieldsForMetric,
  suggestionForSet,
  summarizeSetLogs,
  type SessionExercise,
  type SetRow,
} from "@/features/workout-session/session-model";
import { SetFieldInput } from "@/features/workout-session/set-row";

type ExerciseDetailsSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: SessionExercise;
  position: number;
  total: number;
  history: ExerciseHistoryEntry[];
  historyLoading: boolean;
  onUpdateSet: (setIndex: number, patch: Partial<SetRow>) => void;
  onAddSet: () => void;
  onCopyLastSet: () => void;
  onRemoveSet: (setIndex: number) => void;
  onUseHistory: (entry: ExerciseHistoryEntry) => void;
  onNoteChange: (note: string) => void;
  onChangeExercise: () => void;
  onMoveExercise: () => void;
  onRemoveExercise: () => void;
};

const actionTile =
  "flex h-16 flex-col items-center justify-center gap-1 rounded-xl border border-zinc-200 bg-white text-xs font-medium hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950 dark:hover:bg-zinc-900";

const iconButton =
  "inline-flex size-10 shrink-0 items-center justify-center rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-900";

function historyDate(entry: ExerciseHistoryEntry): string {
  return entry.workoutDate
    ? formatLocalDateKey(entry.workoutDate)
    : formatWorkoutHeaderDate(entry.performedAt.getTime());
}

/** Everything for one exercise: all set fields, notes, history, and change/move/remove. */
export function ExerciseDetailsSheet({
  open,
  onOpenChange,
  item,
  position,
  total,
  history,
  historyLoading,
  onUpdateSet,
  onAddSet,
  onCopyLastSet,
  onRemoveSet,
  onUseHistory,
  onNoteChange,
  onChangeExercise,
  onMoveExercise,
  onRemoveExercise,
}: ExerciseDetailsSheetProps) {
  const { exercise, sets, lineId } = item;
  const [notesOpen, setNotesOpen] = useState<Set<number>>(() => new Set());
  const fields = quickFieldsForMetric(exercise.metric);
  const extraFields = extraFieldsForMetric(exercise.metric);
  const lastTimeSets = history[0]?.line.sets;
  const { primary, secondary } = targetingForExercise(exercise);
  const muscles = muscleTargetSummary(primary, secondary);

  const toggleNote = (setIndex: number) =>
    setNotesOpen((prev) => {
      const next = new Set(prev);
      if (next.has(setIndex)) next.delete(setIndex);
      else next.add(setIndex);
      return next;
    });

  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      variant="fullscreen"
      title={exercise.name}
      hideHeader
      footer={
        <BottomSheetClose className="h-12 w-full rounded-lg bg-zinc-900 text-[15px] font-semibold text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900">
          Done
        </BottomSheetClose>
      }
    >
      <div className="flex items-center justify-between border-b border-zinc-100 px-2 py-2 dark:border-zinc-800">
        <BottomSheetClose className="inline-flex h-11 items-center gap-1 rounded-lg px-2 text-sm font-medium hover:bg-zinc-100 dark:hover:bg-zinc-900">
          <ChevronLeft className="size-[18px]" aria-hidden />
          Workout
        </BottomSheetClose>
        <span className="pr-2 font-mono text-xs text-zinc-500">
          {position} of {total}
        </span>
      </div>

      <div className="flex flex-col gap-6 px-4 pt-4 pb-6">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">{exercise.name}</h2>
          <p className="mt-1 text-[13px] text-zinc-500 dark:text-zinc-400">
            {muscles ? `${muscles} · ` : ""}
            {metricLabel(exercise.metric)}
          </p>
          <div className="mt-3.5 grid grid-cols-3 gap-2">
            <button type="button" className={actionTile} onClick={onChangeExercise}>
              <ArrowLeftRight className="size-[18px]" aria-hidden />
              Change
            </button>
            <button
              type="button"
              className={actionTile}
              onClick={onMoveExercise}
              disabled={total < 2}
            >
              <ArrowUpDown className="size-[18px]" aria-hidden />
              Move…
            </button>
            <button
              type="button"
              className={cn(actionTile, "text-red-700 dark:text-red-400")}
              onClick={onRemoveExercise}
            >
              <Trash2 className="size-[18px]" aria-hidden />
              Remove
            </button>
          </div>
        </div>

        <section aria-labelledby="details-sets" className="flex flex-col gap-2">
          <h3
            id="details-sets"
            className="text-xs font-semibold tracking-wide text-zinc-500 uppercase dark:text-zinc-400"
          >
            Sets
          </h3>
          {sets.map((set, setIndex) => {
            const setNumber = setIndex + 1;
            const suggestion = suggestionForSet(sets, setIndex, lastTimeSets);
            const noteVisible = notesOpen.has(setIndex) || set.note.trim() !== "";
            return (
              <div
                key={setIndex}
                className="flex flex-col gap-2 rounded-xl border border-zinc-100 bg-zinc-50 p-2 dark:border-zinc-800 dark:bg-zinc-900/50"
              >
                <div className="flex items-center gap-1.5">
                  <span
                    className={cn(
                      "inline-flex w-6 shrink-0 justify-center font-mono text-xs",
                      set.done ? "text-emerald-700 dark:text-emerald-400" : "text-zinc-500",
                    )}
                  >
                    {set.done ? (
                      <>
                        <Check className="size-3.5" strokeWidth={3} aria-hidden />
                        <span className="sr-only">Set {setNumber}, done</span>
                      </>
                    ) : (
                      setNumber
                    )}
                  </span>
                  {fields.map((spec) => (
                    <SetFieldInput
                      key={spec.id}
                      spec={spec}
                      set={set}
                      setNumber={setNumber}
                      suggestion={set.done ? null : suggestion}
                      onChange={(patch) => onUpdateSet(setIndex, patch)}
                      showUnit
                    />
                  ))}
                  <button
                    type="button"
                    className={cn(iconButton, set.note.trim() ? "text-zinc-900 dark:text-zinc-100" : "text-zinc-400")}
                    aria-label={`Add a note to set ${setNumber}`}
                    aria-expanded={noteVisible}
                    onClick={() => toggleNote(setIndex)}
                  >
                    <NotebookText className="size-4" aria-hidden />
                  </button>
                  <button
                    type="button"
                    className={cn(iconButton, "text-zinc-400")}
                    aria-label={`Remove set ${setNumber}`}
                    onClick={() => onRemoveSet(setIndex)}
                  >
                    <X className="size-4" aria-hidden />
                  </button>
                </div>

                {extraFields.length > 0 ? (
                  <div className="grid grid-cols-3 gap-1.5 pl-7">
                    {extraFields.map((spec) => (
                      <label key={spec.id} className="flex flex-col gap-1 text-[11px] font-medium text-zinc-500 uppercase">
                        {spec.label}
                        <SetFieldInput
                          spec={spec}
                          set={set}
                          setNumber={setNumber}
                          suggestion={null}
                          onChange={(patch) => onUpdateSet(setIndex, patch)}
                        />
                      </label>
                    ))}
                  </div>
                ) : null}

                {noteVisible ? (
                  <div className="pl-7">
                    <label htmlFor={`set-note-${lineId}-${setIndex}`} className="sr-only">
                      Note for set {setNumber}
                    </label>
                    <input
                      id={`set-note-${lineId}-${setIndex}`}
                      type="text"
                      value={set.note}
                      maxLength={NOTE_MAX.set}
                      onChange={(e) => onUpdateSet(setIndex, { note: e.target.value })}
                      placeholder="One-off detail for this set…"
                      className="h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-base text-zinc-900 outline-none placeholder:text-zinc-400 focus:ring-2 focus:ring-zinc-900/10 sm:text-sm dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
                    />
                  </div>
                ) : null}
              </div>
            );
          })}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onAddSet}
              className="inline-flex h-11 flex-1 items-center justify-center gap-1.5 rounded-xl border border-zinc-200 text-sm font-medium hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
            >
              <Plus className="size-4" aria-hidden />
              Add set
            </button>
            <button
              type="button"
              onClick={onCopyLastSet}
              className="inline-flex h-11 flex-1 items-center justify-center gap-1.5 rounded-xl border border-zinc-200 text-sm font-medium hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
            >
              <Copy className="size-4" aria-hidden />
              Copy last set
            </button>
          </div>
        </section>

        <section aria-labelledby="details-history" className="flex flex-col gap-1">
          <h3
            id="details-history"
            className="text-xs font-semibold tracking-wide text-zinc-500 uppercase dark:text-zinc-400"
          >
            Previous sessions
          </h3>
          {historyLoading ? (
            <p className="py-2 text-sm text-zinc-500">Checking previous workouts…</p>
          ) : history.length === 0 ? (
            <p className="py-2 text-sm text-zinc-500">
              No previous sessions yet. Next time, your sets from today show up here.
            </p>
          ) : (
            <ul>
              {history.slice(0, 5).map((entry) => (
                <li
                  key={entry.sessionId}
                  className="flex min-h-14 items-center gap-3 border-b border-zinc-100 py-1 dark:border-zinc-800"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium">{historyDate(entry)}</span>
                    <span className="block truncate font-mono text-xs text-zinc-600 dark:text-zinc-400">
                      {summarizeSetLogs(entry.line.sets) || "No sets recorded"}
                    </span>
                  </span>
                  <button
                    type="button"
                    disabled={entry.line.sets.length === 0}
                    onClick={() => onUseHistory(entry)}
                    className="h-10 shrink-0 rounded-lg border border-zinc-200 px-3 text-[13px] font-medium hover:bg-zinc-50 disabled:opacity-40 dark:border-zinc-700 dark:hover:bg-zinc-900"
                  >
                    Use these
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="flex flex-col gap-2">
          <label
            htmlFor={`exercise-note-${lineId}`}
            className="text-xs font-semibold tracking-wide text-zinc-500 uppercase dark:text-zinc-400"
          >
            Exercise note
          </label>
          <textarea
            id={`exercise-note-${lineId}`}
            rows={3}
            maxLength={NOTE_MAX.exercise}
            value={item.note}
            onChange={(e) => onNoteChange(e.target.value)}
            placeholder="Equipment swaps, pain or limitations, cues for this lift…"
            className="resize-none rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-base text-zinc-900 outline-none placeholder:text-zinc-400 focus:ring-2 focus:ring-zinc-900/10 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
          />
        </section>
      </div>
    </BottomSheet>
  );
}


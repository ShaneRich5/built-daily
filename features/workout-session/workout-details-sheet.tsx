"use client";

import { BottomSheet, BottomSheetClose } from "@/components/ui/bottom-sheet";
import { WorkoutMetaFields } from "@/components/workout-meta-fields";
import { WorkoutSessionMuscles } from "@/components/workout-session-muscles";
import type { CatalogExercise } from "@/lib/exercise-catalog";
import { NOTE_MAX } from "@/features/workout-session/session-model";
import type { SessionState } from "@/features/workout-session/session-reducer";

type WorkoutDetailsSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  state: Pick<SessionState, "title" | "workoutDate" | "workoutTime" | "workoutNote">;
  startedAtMs: number;
  exercises: CatalogExercise[];
  onMetaChange: (
    patch: Partial<Pick<SessionState, "title" | "workoutDate" | "workoutTime" | "workoutNote">>,
  ) => void;
};

/** The rarely-changed workout-level things: name, date, note, muscle map. */
export function WorkoutDetailsSheet({
  open,
  onOpenChange,
  state,
  startedAtMs,
  exercises,
  onMetaChange,
}: WorkoutDetailsSheetProps) {
  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Workout details"
      footer={
        <BottomSheetClose className="h-12 w-full rounded-lg bg-zinc-900 text-[15px] font-semibold text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900">
          Done
        </BottomSheetClose>
      }
    >
      <div className="flex flex-col gap-6 px-4 pt-1 pb-6">
        <WorkoutMetaFields
          title={state.title}
          workoutDate={state.workoutDate}
          workoutTime={state.workoutTime}
          onTitleChange={(title) => onMetaChange({ title })}
          onWorkoutDateChange={(workoutDate) => onMetaChange({ workoutDate })}
          onWorkoutTimeChange={(workoutTime) => onMetaChange({ workoutTime })}
          titleFallbackMs={startedAtMs}
        />

        <div className="flex flex-col gap-2">
          <label
            htmlFor="workout-note"
            className="text-xs font-semibold tracking-wide text-zinc-500 uppercase dark:text-zinc-400"
          >
            Workout note
          </label>
          <textarea
            id="workout-note"
            rows={3}
            maxLength={NOTE_MAX.workout}
            value={state.workoutNote}
            onChange={(e) => onMetaChange({ workoutNote: e.target.value })}
            placeholder="How you felt, sleep, context for this session…"
            className="resize-none rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-base text-zinc-900 outline-none placeholder:text-zinc-400 focus:ring-2 focus:ring-zinc-900/10 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
          />
        </div>

        <WorkoutSessionMuscles exercises={exercises} />
      </div>
    </BottomSheet>
  );
}

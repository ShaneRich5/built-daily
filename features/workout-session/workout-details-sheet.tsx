"use client";

import { Pause, Play, RotateCcw } from "lucide-react";
import { BottomSheet, BottomSheetClose } from "@/components/ui/bottom-sheet";
import { WorkoutMetaFields } from "@/components/workout-meta-fields";
import { WorkoutSessionMuscles } from "@/components/workout-session-muscles";
import type { CatalogExercise } from "@/lib/exercise-catalog";
import { NOTE_MAX } from "@/features/workout-session/session-model";
import type { SessionState } from "@/features/workout-session/session-reducer";
import {
  formatElapsed,
  type SessionTimer,
} from "@/features/workout-session/use-session-timer";

type WorkoutDetailsSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  state: Pick<SessionState, "title" | "workoutDate" | "workoutTime" | "workoutNote">;
  startedAtMs: number;
  timer: SessionTimer;
  exercises: CatalogExercise[];
  onMetaChange: (
    patch: Partial<Pick<SessionState, "title" | "workoutDate" | "workoutTime" | "workoutNote">>,
  ) => void;
};

const timerButton =
  "inline-flex h-11 items-center gap-1.5 rounded-lg border border-zinc-200 px-3 text-sm font-medium hover:bg-zinc-50 disabled:opacity-40 dark:border-zinc-700 dark:hover:bg-zinc-900";

/** The rarely-changed workout-level things: name, date, note, timer, muscle map. */
export function WorkoutDetailsSheet({
  open,
  onOpenChange,
  state,
  startedAtMs,
  timer,
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

        <section aria-labelledby="session-timer-heading" className="flex flex-col gap-2">
          <h3
            id="session-timer-heading"
            className="text-xs font-semibold tracking-wide text-zinc-500 uppercase dark:text-zinc-400"
          >
            Session timer <span className="font-normal normal-case">(optional)</span>
          </h3>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className="min-w-16 font-mono text-2xl tabular-nums"
              aria-live="polite"
              aria-atomic="true"
            >
              {formatElapsed(timer.elapsedMs)}
            </span>
            {timer.phase === "running" ? (
              <button type="button" className={timerButton} onClick={timer.pause}>
                <Pause className="size-4" aria-hidden />
                Pause
              </button>
            ) : (
              <button type="button" className={timerButton} onClick={timer.start}>
                <Play className="size-4" aria-hidden />
                {timer.phase === "paused" ? "Resume" : "Start"}
              </button>
            )}
            <button
              type="button"
              className={timerButton}
              onClick={timer.reset}
              disabled={timer.phase === "idle" && timer.elapsedMs === 0}
            >
              <RotateCcw className="size-4" aria-hidden />
              Reset
            </button>
          </div>
        </section>

        <WorkoutSessionMuscles exercises={exercises} />
      </div>
    </BottomSheet>
  );
}

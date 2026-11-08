import { Check } from "lucide-react";
import type { ExerciseProgress } from "@/features/workout-session/session-model";

/** Filled check when done, a ring with a dot while in progress, an empty ring otherwise. */
export function ExerciseStatusIcon({ progress }: { progress: ExerciseProgress }) {
  if (progress === "done") {
    return (
      <span className="inline-flex size-[22px] shrink-0 items-center justify-center rounded-full bg-emerald-700 text-white dark:bg-emerald-500 dark:text-zinc-950">
        <Check className="size-3" strokeWidth={3} aria-hidden />
        <span className="sr-only">Done</span>
      </span>
    );
  }
  if (progress === "in_progress") {
    return (
      <span className="inline-flex size-[22px] shrink-0 items-center justify-center rounded-full border-[1.5px] border-emerald-700 dark:border-emerald-500">
        <span className="size-2 rounded-full bg-emerald-700 dark:bg-emerald-500" aria-hidden />
        <span className="sr-only">In progress</span>
      </span>
    );
  }
  return (
    <span className="inline-flex size-[22px] shrink-0 rounded-full border-[1.5px] border-zinc-300 dark:border-zinc-600">
      <span className="sr-only">Not started</span>
    </span>
  );
}

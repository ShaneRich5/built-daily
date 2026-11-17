"use client";

import { BottomSheet } from "@/components/ui/bottom-sheet";
import { cn } from "@/lib/utils";
import type { SessionExercise } from "@/features/workout-session/session-model";
import {
  leftoverHelpText,
  type LeftoverChoice,
  type NextPlannedDay,
} from "@/features/workout-session/leftovers";

type FinishLeftoversSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workoutTitle: string;
  /** "3 exercises · 11 sets" for what you did. */
  doneSummary: string;
  items: SessionExercise[];
  /** "loading" while we look for the next planned day. */
  next: NextPlannedDay | null | "loading";
  choices: Record<string, LeftoverChoice>;
  onChoose: (lineId: string, choice: LeftoverChoice) => void;
  finishing: boolean;
  onFinish: () => void;
};

/** E3: you're done, and here's what you didn't get to. Next time, Later, or Drop for each. */
export function FinishLeftoversSheet({
  open,
  onOpenChange,
  workoutTitle,
  doneSummary,
  items,
  next,
  choices,
  onChoose,
  finishing,
  onFinish,
}: FinishLeftoversSheetProps) {
  const loading = next === "loading";
  const nextDay = loading ? null : next;
  const options: Array<{ choice: LeftoverChoice; label: string }> = [
    ...(nextDay ? [{ choice: "next" as const, label: "Next time" }] : []),
    { choice: "later", label: "Later" },
    { choice: "drop", label: "Drop" },
  ];

  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title={`Nice work. ${workoutTitle}’s in.`}
      description={doneSummary}
      footer={
        <div className="flex flex-col gap-2">
          <button
            type="button"
            disabled={finishing || loading}
            onClick={onFinish}
            className="h-12 w-full rounded-lg bg-emerald-700 text-[15px] font-semibold text-white hover:bg-emerald-800 disabled:opacity-60 dark:bg-emerald-600 dark:hover:bg-emerald-500"
          >
            {finishing ? "Saving…" : "Finish workout"}
          </button>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="h-12 w-full rounded-lg border border-zinc-200 text-[15px] font-semibold hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
          >
            Keep going
          </button>
        </div>
      }
    >
      <div className="flex flex-col px-4 pb-2">
        <h3 className="border-t border-zinc-100 pt-3 text-xs font-medium tracking-wide text-zinc-600 uppercase dark:border-zinc-800 dark:text-zinc-400">
          You didn&rsquo;t get to these
        </h3>
        <ul className="flex flex-col">
          {items.map((item) => (
            <li
              key={item.lineId}
              className="flex flex-col gap-2 border-b border-zinc-100 py-2.5 dark:border-zinc-800"
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className="min-w-0 truncate text-[15px] font-medium">{item.exercise.name}</span>
                <span
                  className={cn(
                    "shrink-0 rounded-full border border-zinc-200 px-2 py-0.5 text-[11px] font-semibold tracking-wide uppercase dark:border-zinc-700",
                    item.section === "maybe" ? "text-zinc-500 dark:text-zinc-400" : "text-zinc-900 dark:text-zinc-100",
                  )}
                >
                  {item.section === "maybe" ? "Maybe" : "Plan"}
                </span>
              </div>
              <div
                role="group"
                aria-label={`What to do with ${item.exercise.name}`}
                className="grid gap-[3px] rounded-[10px] border border-zinc-200 bg-zinc-100 p-[3px] dark:border-zinc-700 dark:bg-zinc-900"
                style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
              >
                {options.map(({ choice, label }) => {
                  const pressed = choices[item.lineId] === choice;
                  return (
                    <button
                      key={choice}
                      type="button"
                      aria-pressed={pressed}
                      disabled={loading}
                      onClick={() => onChoose(item.lineId, choice)}
                      className={cn(
                        "h-10 rounded-lg text-[13px] disabled:opacity-60",
                        pressed
                          ? "bg-white font-semibold text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-zinc-50"
                          : "font-medium text-zinc-600 dark:text-zinc-400",
                      )}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </li>
          ))}
        </ul>
        <p className="mt-2.5 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
          {loading ? "Checking your planner…" : leftoverHelpText(nextDay)}
        </p>
      </div>
    </BottomSheet>
  );
}

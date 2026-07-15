"use client";

import { defaultWorkoutTitle } from "@/lib/workout-date";
import { NOTE_LIMITS } from "@/lib/workout-types";

type WorkoutMetaFieldsProps = {
  title: string;
  workoutDate: string;
  workoutTime: string;
  onTitleChange: (value: string) => void;
  onWorkoutDateChange: (value: string) => void;
  onWorkoutTimeChange: (value: string) => void;
  /** Used for the empty-title placeholder. */
  titleFallbackMs?: number;
  compact?: boolean;
};

export function WorkoutMetaFields({
  title,
  workoutDate,
  workoutTime,
  onTitleChange,
  onWorkoutDateChange,
  onWorkoutTimeChange,
  titleFallbackMs,
  compact = false,
}: WorkoutMetaFieldsProps) {
  const placeholder = defaultWorkoutTitle(
    workoutDate.trim() || null,
    titleFallbackMs ?? 0,
  );

  const inputClass = compact
    ? "h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
    : "h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100";

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <label
          htmlFor="workout-meta-title"
          className="text-xs font-semibold uppercase tracking-wide text-zinc-500"
        >
          Name
        </label>
        <input
          id="workout-meta-title"
          value={title}
          onChange={(e) =>
            onTitleChange(e.target.value.slice(0, NOTE_LIMITS.title))
          }
          maxLength={NOTE_LIMITS.title}
          placeholder={placeholder}
          className={
            compact
              ? "h-11 w-full rounded-lg border border-zinc-200 bg-white px-3 text-base font-semibold text-zinc-900 outline-none placeholder:font-normal placeholder:text-zinc-400 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
              : "h-12 w-full rounded-xl border border-zinc-200 bg-white px-3 text-xl font-semibold text-zinc-900 outline-none placeholder:font-normal placeholder:text-zinc-400 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
          }
        />
        <p className="text-[11px] text-zinc-400">
          Leave blank to use “{placeholder}”.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <label
            htmlFor="workout-meta-date"
            className="text-xs font-semibold uppercase tracking-wide text-zinc-500"
          >
            Date
          </label>
          <input
            id="workout-meta-date"
            type="date"
            value={workoutDate}
            onChange={(e) => onWorkoutDateChange(e.target.value)}
            className={inputClass}
          />
        </div>
        <div className="space-y-1">
          <label
            htmlFor="workout-meta-time"
            className="text-xs font-semibold uppercase tracking-wide text-zinc-500"
          >
            Time
          </label>
          <input
            id="workout-meta-time"
            type="time"
            value={workoutTime}
            onChange={(e) => onWorkoutTimeChange(e.target.value)}
            className={inputClass}
          />
        </div>
      </div>
      <p className="text-[11px] text-zinc-400">
        Date and time are optional — clear either if you just want it written
        down.
      </p>
    </div>
  );
}

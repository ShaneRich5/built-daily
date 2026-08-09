"use client";

import {
  defaultWorkoutTitle,
  formatLocalDateKey,
  formatWorkoutTimeLabel,
  resolveWorkoutTitle,
} from "@/lib/workout-date";
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
  /**
   * Collapse name/date/time behind a summary line.
   * Best for active workouts where these rarely change.
   */
  collapsible?: boolean;
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
  collapsible = false,
}: WorkoutMetaFieldsProps) {
  const fallbackMs = titleFallbackMs ?? 0;
  const dateKey = workoutDate.trim() || null;
  const placeholder = defaultWorkoutTitle(dateKey, fallbackMs);
  const displayTitle = resolveWorkoutTitle(title, dateKey, fallbackMs);

  const metaBits: string[] = [];
  if (dateKey) {
    metaBits.push(formatLocalDateKey(dateKey));
  }
  if (workoutTime.trim()) {
    metaBits.push(formatWorkoutTimeLabel(workoutTime.trim()));
  }
  const metaLine = metaBits.join(" · ");

  const inputClass = compact
    ? "h-9 w-full rounded-lg border border-zinc-200 bg-white px-2.5 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
    : "h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100";

  const fields = (
    <div className={collapsible || compact ? "space-y-2" : "space-y-3"}>
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
            compact || collapsible
              ? "h-10 w-full rounded-lg border border-zinc-200 bg-white px-2.5 text-sm font-semibold text-zinc-900 outline-none placeholder:font-normal placeholder:text-zinc-400 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
              : "h-12 w-full rounded-xl border border-zinc-200 bg-white px-3 text-xl font-semibold text-zinc-900 outline-none placeholder:font-normal placeholder:text-zinc-400 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
          }
        />
        {!collapsible && !compact ? (
          <p className="text-[11px] text-zinc-400">
            Leave blank to use “{placeholder}”.
          </p>
        ) : null}
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
      {!collapsible && !compact ? (
        <p className="text-[11px] text-zinc-400">
          Date and time are optional — clear either if you just want it written
          down.
        </p>
      ) : null}
    </div>
  );

  if (!collapsible) {
    return fields;
  }

  return (
    <details className="group">
      <summary className="cursor-pointer list-none marker:content-none [&::-webkit-details-marker]:hidden">
        <span className="flex min-w-0 items-start justify-between gap-2">
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              {displayTitle}
            </span>
            {metaLine ? (
              <span className="mt-0.5 block truncate text-xs text-zinc-500">
                {metaLine}
              </span>
            ) : (
              <span className="mt-0.5 block text-xs text-zinc-400">
                Date & time optional
              </span>
            )}
          </span>
          <span className="shrink-0 pt-0.5 text-xs font-medium text-zinc-400 underline-offset-2 group-open:hidden group-hover:text-zinc-600 group-hover:underline dark:group-hover:text-zinc-300">
            Edit
          </span>
          <span className="hidden shrink-0 pt-0.5 text-xs font-medium text-zinc-400 group-open:inline dark:text-zinc-500">
            Done
          </span>
        </span>
      </summary>
      <div className="mt-2 border-t border-zinc-100 pt-2 dark:border-zinc-800">
        {fields}
      </div>
    </details>
  );
}

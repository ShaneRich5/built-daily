"use client";

import {
  MUSCLE_FOCUS_OPTIONS,
  type MuscleFocus,
} from "@/lib/exercise-muscle";

export function MuscleFocusPicker({
  value,
  onChange,
  tone = "light",
}: {
  value: MuscleFocus;
  onChange: (focus: MuscleFocus) => void;
  tone?: "light" | "dark";
}) {
  const dark = tone === "dark";

  return (
    <div
      className="grid grid-cols-3 gap-1.5 sm:grid-cols-6"
      role="toolbar"
      aria-label="Body view"
    >
      {MUSCLE_FOCUS_OPTIONS.map((option) => {
        const on = value === option.id;
        return (
          <button
            key={option.id}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(option.id)}
            className={`h-10 rounded-lg border text-xs font-semibold transition ${
              on
                ? dark
                  ? "border-white bg-white text-zinc-900"
                  : "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                : dark
                  ? "border-white/15 bg-transparent text-slate-300 hover:bg-white/10"
                  : "border-zinc-200 bg-zinc-50 text-zinc-700 hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:border-zinc-700"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

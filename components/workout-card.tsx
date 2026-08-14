import Link from "next/link";
import { Check } from "lucide-react";
import { formatSessionVolumeMeta } from "@/lib/workout-date";

export type WorkoutCardProps = {
  name: string;
  dateLabel: string;
  exerciseCount: number;
  setCount?: number;
  previewNames?: string[];
  href?: string;
  status?: "completed" | "in_progress";
  selectable?: boolean;
  selected?: boolean;
  onToggleSelect?: () => void;
};

export function WorkoutCard({
  name,
  dateLabel,
  exerciseCount,
  setCount,
  previewNames,
  href,
  status = "completed",
  selectable = false,
  selected = false,
  onToggleSelect,
}: WorkoutCardProps) {
  const isInProgress = status === "in_progress";
  const meta = formatSessionVolumeMeta(exerciseCount, setCount, status);

  const preview =
    previewNames && previewNames.length > 0
      ? previewNames.slice(0, 3).join(", ")
      : null;

  const body = (
    <>
      <div className="flex items-start justify-between gap-2">
        <span className="font-medium text-zinc-900 dark:text-zinc-50">
          {name}
        </span>
        <span
          className={
            isInProgress
              ? "shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800 dark:bg-amber-950 dark:text-amber-300"
              : "shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
          }
        >
          {isInProgress ? "In progress" : "Finished"}
        </span>
      </div>
      <span className="text-sm text-zinc-500">{dateLabel}</span>
      <span className="text-xs text-zinc-400">{meta}</span>
      {preview ? (
        <span className="truncate text-xs text-zinc-400">{preview}</span>
      ) : null}
      {isInProgress && !selectable ? (
        <span className="pt-0.5 text-xs font-medium text-amber-700 dark:text-amber-400">
          Tap to continue
        </span>
      ) : null}
    </>
  );

  const surfaceClass = isInProgress
    ? "rounded-xl border border-amber-200 bg-amber-50/50 p-4 text-left dark:border-amber-900/60 dark:bg-amber-950/20"
    : "rounded-xl border border-zinc-200 bg-white p-4 text-left dark:border-zinc-800 dark:bg-zinc-950";

  if (selectable) {
    return (
      <button
        type="button"
        onClick={onToggleSelect}
        aria-pressed={selected}
        className={`flex w-full items-start gap-3 ${surfaceClass} transition active:scale-[0.99] ${
          selected
            ? "border-emerald-600 bg-emerald-50/80 dark:border-emerald-500 dark:bg-emerald-950/30"
            : ""
        }`}
      >
        <span
          className={`mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md border ${
            selected
              ? "border-emerald-600 bg-emerald-600 text-white dark:border-emerald-500 dark:bg-emerald-500"
              : "border-zinc-300 bg-white text-transparent dark:border-zinc-600 dark:bg-zinc-950"
          }`}
          aria-hidden
        >
          <Check className="size-3.5" />
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-1">{body}</span>
      </button>
    );
  }

  const className = `flex w-full flex-col gap-1 ${surfaceClass}`;

  if (href) {
    return (
      <Link
        href={href}
        className={`${className} transition hover:border-zinc-300 hover:bg-zinc-50 active:scale-[0.99] dark:hover:border-zinc-700 dark:hover:bg-zinc-900`}
      >
        {body}
      </Link>
    );
  }

  return <div className={className}>{body}</div>;
}

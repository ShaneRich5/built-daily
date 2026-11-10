import { CalendarCheck } from "lucide-react";
import { addDaysToDateKey } from "@/lib/calendar-views";
import { shortDay, type BoardCard } from "@/features/planner/week-board-model";

type HomeCatchUpProps = {
  missed: BoardCard;
  todayKey: string;
  busy: boolean;
  onDoToday: () => void;
  onPickDay: () => void;
  onSkip: () => void;
};

function when(dateKey: string, todayKey: string): string {
  if (dateKey === addDaysToDateKey(todayKey, -1)) return "yesterday";
  return `on ${shortDay(dateKey).split(",")[0]}`;
}

/** A calm nudge when a planned workout slid past. Never a red mark. */
export function HomeCatchUp({ missed, todayKey, busy, onDoToday, onPickDay, onSkip }: HomeCatchUpProps) {
  const secondary =
    "inline-flex h-11 flex-1 items-center justify-center rounded-lg border border-zinc-200 bg-white text-[13px] font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:bg-zinc-900";
  return (
    <section
      aria-labelledby="home-catch-up-heading"
      className="flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950"
    >
      <div className="flex items-start gap-3">
        <span
          className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
          aria-hidden
        >
          <CalendarCheck className="size-[18px]" />
        </span>
        <div>
          <h2 id="home-catch-up-heading" className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
            {missed.title} slid past {missed.dateKey ? when(missed.dateKey, todayKey) : ""}
          </h2>
          <p className="mt-1 text-[13px] text-zinc-600 dark:text-zinc-400">Happens. Want to fit it back in?</p>
        </div>
      </div>
      <button
        type="button"
        disabled={busy}
        onClick={onDoToday}
        className="h-12 rounded-xl bg-emerald-700 text-[15px] font-semibold text-white hover:bg-emerald-800 disabled:opacity-60 dark:bg-emerald-600 dark:hover:bg-emerald-500"
      >
        Do it today
      </button>
      <div className="flex gap-2">
        <button type="button" disabled={busy} onClick={onPickDay} className={secondary}>
          Pick a day
        </button>
        <button type="button" disabled={busy} onClick={onSkip} className={secondary}>
          Skip it
        </button>
      </div>
    </section>
  );
}

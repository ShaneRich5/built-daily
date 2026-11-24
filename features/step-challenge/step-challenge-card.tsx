import { ChevronRight, Footprints } from "lucide-react";
import { cn } from "@/lib/utils";
import type { StepChallengeCardView } from "@/features/step-challenge/step-challenge-model";
import { StepDayDots } from "@/features/step-challenge/step-day-dots";
import {
  ghostButton,
  primaryButton,
  sectionLabel,
  sourceChip,
  typedChip,
} from "@/features/step-challenge/step-challenge-ui";

type StepChallengeCardProps = {
  /** Null when there's no running or just-finished challenge. */
  view: StepChallengeCardView | null;
  busy?: boolean;
  onStart: () => void;
  onLogDay: (dateKey: string) => void;
  onEdit: () => void;
  onRepeat: () => void;
};

/** The weekly step challenge on Home, or a quiet way to start one. */
export function StepChallengeCard({ view, busy = false, onStart, onLogDay, onEdit, onRepeat }: StepChallengeCardProps) {
  if (!view) return <StartChallengeEntry onStart={onStart} />;

  const todayKey = view.days.find((d) => d.isToday)?.dateKey ?? null;
  const complete = view.state === "done";

  return (
    <section aria-labelledby="step-challenge-heading" className="flex flex-col gap-2">
      <h2 className={sectionLabel}>Step challenge</h2>
      <div
        className={cn(
          "flex flex-col gap-3 rounded-2xl border p-4",
          complete
            ? "border-emerald-200 bg-emerald-50/70 dark:border-emerald-900 dark:bg-emerald-950/30"
            : "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950",
        )}
      >
        <div className="flex items-baseline justify-between gap-2">
          <h3 id="step-challenge-heading" className="text-[15px] font-semibold text-zinc-900 dark:text-zinc-50">
            {view.heading}
          </h3>
          <span className="text-xs whitespace-nowrap text-zinc-500 dark:text-zinc-400">{view.rangeLabel}</span>
        </div>

        <div>
          <p className="text-[26px] leading-tight font-semibold tracking-tight text-zinc-900 tabular-nums dark:text-zinc-50">
            {view.bigValue}
            <span className="ml-1 text-[13px] font-medium tracking-normal text-zinc-500 dark:text-zinc-400">
              {view.bigSuffix}
            </span>
          </p>
          <p className="mt-1 text-[13px] text-zinc-600 dark:text-zinc-400">{view.title}</p>
          <p className="text-[13px] text-zinc-900 dark:text-zinc-100">{view.status}</p>
        </div>

        {view.showBar ? (
          <div
            role="progressbar"
            aria-label="Progress toward the weekly total"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(view.progress * 100)}
            className="h-2.5 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800"
          >
            <div
              className="h-full rounded-full bg-emerald-700 transition-[width] duration-300 motion-reduce:transition-none dark:bg-emerald-500"
              style={{ width: `${view.progress * 100}%` }}
            />
          </div>
        ) : null}

        <StepDayDots days={view.days} onPickDay={onLogDay} />

        {view.state === "active" && todayKey ? (
          <button type="button" className={primaryButton} onClick={() => onLogDay(todayKey)}>
            Log today’s steps
          </button>
        ) : null}
        {view.repeatLabel ? (
          <button type="button" className={primaryButton} disabled={busy} onClick={onRepeat}>
            {view.repeatLabel}
          </button>
        ) : null}
        {view.state !== "active" && view.nextWeekSet ? (
          <p className="text-[13px] text-zinc-600 dark:text-zinc-400">Next week’s challenge is set.</p>
        ) : null}

        <div className="-mb-2 flex items-center justify-between gap-2">
          {view.today ? (
            <p className="flex min-w-0 flex-wrap items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
              <span>Today: {view.today.value}</span>
              {view.today.source ? (
                <span className={view.today.synced ? sourceChip : typedChip}>{view.today.source}</span>
              ) : null}
            </p>
          ) : (
            <span />
          )}
          <button type="button" className={cn(ghostButton, "-mr-3 shrink-0")} disabled={busy} onClick={onEdit}>
            {view.state === "ended" ? "Try a different one" : "Edit"}
          </button>
        </div>
      </div>
    </section>
  );
}

/** No challenge running: one calm row, no pressure. */
function StartChallengeEntry({ onStart }: { onStart: () => void }) {
  return (
    <button
      type="button"
      onClick={onStart}
      className="flex min-h-14 w-full items-center gap-3 rounded-2xl border border-dashed border-zinc-300 px-4 py-3 text-left hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
    >
      <span
        className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
        aria-hidden
      >
        <Footprints className="size-[18px]" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-semibold text-zinc-900 dark:text-zinc-50">Start a step challenge</span>
        <span className="block text-[13px] text-zinc-500 dark:text-zinc-400">
          A weekly target with room for off days.
        </span>
      </span>
      <ChevronRight className="size-4 shrink-0 text-zinc-400" aria-hidden />
    </button>
  );
}

/**
 * The Progress page's top cards before the redesign: the This week card with the
 * momentum headline, and the two streak tiles. Shown when the `progress-redesign`
 * flag is off. Delete this file once the new design is kept for good.
 */
import type { MovementGoalStatus } from "@/lib/movement-insights";
import type { WeekMomentum } from "@/lib/progress-insights";
import type { WeekGoalStatus } from "@/lib/progress-types";
import { cn } from "@/lib/utils";

const card = "rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950";
const label = "text-xs font-medium tracking-wide text-zinc-500 uppercase dark:text-zinc-400";

/** This week's workouts against the goal, the nudge, and active days. */
export function ClassicThisWeekCard({
  week,
  momentum,
  movement,
}: {
  week: WeekGoalStatus;
  momentum: WeekMomentum;
  movement: MovementGoalStatus;
}) {
  const segments = Array.from({ length: week.target }, (_, i) => i < week.completed);
  return (
    <section aria-labelledby="this-week-heading" className={cn(card, "flex flex-col gap-3")}>
      <h2 id="this-week-heading" className={label}>
        This week
      </h2>
      <p className="flex items-baseline gap-2">
        <span className="font-mono text-4xl font-medium tracking-tight text-zinc-900 dark:text-zinc-50">
          {week.completed}
        </span>
        <span className="text-[15px] text-zinc-600 dark:text-zinc-400">
          of {week.target} workouts
        </span>
      </p>
      <div
        className="grid gap-1"
        style={{ gridTemplateColumns: `repeat(${segments.length}, minmax(0, 1fr))` }}
        aria-hidden
      >
        {segments.map((done, i) => (
          <span
            key={i}
            className={cn("h-2 rounded-full", done ? "bg-emerald-700 dark:bg-emerald-500" : "bg-zinc-200 dark:bg-zinc-800")}
          />
        ))}
      </div>
      <div>
        <p className="text-[15px] font-medium text-zinc-900 dark:text-zinc-50">{momentum.title}</p>
        <p className="mt-0.5 text-[13px] text-zinc-600 dark:text-zinc-400">{momentum.detail}</p>
      </div>
      <div className="flex items-center gap-2.5 border-t border-zinc-100 pt-3 text-[13px] dark:border-zinc-800">
        <span className="flex-1 text-zinc-700 dark:text-zinc-300">Active days (workouts or activities)</span>
        <span className="font-mono text-zinc-900 dark:text-zinc-100">
          {movement.completed} / {movement.target}
        </span>
      </div>
    </section>
  );
}

/** Weeks in a row hitting the weekly goal. */
export function ClassicStreakTiles({ current, longest }: { current: number; longest: number }) {
  const tile = "rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950";
  const weeks = (n: number) => `${n} wk`;
  return (
    <dl className="grid grid-cols-2 gap-2">
      <div className={cn(tile, "flex flex-col-reverse")}>
        <dt className="text-xs text-zinc-500 dark:text-zinc-400">Goal streak</dt>
        <dd className="font-mono text-2xl font-medium text-zinc-900 dark:text-zinc-50">{weeks(current)}</dd>
      </div>
      <div className={cn(tile, "flex flex-col-reverse")}>
        <dt className="text-xs text-zinc-500 dark:text-zinc-400">Longest streak</dt>
        <dd className="font-mono text-2xl font-medium text-zinc-900 dark:text-zinc-50">{weeks(longest)}</dd>
      </div>
    </dl>
  );
}

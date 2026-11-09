import type { MovementGoalStatus } from "@/lib/movement-insights";
import type { WeekMomentum } from "@/lib/progress-insights";
import type { Milestone, PersonalRecord, WeekGoalStatus } from "@/lib/progress-types";
import { addDaysToDateKey } from "@/lib/calendar-views";
import { formatLocalDateKey } from "@/lib/workout-date";
import { cn } from "@/lib/utils";

const card = "rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950";
const label = "text-xs font-medium tracking-wide text-zinc-500 uppercase dark:text-zinc-400";

/** This week's workouts against the goal, the nudge, and active days. */
export function ThisWeekCard({
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
export function StreakTiles({ current, longest }: { current: number; longest: number }) {
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

/** Best set per main lift. A lift set in the last two weeks gets a "New PR" badge. */
export function StrengthCard({ lifts, todayKey }: { lifts: PersonalRecord[]; todayKey: string }) {
  const recentKey = addDaysToDateKey(todayKey, -14);
  return (
    <section aria-labelledby="strength-heading" className={cn(card, "flex flex-col gap-2.5")}>
      <div className="flex items-baseline justify-between">
        <h2 id="strength-heading" className="text-[15px] font-semibold text-zinc-900 dark:text-zinc-50">
          Strength
        </h2>
        <span className="text-xs text-zinc-500">Best sets</span>
      </div>
      {lifts.length === 0 ? (
        <p className="text-[13px] text-zinc-500">Log a few weighted sets and your best lifts show up here.</p>
      ) : (
        <ul className="flex flex-col">
          {lifts.map((lift) => (
            <li
              key={lift.exerciseId}
              className="flex min-h-12 items-center gap-2.5 border-t border-zinc-100 py-2 first:border-t-0 dark:border-zinc-800"
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-zinc-900 dark:text-zinc-50">
                  {lift.exerciseName}
                </span>
                <span className="block text-xs text-zinc-500">{formatLocalDateKey(lift.dateKey)}</span>
              </span>
              {lift.dateKey >= recentKey ? (
                <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-300">
                  New PR
                </span>
              ) : null}
              <span className="font-mono text-sm text-zinc-900 dark:text-zinc-100">
                {lift.weight} × {lift.reps}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** Earned milestones, then the next one to aim for. */
export function MilestonesRow({ milestones }: { milestones: Milestone[] }) {
  const earned = milestones.filter((m) => m.achieved);
  const next = milestones.find((m) => !m.achieved);
  if (earned.length === 0 && !next) return null;
  return (
    <section aria-labelledby="milestones-heading" className="flex flex-col gap-2">
      <h2 id="milestones-heading" className={label}>
        Milestones
      </h2>
      <ul className="flex flex-wrap gap-1.5">
        {earned.map((m) => (
          <li
            key={m.id}
            title={m.description}
            className="inline-flex h-8 items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 text-xs font-medium text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-300"
          >
            {m.title}
          </li>
        ))}
        {next ? (
          <li
            title={next.description}
            className="inline-flex h-8 items-center rounded-full border border-zinc-200 bg-white px-3 text-xs font-medium text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950"
          >
            Next: {next.title}
          </li>
        ) : null}
      </ul>
    </section>
  );
}

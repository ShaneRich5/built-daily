import Link from "next/link";
import { RecentWorkoutsList } from "@/components/recent-workouts-list";
import { WorkoutPickAndStart } from "@/components/workout-pick-and-start";

export default function HomePage() {
  return (
    <div className="flex flex-1 flex-col gap-8">
      <header className="space-y-1">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="text-sm font-medium text-zinc-500">Workout journal</p>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl dark:text-zinc-50">
              Built Daily
            </h1>
          </div>
          <Link
            href="/planner"
            className="shrink-0 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:bg-zinc-900"
          >
            Planner
          </Link>
        </div>
      </header>

      <WorkoutPickAndStart />

      <section className="space-y-3" aria-labelledby="recent-heading">
        <h2
          id="recent-heading"
          className="text-sm font-semibold uppercase tracking-wide text-zinc-500"
        >
          Recent workouts
        </h2>
        <RecentWorkoutsList />
      </section>

      <section
        className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950"
        aria-labelledby="streak-heading"
      >
        <h2
          id="streak-heading"
          className="text-sm font-semibold text-zinc-900 dark:text-zinc-50"
        >
          Current streak
        </h2>
        <p className="mt-2 text-3xl font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
          —
        </p>
        <p className="mt-1 text-sm text-zinc-500">
          Streak tracking will appear here.
        </p>
      </section>
    </div>
  );
}

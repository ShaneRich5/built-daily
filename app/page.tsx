import Link from "next/link";
import { GroupsHomeTeaser } from "@/components/groups-home-teaser";
import { HomeWorkoutActivity } from "@/components/home-workout-activity";
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
          <div className="flex shrink-0 flex-wrap gap-2">
            <Link
              href="/progress"
              className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:bg-zinc-900"
            >
              Progress
            </Link>
            <Link
              href="/groups"
              className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:bg-zinc-900"
            >
              Groups
            </Link>
            <Link
              href="/planner"
              className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:bg-zinc-900"
            >
              Planner
            </Link>
          </div>
        </div>
      </header>

      <WorkoutPickAndStart />

      <HomeWorkoutActivity />

      <section className="space-y-3" aria-labelledby="recent-heading">
        <h2
          id="recent-heading"
          className="text-sm font-semibold uppercase tracking-wide text-zinc-500"
        >
          Recent workouts
        </h2>
        <RecentWorkoutsList />
      </section>

      <GroupsHomeTeaser />
    </div>
  );
}

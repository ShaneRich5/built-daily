import { GroupsHomeTeaser } from "@/components/groups-home-teaser";
import { HomeStartWorkout } from "@/components/home-start-workout";
import { HomeTimeline } from "@/components/home-timeline";
import { HomeWeekStrip } from "@/components/home-week-strip";
import { HomeWorkoutActivity } from "@/components/home-workout-activity";

export default function HomePage() {
  return (
    <div className="flex flex-1 flex-col gap-8">
      <header className="space-y-1">
        <p className="text-sm font-medium text-zinc-500">Workout journal</p>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl dark:text-zinc-50">
          Built Daily
        </h1>
      </header>

      <HomeStartWorkout />

      <HomeWeekStrip />

      <HomeWorkoutActivity />

      <HomeTimeline />

      <GroupsHomeTeaser />
    </div>
  );
}

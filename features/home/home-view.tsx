import type { ReactNode } from "react";
import { HomeCatchUp } from "@/features/home/home-catch-up";
import { HomeRecent } from "@/features/home/home-recent";
import { HomeStartCard } from "@/features/home/home-start-card";
import { HomeTogetherCard, type HomeTogether } from "@/features/home/home-together-card";
import { HomeWeek } from "@/features/home/home-week";
import { dateFromLocalDateKey } from "@/lib/workout-date";
import type {
  HomeConsistency,
  HomeInProgress,
  HomePlanned,
  HomeRecentItem,
  HomeTemplate,
  HomeWeekDay,
  HomeWeekGoal,
} from "@/features/home/home-model";
import type { BoardCard } from "@/features/planner/week-board-model";

export type HomeViewProps = {
  todayKey: string;
  /** The account button (or a sign-in link) in the top-right corner. */
  account: ReactNode;
  loaded: boolean;
  weekGoal: HomeWeekGoal;
  consistency: HomeConsistency;
  planned: HomePlanned | null;
  inProgress: HomeInProgress | null;
  templates: HomeTemplate[];
  week: HomeWeekDay[];
  recent: HomeRecentItem[];
  onLogActivity: () => void;
  /** Today's plan together, if any (G9). */
  together?: HomeTogether | null;
  /** A planned workout that slid past, with ways to fit it back in. */
  catchUp: {
    missed: BoardCard;
    busy: boolean;
    onDoToday: () => void;
    onPickDay: () => void;
    onSkip: () => void;
  } | null;
};

function todayHeading(todayKey: string): string {
  const d = dateFromLocalDateKey(todayKey);
  if (!d) return "";
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  }).format(d);
}

export function HomeHeader({ todayKey, account }: { todayKey: string; account: ReactNode }) {
  return (
    <header className="flex items-center justify-between gap-3">
      <div>
        <p className="text-xs font-medium tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
          {todayHeading(todayKey)}
        </p>
        <h1 className="mt-0.5 text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          Built Daily
        </h1>
      </div>
      {account}
    </header>
  );
}

function HomeSkeleton() {
  return (
    <div className="flex flex-col gap-5" aria-busy="true" aria-label="Loading">
      <div className="h-64 animate-pulse rounded-2xl bg-zinc-100 dark:bg-zinc-900" />
      <div className="h-96 animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-900" />
      <div className="h-40 animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-900" />
    </div>
  );
}

/** Home, signed in: start or resume, this week (goal, streak, last 16 weeks), recent. */
export function HomeView(props: HomeViewProps) {
  return (
    <div className="flex flex-1 flex-col gap-5">
      <HomeHeader todayKey={props.todayKey} account={props.account} />
      {props.loaded ? (
        <>
          {props.catchUp && !props.inProgress ? (
            <HomeCatchUp todayKey={props.todayKey} {...props.catchUp} />
          ) : null}
          {props.together && !props.inProgress ? <HomeTogetherCard together={props.together} /> : null}
          <HomeStartCard
            todayKey={props.todayKey}
            planned={props.planned}
            inProgress={props.inProgress}
            templates={props.templates}
            onLogActivity={props.onLogActivity}
          />
          <HomeWeek
            todayKey={props.todayKey}
            days={props.week}
            goal={props.weekGoal}
            consistency={props.consistency}
          />
          <HomeRecent items={props.recent} />
        </>
      ) : (
        <HomeSkeleton />
      )}
    </div>
  );
}

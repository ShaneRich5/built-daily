import { Target } from "lucide-react";
import type { ComponentProps } from "react";
import { ProgressHeatmap } from "@/components/progress-heatmap";
import type { MovementGoalStatus } from "@/lib/movement-insights";
import type {
  Milestone,
  PersonalRecord,
  SavedBodyWeightEntry,
  WeekGoalStatus,
} from "@/lib/progress-types";
import { BodyWeightCard } from "@/features/progress/body-weight-card";
import type { ProgressHeatmapStyle } from "@/flags";
import type { HomeConsistency, HomeWeekDay } from "@/features/home/home-model";
import { MilestonesRow, StrengthCard, ThisWeekCard } from "@/features/progress/progress-cards";

export type ProgressViewProps = {
  todayKey: string;
  /**
   * From the `progress-heatmap` flag: the 16-week chart inside This week, or the
   * year-long Consistency heatmap below it. Only one shows.
   */
  heatmapStyle: ProgressHeatmapStyle;
  week: WeekGoalStatus;
  movementWeek: MovementGoalStatus;
  /** Sun–Sat circles, same as Home. */
  weekDays: HomeWeekDay[];
  /** Streak and the last 16 weeks, same as Home. */
  consistency: HomeConsistency;
  heatmap: Omit<ComponentProps<typeof ProgressHeatmap>, "todayKey" | "footer">;
  lifts: PersonalRecord[];
  weights: SavedBodyWeightEntry[];
  goalWeightLbs: number | null;
  milestones: Milestone[];
  onOpenGoals: () => void;
  onLogWeight?: (dateKey: string, weightLbs: number) => Promise<unknown>;
};

/** Am I showing up? This week first, then (per the flag) the 16-week chart or the year heatmap, strength, weight, milestones. */
export function ProgressView(props: ProgressViewProps) {
  return (
    <div className="flex flex-1 flex-col gap-4">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Progress</h1>
          <p className="mt-0.5 text-[13px] text-zinc-500 dark:text-zinc-400">Showing up beats perfect.</p>
        </div>
        <button
          type="button"
          onClick={props.onOpenGoals}
          className="inline-flex h-10 items-center gap-1.5 rounded-[10px] border border-zinc-200 bg-white px-3 text-[13px] font-medium text-zinc-900 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:bg-zinc-900"
        >
          <Target className="size-3.5" aria-hidden />
          Goals
        </button>
      </header>

      <ThisWeekCard
        todayKey={props.todayKey}
        week={props.week}
        movement={props.movementWeek}
        days={props.weekDays}
        consistency={props.consistency}
        showChart={props.heatmapStyle === "weeks"}
      />
      {props.heatmapStyle === "year" ? (
        <ProgressHeatmap {...props.heatmap} todayKey={props.todayKey} />
      ) : null}
      <StrengthCard lifts={props.lifts} todayKey={props.todayKey} />
      <BodyWeightCard
        entries={props.weights}
        goalWeightLbs={props.goalWeightLbs}
        todayKey={props.todayKey}
        onLog={props.onLogWeight}
      />
      <MilestonesRow milestones={props.milestones} />
    </div>
  );
}

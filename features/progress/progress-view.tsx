import { Target } from "lucide-react";
import type { ComponentProps } from "react";
import { ProgressHeatmap } from "@/components/progress-heatmap";
import type { MovementGoalStatus } from "@/lib/movement-insights";
import type { WeekMomentum } from "@/lib/progress-insights";
import type {
  Milestone,
  PersonalRecord,
  SavedBodyWeightEntry,
  WeekGoalStatus,
} from "@/lib/progress-types";
import { BodyWeightCard } from "@/features/progress/body-weight-card";
import { MilestonesRow, StrengthCard, StreakTiles, ThisWeekCard } from "@/features/progress/progress-cards";

export type ProgressViewProps = {
  todayKey: string;
  week: WeekGoalStatus;
  momentum: WeekMomentum;
  movementWeek: MovementGoalStatus;
  goalStreak: { current: number; longest: number };
  heatmap: Omit<ComponentProps<typeof ProgressHeatmap>, "todayKey" | "footer">;
  lifts: PersonalRecord[];
  weights: SavedBodyWeightEntry[];
  goalWeightLbs: number | null;
  milestones: Milestone[];
  onOpenGoals: () => void;
  onLogWeight?: (dateKey: string, weightLbs: number) => Promise<unknown>;
};

/** Am I showing up? This week first, then streaks, the chart, strength, weight, milestones. */
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

      <ThisWeekCard week={props.week} momentum={props.momentum} movement={props.movementWeek} />
      <StreakTiles current={props.goalStreak.current} longest={props.goalStreak.longest} />
      <ProgressHeatmap {...props.heatmap} todayKey={props.todayKey} />
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

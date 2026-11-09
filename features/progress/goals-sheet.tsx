"use client";

import { useState } from "react";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import {
  MOVEMENT_GOAL_OPTIONS,
  WEEKLY_GOAL_OPTIONS,
  type MovementGoalTarget,
  type ProgressSettingsDoc,
  type WeeklyGoalTarget,
} from "@/lib/progress-types";
import { cn } from "@/lib/utils";

export type GoalsPatch = Pick<ProgressSettingsDoc, "weeklyGoal" | "movementGoalDays" | "goalWeightLbs">;

type GoalsSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settings: ProgressSettingsDoc;
  onSave: (patch: GoalsPatch) => Promise<boolean>;
};

const optionLabel = (n: number) => (n === 7 ? "Daily" : String(n));

function Choices<T extends number>({
  options,
  value,
  onChange,
}: {
  options: readonly T[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
      {options.map((n) => (
        <button
          key={n}
          type="button"
          aria-pressed={value === n}
          onClick={() => onChange(n)}
          className={cn(
            "h-11 rounded-[10px] border text-sm font-semibold",
            value === n
              ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
              : "border-zinc-200 bg-white text-zinc-700 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-300",
          )}
        >
          {optionLabel(n)}
        </button>
      ))}
    </div>
  );
}

/** Weekly workouts, active days and an optional goal weight, in one place. */
export function GoalsSheet({ open, onOpenChange, settings, onSave }: GoalsSheetProps) {
  const [weeklyGoal, setWeeklyGoal] = useState<WeeklyGoalTarget>(settings.weeklyGoal);
  const [movementGoalDays, setMovementGoalDays] = useState<MovementGoalTarget>(settings.movementGoalDays);
  const [goalWeight, setGoalWeight] = useState(settings.goalWeightLbs != null ? String(settings.goalWeightLbs) : "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    const trimmed = goalWeight.trim();
    const weight = trimmed ? Number(trimmed) : null;
    if (weight !== null && (!Number.isFinite(weight) || weight <= 0 || weight > 1000)) {
      setError("Enter a goal weight in pounds, or leave it blank.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const ok = await onSave({
        weeklyGoal,
        movementGoalDays,
        goalWeightLbs: weight === null ? null : Math.round(weight * 10) / 10,
      });
      if (ok) onOpenChange(false);
      else setError("Couldn’t save. Check that you’re signed in.");
    } catch {
      setError("Couldn’t save. Try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Goals"
      description="Pick what feels doable. You can change these any time."
      footer={
        <button
          type="button"
          disabled={saving}
          onClick={() => void save()}
          className="h-12 w-full rounded-lg bg-emerald-700 text-[15px] font-semibold text-white hover:bg-emerald-800 disabled:opacity-60 dark:bg-emerald-600"
        >
          {saving ? "Saving…" : "Save goals"}
        </button>
      }
    >
      <div className="flex flex-col gap-6 px-4 pt-1 pb-6">
        <fieldset className="flex flex-col gap-2">
          <legend className="pb-2 text-[15px] font-semibold text-zinc-900 dark:text-zinc-50">Workouts per week</legend>
          <Choices options={WEEKLY_GOAL_OPTIONS} value={weeklyGoal} onChange={setWeeklyGoal} />
          <p className="text-xs text-zinc-500">Your streak counts the weeks that hit this. Groups see it too.</p>
        </fieldset>
        <fieldset className="flex flex-col gap-2">
          <legend className="pb-2 text-[15px] font-semibold text-zinc-900 dark:text-zinc-50">Active days per week</legend>
          <Choices options={MOVEMENT_GOAL_OPTIONS} value={movementGoalDays} onChange={setMovementGoalDays} />
          <p className="text-xs text-zinc-500">Walks, rides and sports count. Doesn’t change your workout goal.</p>
        </fieldset>
        <div className="flex flex-col gap-2">
          <label htmlFor="goal-weight" className="text-[15px] font-semibold text-zinc-900 dark:text-zinc-50">
            Goal weight <span className="font-normal text-zinc-500">(optional, lb)</span>
          </label>
          <input
            id="goal-weight"
            inputMode="decimal"
            value={goalWeight}
            onChange={(e) => setGoalWeight(e.target.value)}
            placeholder="Leave blank for none"
            className="h-11 rounded-lg border border-zinc-200 bg-zinc-50 px-3 font-mono text-base text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-900/10 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          />
        </div>
        {error ? (
          <p role="alert" className="text-sm text-red-700 dark:text-red-400">
            {error}
          </p>
        ) : null}
      </div>
    </BottomSheet>
  );
}

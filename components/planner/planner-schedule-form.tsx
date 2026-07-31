"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatPlannerDayHeading } from "@/lib/planner-list-items";
import { STARTER_TEMPLATE_DEFINITIONS } from "@/lib/starter-templates";
import type { SavedWorkoutPlan } from "@/lib/workout-plan-repository";

export type PlanPickerValue = "" | `tpl:${string}` | `starter:${string}`;

type PlannerScheduleFormProps = {
  dateKey: string;
  isFutureOrToday: boolean;
  plans: SavedWorkoutPlan[];
  adding: boolean;
  disabled: boolean;
  planPick: PlanPickerValue;
  reminderLabel: string;
  onPlanPickChange: (value: PlanPickerValue) => void;
  onReminderChange: (value: string) => void;
  onAdd: () => void;
  onPickTomorrow: () => void;
  onPickNextEmpty: () => void;
  onLogActivity: () => void;
};

export function PlannerScheduleForm({
  dateKey,
  isFutureOrToday,
  plans,
  adding,
  disabled,
  planPick,
  reminderLabel,
  onPlanPickChange,
  onReminderChange,
  onAdd,
  onPickTomorrow,
  onPickNextEmpty,
  onLogActivity,
}: PlannerScheduleFormProps) {
  const [templateQuery, setTemplateQuery] = useState("");

  const filteredPlans = useMemo(() => {
    const q = templateQuery.trim().toLowerCase();
    if (!q) return plans;
    return plans.filter((p) => p.plan.name.toLowerCase().includes(q));
  }, [plans, templateQuery]);

  const filteredStarters = useMemo(() => {
    const q = templateQuery.trim().toLowerCase();
    if (!q) return STARTER_TEMPLATE_DEFINITIONS;
    return STARTER_TEMPLATE_DEFINITIONS.filter((s) =>
      s.name.toLowerCase().includes(q),
    );
  }, [templateQuery]);

  const canAdd = planPick !== "" || reminderLabel.trim().length > 0;

  return (
    <section
      className={`space-y-3 rounded-xl border p-4 ${
        isFutureOrToday
          ? "border-sky-200 bg-sky-50/50 dark:border-sky-900 dark:bg-sky-950/20"
          : "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950"
      }`}
      aria-labelledby="plan-for-heading"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2
            id="plan-for-heading"
            className="text-sm font-semibold text-zinc-900 dark:text-zinc-50"
          >
            Plan for {formatPlannerDayHeading(dateKey)}
          </h2>
          <p className="mt-0.5 text-xs text-zinc-500">
            {isFutureOrToday
              ? "Schedule a workout ahead so you can project the week."
              : "Add a plan or reminder to this past day, or log an activity."}
          </p>
        </div>
        {isFutureOrToday ? (
          <div className="flex flex-wrap gap-1.5">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 text-xs"
              onClick={onPickTomorrow}
            >
              Tomorrow
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 text-xs"
              onClick={onPickNextEmpty}
            >
              Next open day
            </Button>
          </div>
        ) : null}
      </div>

      <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600 dark:text-zinc-400">
        Search templates
        <Input
          type="search"
          placeholder="Filter templates…"
          value={templateQuery}
          onChange={(e) => setTemplateQuery(e.target.value)}
          className="h-10"
        />
      </label>

      <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600 dark:text-zinc-400">
        Template or starter
        <select
          className="h-11 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
          value={planPick}
          onChange={(e) => onPlanPickChange(e.target.value as PlanPickerValue)}
        >
          <option value="">Choose one (optional)</option>
          <optgroup label="Your templates">
            {filteredPlans.length === 0 ? (
              <option value="" disabled>
                No matching templates
              </option>
            ) : (
              filteredPlans.map((p) => (
                <option key={p.id} value={`tpl:${p.id}`}>
                  {p.plan.name}
                </option>
              ))
            )}
          </optgroup>
          <optgroup label="Starters">
            {filteredStarters.map((s) => (
              <option key={s.id} value={`starter:${s.id}`}>
                {s.name}
              </option>
            ))}
          </optgroup>
        </select>
      </label>

      <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600 dark:text-zinc-400">
        Or reminder only
        <Input
          placeholder="e.g. Rest, mobility"
          value={reminderLabel}
          onChange={(e) => onReminderChange(e.target.value)}
          maxLength={200}
          className="h-11"
        />
      </label>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button
          type="button"
          className="h-11 flex-1"
          disabled={disabled || adding || !canAdd}
          onClick={onAdd}
        >
          {adding ? "Adding…" : "Add to calendar"}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-11 flex-1"
          disabled={disabled}
          onClick={onLogActivity}
        >
          Log activity
        </Button>
      </div>
    </section>
  );
}

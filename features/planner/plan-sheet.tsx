"use client";

import { useState } from "react";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { addDaysToDateKey } from "@/lib/calendar-views";
import type { NewScheduledWorkoutInput } from "@/lib/planner-repository";
import { STARTER_TEMPLATE_DEFINITIONS } from "@/lib/starter-templates";
import { cn } from "@/lib/utils";
import { NOTE_LIMITS } from "@/lib/workout-types";
import type { SavedWorkoutPlan } from "@/lib/workout-plan-repository";
import { agendaHeading } from "@/features/planner/planner-model";

type PlanOption = {
  id: string;
  name: string;
  meta: string;
  planId: string | null;
  exerciseIds: string[];
};

const REMINDER_ID = "reminder";

function planOptions(plans: SavedWorkoutPlan[]): PlanOption[] {
  const count = (n: number) => `${n} exercise${n === 1 ? "" : "s"}`;
  return [
    ...plans.map(({ id, plan }) => ({
      id: `tpl:${id}`,
      name: plan.name,
      meta: `Your template · ${count(plan.lines.length)}`,
      planId: id,
      exerciseIds: plan.lines.map((line) => line.exerciseId),
    })),
    ...STARTER_TEMPLATE_DEFINITIONS.map((starter) => ({
      id: `starter:${starter.id}`,
      name: starter.name,
      meta: `Starter · ${count(starter.exerciseIds.length)}`,
      planId: starter.id,
      exerciseIds: [...starter.exerciseIds],
    })),
  ];
}

type PlanSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  todayKey: string;
  /** The day selected on the calendar when the sheet opened. */
  initialDateKey: string;
  plans: SavedWorkoutPlan[];
  onPlan: (input: NewScheduledWorkoutInput) => Promise<void>;
};

const chip =
  "h-10 rounded-full border px-3.5 text-[13px] font-medium transition-colors";

/** Pick a day and a template (or just a reminder) and put it on the calendar. */
export function PlanSheet({ open, onOpenChange, todayKey, initialDateKey, plans, onPlan }: PlanSheetProps) {
  const options = planOptions(plans);
  const [dateKey, setDateKey] = useState(initialDateKey < todayKey ? todayKey : initialDateKey);
  const [picked, setPicked] = useState<string>(options[0]?.id ?? REMINDER_ID);
  const [reminder, setReminder] = useState("");
  const [saving, setSaving] = useState(false);

  const tomorrowKey = addDaysToDateKey(todayKey, 1);
  const dayChips = [
    { key: todayKey, label: "Today" },
    { key: tomorrowKey, label: "Tomorrow" },
    ...(initialDateKey > tomorrowKey ? [{ key: initialDateKey, label: agendaHeading(initialDateKey, todayKey) }] : []),
  ];
  const customDay = !dayChips.some((c) => c.key === dateKey);
  const option = options.find((o) => o.id === picked);
  const dayName = agendaHeading(dateKey, todayKey).replace(/^(Today|Tomorrow) · /, "");
  const label = option ? option.name : reminder.trim() || "Workout";

  const submit = async () => {
    setSaving(true);
    try {
      await onPlan({
        dateKey,
        label: label.slice(0, NOTE_LIMITS.title),
        planId: option?.planId ?? null,
        exerciseIds: option?.exerciseIds ?? [],
      });
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Plan a workout"
      footer={
        <button
          type="button"
          disabled={saving}
          onClick={() => void submit()}
          className="h-12 w-full rounded-lg bg-emerald-700 text-[15px] font-semibold text-white hover:bg-emerald-800 disabled:opacity-60 dark:bg-emerald-600"
        >
          {saving ? "Planning…" : option ? `Plan ${option.name} for ${dayName}` : `Add reminder for ${dayName}`}
        </button>
      }
    >
      <div className="flex flex-col gap-5 px-4 pt-1 pb-6">
        <fieldset className="flex flex-col gap-2">
          <legend className="pb-2 text-xs font-medium tracking-wide text-zinc-500 uppercase">When</legend>
          <div className="flex flex-wrap gap-1.5">
            {dayChips.map((c) => (
              <button
                key={c.key}
                type="button"
                aria-pressed={dateKey === c.key}
                onClick={() => setDateKey(c.key)}
                className={cn(
                  chip,
                  dateKey === c.key
                    ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                    : "border-zinc-200 bg-white text-zinc-700 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-300",
                )}
              >
                {c.label}
              </button>
            ))}
            <label
              className={cn(
                chip,
                "relative inline-flex items-center",
                customDay
                  ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                  : "border-zinc-200 bg-white text-zinc-700 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-300",
              )}
            >
              {customDay ? dayName : "Pick a date…"}
              <input
                type="date"
                min={todayKey}
                value={dateKey}
                onChange={(e) => e.target.value && setDateKey(e.target.value)}
                className="absolute inset-0 cursor-pointer opacity-0"
                aria-label="Pick a date"
              />
            </label>
          </div>
        </fieldset>

        <fieldset className="flex flex-col gap-2">
          <legend className="pb-2 text-xs font-medium tracking-wide text-zinc-500 uppercase">What</legend>
          <div
            role="radiogroup"
            aria-label="Workout"
            className="flex flex-col overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800"
          >
            {[...options, { id: REMINDER_ID, name: "Just a reminder", meta: "No exercises — decide on the day" }].map(
              (o) => {
                const checked = picked === o.id;
                return (
                  <button
                    key={o.id}
                    type="button"
                    role="radio"
                    aria-checked={checked}
                    onClick={() => setPicked(o.id)}
                    className={cn(
                      "flex min-h-13 items-center gap-3 border-b border-zinc-100 px-3 text-left last:border-b-0 dark:border-zinc-800",
                      checked ? "bg-emerald-50 dark:bg-emerald-950/40" : "bg-white dark:bg-zinc-950",
                    )}
                  >
                    <span
                      className={cn(
                        "size-5 shrink-0 rounded-full",
                        checked ? "border-[6px] border-emerald-700 dark:border-emerald-500" : "border-[1.5px] border-zinc-300 dark:border-zinc-600",
                      )}
                      aria-hidden
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] font-medium text-zinc-900 dark:text-zinc-50">{o.name}</span>
                      <span className="block truncate text-xs text-zinc-500 dark:text-zinc-400">{o.meta}</span>
                    </span>
                  </button>
                );
              },
            )}
          </div>
          {picked === REMINDER_ID ? (
            <div className="flex flex-col gap-1.5 pt-1">
              <label htmlFor="plan-reminder" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Reminder
              </label>
              <input
                id="plan-reminder"
                value={reminder}
                maxLength={NOTE_LIMITS.title}
                onChange={(e) => setReminder(e.target.value)}
                placeholder="Workout, yoga, a long walk…"
                className="h-11 rounded-lg border border-zinc-200 bg-white px-3 text-base text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-900/10 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
              />
            </div>
          ) : null}
        </fieldset>
      </div>
    </BottomSheet>
  );
}

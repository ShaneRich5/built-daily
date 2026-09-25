"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { buildWeekCalendarCells } from "@/lib/calendar-views";
import { addScheduledWorkout } from "@/lib/planner-repository";
import { setWeeklyGoal } from "@/lib/progress-settings-repository";
import { WEEKLY_GOAL_OPTIONS, type WeeklyGoalTarget } from "@/lib/progress-types";
import { STARTER_TEMPLATE_DEFINITIONS } from "@/lib/starter-templates";
import { setOnboardingCompleted } from "@/lib/user-profile-repository";
import { dateFromLocalDateKey, localDateKeyFromMs } from "@/lib/workout-date";

type Step = "goal" | "days" | "templates";

function goalLabel(n: WeeklyGoalTarget): string {
  return n === 7 ? "Every day" : `${n}x a week`;
}

function dayLabel(dateKey: string, todayKey: string): string {
  if (dateKey === todayKey) return "Today";
  const d = dateFromLocalDateKey(dateKey);
  if (!d) return dateKey;
  const weekday = new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(
    d,
  );
  return `${weekday} ${d.getDate()}`;
}

export function OnboardingFlow() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("goal");
  const [weeklyGoal, setLocalWeeklyGoal] = useState<WeeklyGoalTarget>(3);
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [templateByDay, setTemplateByDay] = useState<Record<string, string>>(
    {},
  );
  const [saving, setSaving] = useState(false);

  const [todayKey] = useState(() => localDateKeyFromMs(Date.now()));
  const remainingDays = useMemo(
    () =>
      buildWeekCalendarCells(todayKey, todayKey).filter(
        (c) => c.dateKey >= todayKey,
      ),
    [todayKey],
  );
  const maxDays = Math.min(weeklyGoal, remainingDays.length);

  const finish = async (
    goal: WeeklyGoalTarget | null,
    days: string[],
    templates: Record<string, string>,
  ) => {
    setSaving(true);
    try {
      if (goal != null) {
        await setWeeklyGoal(goal);
      }
      for (const dateKey of days) {
        const templateId = templates[dateKey];
        const template = STARTER_TEMPLATE_DEFINITIONS.find(
          (t) => t.id === templateId,
        );
        if (!template) continue;
        await addScheduledWorkout({
          dateKey,
          label: template.name,
          planId: template.id,
          exerciseIds: [...template.exerciseIds],
        });
      }
      await setOnboardingCompleted();
      router.replace("/");
    } finally {
      setSaving(false);
    }
  };

  const handleSkip = () => void finish(null, [], {});

  const toggleDay = (dateKey: string) => {
    setSelectedDays((prev) => {
      if (prev.includes(dateKey)) {
        return prev.filter((d) => d !== dateKey);
      }
      if (prev.length >= maxDays) return prev;
      return [...prev, dateKey].sort();
    });
  };

  return (
    <div className="flex flex-1 flex-col gap-6">
      <header className="space-y-1">
        <p className="text-sm font-medium text-zinc-500">
          Step {step === "goal" ? 1 : step === "days" ? 2 : 3} of 3
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl dark:text-zinc-50">
          Let&apos;s plan your first week
        </h1>
        <p className="text-sm text-zinc-500">
          Takes a minute. You can skip and do this later.
        </p>
      </header>

      {step === "goal" ? (
        <section className="space-y-4 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
          <div>
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              How many workouts a week?
            </h2>
            <p className="mt-1 text-sm text-zinc-500">
              Consistency matters more than volume — pick something you can
              actually keep up.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {WEEKLY_GOAL_OPTIONS.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setLocalWeeklyGoal(n)}
                className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
                  weeklyGoal === n
                    ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                    : "border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:bg-zinc-900"
                }`}
              >
                {goalLabel(n)}
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {step === "days" ? (
        <section className="space-y-4 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
          <div>
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              Which days this week?
            </h2>
            <p className="mt-1 text-sm text-zinc-500">
              Pick up to {maxDays} day{maxDays === 1 ? "" : "s"}. You can
              reschedule any of these later from the planner.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {remainingDays.map((cell) => {
              const selected = selectedDays.includes(cell.dateKey);
              return (
                <button
                  key={cell.dateKey}
                  type="button"
                  onClick={() => toggleDay(cell.dateKey)}
                  className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
                    selected
                      ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                      : "border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:bg-zinc-900"
                  }`}
                >
                  {dayLabel(cell.dateKey, todayKey)}
                </button>
              );
            })}
          </div>
          <p className="text-xs text-zinc-500">
            {`${selectedDays.length} / ${maxDays} selected. Leave all of them unpicked if you'd rather plan later.`}
          </p>
        </section>
      ) : null}

      {step === "templates" ? (
        <section className="space-y-4 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
          <div>
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              Pick a workout for each day
            </h2>
            <p className="mt-1 text-sm text-zinc-500">
              Starter templates — swap exercises any time from the workout
              screen.
            </p>
          </div>
          {selectedDays.length === 0 ? (
            <p className="text-sm text-zinc-500">
              No days selected — press Finish to save your goal, and plan
              days later from the planner.
            </p>
          ) : null}
          <div className="space-y-4">
            {selectedDays.map((dateKey) => (
              <div key={dateKey} className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                  {dayLabel(dateKey, todayKey)}
                </p>
                <div className="flex flex-wrap gap-2">
                  {STARTER_TEMPLATE_DEFINITIONS.map((t) => {
                    const selected = templateByDay[dateKey] === t.id;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() =>
                          setTemplateByDay((prev) => ({
                            ...prev,
                            [dateKey]: t.id,
                          }))
                        }
                        className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
                          selected
                            ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                            : "border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:bg-zinc-900"
                        }`}
                      >
                        {t.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <div className="flex items-center justify-between gap-2">
        <Button
          type="button"
          variant="ghost"
          onClick={handleSkip}
          disabled={saving}
        >
          Skip for now
        </Button>
        <div className="flex items-center gap-2">
          {step !== "goal" ? (
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                setStep(step === "templates" ? "days" : "goal")
              }
              disabled={saving}
            >
              Back
            </Button>
          ) : null}
          {step === "goal" ? (
            <Button type="button" onClick={() => setStep("days")}>
              Continue
            </Button>
          ) : null}
          {step === "days" ? (
            <Button
              type="button"
              onClick={() => {
                setTemplateByDay((prev) => {
                  const next = { ...prev };
                  for (const dateKey of selectedDays) {
                    next[dateKey] ??= STARTER_TEMPLATE_DEFINITIONS[0].id;
                  }
                  return next;
                });
                setStep("templates");
              }}
            >
              Continue
            </Button>
          ) : null}
          {step === "templates" ? (
            <Button
              type="button"
              onClick={() => void finish(weeklyGoal, selectedDays, templateByDay)}
              disabled={saving}
            >
              {saving ? "Saving…" : "Finish"}
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

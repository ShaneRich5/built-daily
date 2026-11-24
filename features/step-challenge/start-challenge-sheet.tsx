"use client";

import { Minus, Plus } from "lucide-react";
import { useState } from "react";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import {
  challengeDateKeys,
  describeChallengeRule,
} from "@/lib/challenge-evaluate";
import {
  CHALLENGE_LIMITS,
  CHALLENGE_PRESETS,
  type ChallengeLimits,
  type ChallengePeriod,
  type ChallengeRule,
} from "@/lib/challenge-types";
import { cn } from "@/lib/utils";
import {
  challengeRange,
  rangeLabel,
} from "@/features/step-challenge/step-challenge-model";
import {
  primaryButton,
  sectionLabel,
} from "@/features/step-challenge/step-challenge-ui";

type StartChallengeSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** `edit` changes the running challenge's target; `start` begins a new one. */
  mode: "start" | "edit";
  todayKey: string;
  initialRule: ChallengeRule;
  /** Fixed in `edit` mode: a running challenge keeps its week or month. */
  initialPeriod: ChallengePeriod;
  /** Resolves false (or throws) when it couldn't be saved. */
  onSubmit: (rule: ChallengeRule, period: ChallengePeriod) => Promise<boolean>;
};

const PERIODS: { period: ChallengePeriod; label: string }[] = [
  { period: "week", label: "This week" },
  { period: "month", label: "This month" },
];

/** A week or a month, three presets each, with a simple way to nudge the numbers. */
export function StartChallengeSheet({
  open,
  onOpenChange,
  mode,
  todayKey,
  initialRule,
  initialPeriod,
  onSubmit,
}: StartChallengeSheetProps) {
  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title={
        mode === "edit" ? "Change the challenge" : "Start a step challenge"
      }
    >
      {open ? (
        <ChallengeForm
          mode={mode}
          todayKey={todayKey}
          initialRule={initialRule}
          initialPeriod={initialPeriod}
          onSubmit={onSubmit}
        />
      ) : null}
    </BottomSheet>
  );
}

/** The period's limits, with day counts capped at the days it actually has. */
function limitsFor(period: ChallengePeriod, dayCount: number): ChallengeLimits {
  const limits = CHALLENGE_LIMITS[period];
  return {
    ...limits,
    daysNeeded: {
      ...limits.daysNeeded,
      max: Math.min(limits.daysNeeded.max, dayCount),
    },
    streakLength: {
      ...limits.streakLength,
      max: Math.min(limits.streakLength.max, dayCount),
    },
  };
}

function ChallengeForm({
  mode,
  todayKey,
  initialRule,
  initialPeriod,
  onSubmit,
}: Omit<StartChallengeSheetProps, "open" | "onOpenChange">) {
  const [period, setPeriod] = useState<ChallengePeriod>(initialPeriod);
  const [rule, setRule] = useState<ChallengeRule>(initialRule);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { startDate, endDate } = challengeRange(period, todayKey);
  const dayCount = challengeDateKeys(startDate, endDate).length;
  const noun = period === "month" ? "month" : "week";

  const pick = (preset: ChallengeRule) => {
    // Coming back to the kind you started with restores your own numbers.
    setRule(
      preset.kind === initialRule.kind && period === initialPeriod
        ? initialRule
        : preset,
    );
  };

  const switchPeriod = (next: ChallengePeriod) => {
    if (next === period) return;
    setPeriod(next);
    // Keep the same kind of challenge, at the new period's preset numbers.
    const preset = CHALLENGE_PRESETS[next].find((p) => p.kind === rule.kind);
    setRule(
      next === initialPeriod && rule.kind === initialRule.kind
        ? initialRule
        : (preset ?? CHALLENGE_PRESETS[next][0]!).rule,
    );
  };

  const submit = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      if (!(await onSubmit(rule, period)))
        setError("Couldn’t save it. Check your connection and try again.");
    } catch {
      setError("Couldn’t save it. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form
      className="flex flex-col gap-5 px-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <div className="flex flex-col gap-2">
        {mode === "start" ? (
          <div
            role="radiogroup"
            aria-label="How long"
            className="grid grid-cols-2 gap-1 rounded-xl bg-zinc-100 p-1 dark:bg-zinc-900"
          >
            {PERIODS.map((p) => {
              const on = period === p.period;
              return (
                <button
                  key={p.period}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => switchPeriod(p.period)}
                  // Selected matches the chosen preset below: emerald edge and tint.
                  className={cn(
                    "min-h-11 rounded-lg text-sm font-semibold",
                    on
                      ? "bg-emerald-50 text-emerald-900 shadow-sm ring-1 ring-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-100 dark:ring-emerald-500"
                      : "text-zinc-600 dark:text-zinc-400",
                  )}
                >
                  {p.label}
                </button>
              );
            })}
          </div>
        ) : null}
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Runs {rangeLabel(startDate, endDate)}. Steps already in this {noun}{" "}
          count.
        </p>
      </div>

      <div
        role="radiogroup"
        aria-label="Challenge"
        className="flex flex-col gap-2"
      >
        {CHALLENGE_PRESETS[period].map((preset) => {
          const on = rule.kind === preset.kind;
          return (
            <button
              key={preset.kind}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => pick(preset.rule)}
              className={cn(
                "flex min-h-14 flex-col items-start rounded-xl border p-3.5 text-left",
                on
                  ? "border-emerald-700 bg-emerald-50/60 dark:border-emerald-500 dark:bg-emerald-950/30"
                  : "border-zinc-200 dark:border-zinc-700",
              )}
            >
              <span className="text-[15px] font-semibold text-zinc-900 dark:text-zinc-50">
                {describeChallengeRule(
                  on ? rule : preset.rule,
                  "steps",
                  period,
                )}
              </span>
              <span className="mt-0.5 text-[13px] text-zinc-600 dark:text-zinc-400">
                {preset.hint}
              </span>
            </button>
          );
        })}
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className={cn(sectionLabel, "mb-2")}>Adjust the target</legend>
        <RuleSteppers
          rule={rule}
          noun={noun}
          dayCount={dayCount}
          limits={limitsFor(period, dayCount)}
          onChange={setRule}
        />
      </fieldset>

      {error ? (
        <p className="text-sm text-zinc-700 dark:text-zinc-300">{error}</p>
      ) : null}

      <button type="submit" disabled={busy} className={primaryButton}>
        {busy
          ? "Saving…"
          : mode === "edit"
            ? "Save changes"
            : "Start challenge"}
      </button>
    </form>
  );
}

function clampStep(
  value: number,
  delta: number,
  limits: { min: number; max: number },
): number {
  return Math.min(limits.max, Math.max(limits.min, value + delta));
}

/** The one or two numbers each rule has, as − / + rows. */
function RuleSteppers({
  rule,
  noun,
  dayCount,
  limits,
  onChange,
}: {
  rule: ChallengeRule;
  noun: string;
  dayCount: number;
  limits: ChallengeLimits;
  onChange: (rule: ChallengeRule) => void;
}) {
  const steps = limits.dailyTarget;
  switch (rule.kind) {
    case "days_hit":
      return (
        <>
          <Stepper
            label="Steps a day"
            value={rule.dailyTarget.toLocaleString("en-US")}
            limits={steps}
            current={rule.dailyTarget}
            onStep={(d) =>
              onChange({
                ...rule,
                dailyTarget: clampStep(rule.dailyTarget, d * steps.step, steps),
              })
            }
          />
          <Stepper
            label="Days needed"
            value={`${rule.daysNeeded} of ${dayCount}`}
            limits={limits.daysNeeded}
            current={rule.daysNeeded}
            onStep={(d) =>
              onChange({
                ...rule,
                daysNeeded: clampStep(rule.daysNeeded, d, limits.daysNeeded),
              })
            }
          />
        </>
      );
    case "total": {
      const t = limits.total;
      return (
        <Stepper
          label={`Steps this ${noun}`}
          value={rule.target.toLocaleString("en-US")}
          limits={t}
          current={rule.target}
          onStep={(d) =>
            onChange({ ...rule, target: clampStep(rule.target, d * t.step, t) })
          }
        />
      );
    }
    case "streak":
      return (
        <>
          <Stepper
            label="Steps a day"
            value={rule.dailyTarget.toLocaleString("en-US")}
            limits={steps}
            current={rule.dailyTarget}
            onStep={(d) =>
              onChange({
                ...rule,
                dailyTarget: clampStep(rule.dailyTarget, d * steps.step, steps),
              })
            }
          />
          <Stepper
            label="Days running"
            value={`${rule.length}`}
            limits={limits.streakLength}
            current={rule.length}
            onStep={(d) =>
              onChange({
                ...rule,
                length: clampStep(rule.length, d, limits.streakLength),
              })
            }
          />
        </>
      );
  }
}

function Stepper({
  label,
  value,
  current,
  limits,
  onStep,
}: {
  label: string;
  value: string;
  current: number;
  limits: { min: number; max: number };
  onStep: (direction: 1 | -1) => void;
}) {
  const button =
    "inline-flex size-11 items-center justify-center rounded-lg border border-zinc-200 text-zinc-800 hover:bg-zinc-50 disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-900";
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
        {label}
      </span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          className={button}
          aria-label={`Lower ${label.toLowerCase()}`}
          disabled={current <= limits.min}
          onClick={() => onStep(-1)}
        >
          <Minus className="size-4" aria-hidden />
        </button>
        <output
          aria-live="polite"
          aria-label={label}
          className="min-w-[4.5rem] text-center font-mono text-[15px] font-semibold text-zinc-900 tabular-nums dark:text-zinc-50"
        >
          {value}
        </output>
        <button
          type="button"
          className={button}
          aria-label={`Raise ${label.toLowerCase()}`}
          disabled={current >= limits.max}
          onClick={() => onStep(1)}
        >
          <Plus className="size-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}

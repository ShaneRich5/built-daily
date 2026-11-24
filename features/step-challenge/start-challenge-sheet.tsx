"use client";

import { Minus, Plus } from "lucide-react";
import { useState } from "react";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { describeChallengeRule } from "@/lib/challenge-evaluate";
import {
  CHALLENGE_LIMITS,
  CHALLENGE_PRESETS,
  type ChallengeRule,
} from "@/lib/challenge-types";
import { cn } from "@/lib/utils";
import { primaryButton, sectionLabel } from "@/features/step-challenge/step-challenge-ui";

type StartChallengeSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** `edit` changes the running challenge's target; `start` begins this week's. */
  mode: "start" | "edit";
  initialRule: ChallengeRule;
  /** Resolves false (or throws) when it couldn't be saved. */
  onSubmit: (rule: ChallengeRule) => Promise<boolean>;
};

/** Three presets, one tap each, with a simple way to nudge the numbers. */
export function StartChallengeSheet({ open, onOpenChange, mode, initialRule, onSubmit }: StartChallengeSheetProps) {
  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title={mode === "edit" ? "Change the challenge" : "Start a step challenge"}
      description="Runs Sunday to Saturday. Steps already in this week count."
    >
      {open ? <ChallengeForm mode={mode} initialRule={initialRule} onSubmit={onSubmit} /> : null}
    </BottomSheet>
  );
}

function ChallengeForm({
  mode,
  initialRule,
  onSubmit,
}: Pick<StartChallengeSheetProps, "mode" | "initialRule" | "onSubmit">) {
  const [rule, setRule] = useState<ChallengeRule>(initialRule);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pick = (preset: ChallengeRule) => {
    // Coming back to the kind you started with restores your own numbers.
    setRule(preset.kind === initialRule.kind ? initialRule : preset);
  };

  const submit = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      if (!(await onSubmit(rule))) setError("Couldn’t save it. Check your connection and try again.");
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
      <div role="radiogroup" aria-label="Challenge" className="flex flex-col gap-2">
        {CHALLENGE_PRESETS.map((preset) => {
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
                {describeChallengeRule(on ? rule : preset.rule)}
              </span>
              <span className="mt-0.5 text-[13px] text-zinc-600 dark:text-zinc-400">{preset.hint}</span>
            </button>
          );
        })}
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className={cn(sectionLabel, "mb-2")}>Adjust the target</legend>
        <RuleSteppers rule={rule} onChange={setRule} />
      </fieldset>

      {error ? <p className="text-sm text-zinc-700 dark:text-zinc-300">{error}</p> : null}

      <button type="submit" disabled={busy} className={primaryButton}>
        {busy ? "Saving…" : mode === "edit" ? "Save changes" : "Start challenge"}
      </button>
    </form>
  );
}

function clampStep(value: number, delta: number, limits: { min: number; max: number }): number {
  return Math.min(limits.max, Math.max(limits.min, value + delta));
}

/** The one or two numbers each rule has, as − / + rows. */
function RuleSteppers({ rule, onChange }: { rule: ChallengeRule; onChange: (rule: ChallengeRule) => void }) {
  const steps = CHALLENGE_LIMITS.dailyTarget;
  switch (rule.kind) {
    case "days_hit":
      return (
        <>
          <Stepper
            label="Steps a day"
            value={rule.dailyTarget.toLocaleString("en-US")}
            limits={steps}
            current={rule.dailyTarget}
            onStep={(d) => onChange({ ...rule, dailyTarget: clampStep(rule.dailyTarget, d * steps.step, steps) })}
          />
          <Stepper
            label="Days needed"
            value={`${rule.daysNeeded} of 7`}
            limits={CHALLENGE_LIMITS.daysNeeded}
            current={rule.daysNeeded}
            onStep={(d) => onChange({ ...rule, daysNeeded: clampStep(rule.daysNeeded, d, CHALLENGE_LIMITS.daysNeeded) })}
          />
        </>
      );
    case "total": {
      const t = CHALLENGE_LIMITS.total;
      return (
        <Stepper
          label="Steps this week"
          value={rule.target.toLocaleString("en-US")}
          limits={t}
          current={rule.target}
          onStep={(d) => onChange({ ...rule, target: clampStep(rule.target, d * t.step, t) })}
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
            onStep={(d) => onChange({ ...rule, dailyTarget: clampStep(rule.dailyTarget, d * steps.step, steps) })}
          />
          <Stepper
            label="Days running"
            value={`${rule.length}`}
            limits={CHALLENGE_LIMITS.streakLength}
            current={rule.length}
            onStep={(d) => onChange({ ...rule, length: clampStep(rule.length, d, CHALLENGE_LIMITS.streakLength) })}
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
      <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">{label}</span>
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

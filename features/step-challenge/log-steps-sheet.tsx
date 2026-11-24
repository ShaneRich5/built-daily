"use client";

import { useState } from "react";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { DAILY_METRICS } from "@/lib/daily-metric-types";
import { cn } from "@/lib/utils";
import type {
  LogStepsDay,
  StepDayCell,
} from "@/features/step-challenge/step-challenge-model";
import { StepDayDots } from "@/features/step-challenge/step-day-dots";
import {
  ghostButton,
  primaryButton,
} from "@/features/step-challenge/step-challenge-ui";

const QUICK_ADDS = [500, 1000, 2500];
const { max: MAX_STEPS } = DAILY_METRICS.steps;

type LogStepsSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The challenge week, so any past day can be picked and edited. */
  week: StepDayCell[];
  day: LogStepsDay;
  onPickDay: (dateKey: string) => void;
  /** Resolves false (or throws) when it couldn't be saved. */
  onSave: (dateKey: string, steps: number) => Promise<boolean>;
  /** Drops the typed number so the day goes back to its synced value. */
  onUseSynced: (dateKey: string) => Promise<boolean>;
};

/** Type a day's steps, or nudge it with +500 / +1,000 / +2,500. */
export function LogStepsSheet({
  open,
  onOpenChange,
  week,
  day,
  onPickDay,
  onSave,
  onUseSynced,
}: LogStepsSheetProps) {
  return (
    <BottomSheet open={open} onOpenChange={onOpenChange} title={day.title}>
      {open ? (
        <div className="flex flex-col gap-4 px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <StepDayDots
            days={week}
            selectedKey={day.dateKey}
            onPickDay={onPickDay}
          />
          {/* Keyed by day so switching days starts from that day's number. */}
          <LogStepsForm
            key={day.dateKey}
            day={day}
            onSave={onSave}
            onUseSynced={onUseSynced}
          />
        </div>
      ) : null}
    </BottomSheet>
  );
}

function parseSteps(raw: string): number | null {
  const digits = raw.replace(/[^\d]/g, "");
  return digits ? Number(digits) : null;
}

function LogStepsForm({
  day,
  onSave,
  onUseSynced,
}: {
  day: LogStepsDay;
  onSave: LogStepsSheetProps["onSave"];
  onUseSynced: LogStepsSheetProps["onUseSynced"];
}) {
  // Start from the typed number only. Prefilling the synced one would turn it
  // into a typed number on save and stop that day from syncing.
  const [text, setText] = useState(
    day.manual != null ? day.manual.toLocaleString("en-US") : "",
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const base = parseSteps(text) ?? day.synced?.value ?? 0;

  const run = async (write: () => Promise<boolean>) => {
    setBusy(true);
    setError(null);
    try {
      if (!(await write()))
        setError("Couldn’t save. Check your connection and try again.");
    } catch {
      setError("Couldn’t save. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  };

  const save = () => {
    const steps = parseSteps(text);
    if (steps == null) return setError("Type the day’s steps.");
    if (steps > MAX_STEPS)
      return setError(
        `That’s more than ${MAX_STEPS.toLocaleString("en-US")}. Check the number?`,
      );
    void run(() => onSave(day.dateKey, steps));
  };

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
    >
      {day.synced ? (
        <div className="rounded-xl bg-sky-50 px-3.5 py-3 text-[13px] text-zinc-800 dark:bg-sky-950/50 dark:text-zinc-200">
          <p>
            <span className="font-semibold text-sky-700 dark:text-sky-300">
              Synced from {day.synced.source}:{" "}
              {day.synced.value.toLocaleString("en-US")}.
            </span>{" "}
            {day.manual != null
              ? `You typed ${day.manual.toLocaleString("en-US")} for this day, so that’s what counts.`
              : "Saving a number here replaces it for this day only. Other days keep syncing."}
          </p>
          {day.manual != null ? (
            <button
              type="button"
              disabled={busy}
              className={cn(
                ghostButton,
                "-mx-3 -mb-2 text-sky-700 dark:text-sky-300",
              )}
              onClick={() => void run(() => onUseSynced(day.dateKey))}
            >
              Use the synced number
            </button>
          ) : null}
        </div>
      ) : null}

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
          Steps
        </span>
        <input
          className="h-14 w-full rounded-xl border border-zinc-200 bg-white px-3 font-mono text-[28px] text-zinc-900 tabular-nums placeholder:text-zinc-300 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:placeholder:text-zinc-600"
          inputMode="numeric"
          autoComplete="off"
          enterKeyHint="done"
          placeholder={
            day.synced ? day.synced.value.toLocaleString("en-US") : "0"
          }
          value={text}
          onChange={(e) => {
            setError(null);
            const n = parseSteps(e.target.value);
            setText(n == null ? "" : n.toLocaleString("en-US"));
          }}
        />
      </label>

      <div className="flex flex-wrap gap-2" aria-label="Quick add">
        {QUICK_ADDS.map((n) => (
          <button
            key={n}
            type="button"
            className="inline-flex h-11 items-center rounded-full border border-zinc-200 bg-zinc-50 px-4 text-sm font-semibold text-zinc-800 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
            onClick={() => {
              setError(null);
              setText(Math.min(MAX_STEPS, base + n).toLocaleString("en-US"));
            }}
          >
            +{n.toLocaleString("en-US")}
          </button>
        ))}
      </div>

      {error ? (
        <p className="text-sm text-zinc-700 dark:text-zinc-300">{error}</p>
      ) : null}

      <button type="submit" disabled={busy} className={primaryButton}>
        {busy ? "Saving…" : "Save"}
      </button>
    </form>
  );
}

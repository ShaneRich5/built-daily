"use client";

import { useMemo, useState, type FormEvent } from "react";
import { logBodyWeight } from "@/lib/progress-settings-repository";
import type { SavedBodyWeightEntry } from "@/lib/progress-types";
import { shiftLocalDateKey } from "@/lib/workout-activity";

const CHART_W = 320;
const CHART_H = 64;

type BodyWeightCardProps = {
  entries: SavedBodyWeightEntry[];
  goalWeightLbs: number | null;
  todayKey: string;
  /** Storybook passes a no-op; the app writes to Firestore. */
  onLog?: (dateKey: string, weightLbs: number) => Promise<unknown>;
};

/** Optional scale check-ins: the latest weight, the 30-day change, a sparkline, and a quick log. */
export function BodyWeightCard({ entries, goalWeightLbs, todayKey, onLog = logBodyWeight }: BodyWeightCardProps) {
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sorted = useMemo(
    () => [...entries].sort((a, b) => a.entry.dateKey.localeCompare(b.entry.dateKey)),
    [entries],
  );
  const current = sorted[sorted.length - 1]?.entry ?? null;
  const monthAgoKey = shiftLocalDateKey(todayKey, -30);
  const monthAgo = [...sorted].reverse().find((e) => e.entry.dateKey <= monthAgoKey)?.entry;
  const delta = current && monthAgo ? Math.round((current.weightLbs - monthAgo.weightLbs) * 10) / 10 : null;

  const points = useMemo(() => {
    const recent = sorted.slice(-30);
    if (recent.length < 2) return "";
    const weights = recent.map((e) => e.entry.weightLbs);
    const min = Math.min(...weights);
    const span = Math.max(1, Math.max(...weights) - min);
    return recent
      .map((e, i) => {
        const x = (i / (recent.length - 1)) * CHART_W;
        const y = 4 + (1 - (e.entry.weightLbs - min) / span) * (CHART_H - 8);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");
  }, [sorted]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const n = Number(input);
    if (!Number.isFinite(n) || n <= 0) {
      setError("Enter a weight in pounds.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await onLog(todayKey, n);
      setInput("");
    } catch {
      setError("Couldn’t save. Try again.");
    } finally {
      setBusy(false);
    }
  };

  const trend =
    delta === null ? "" : delta === 0 ? "no change in 30 days" : `${delta > 0 ? "+" : "−"}${Math.abs(delta)} in 30 days`;

  return (
    <section
      aria-labelledby="weight-heading"
      className="flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950"
    >
      <div className="flex items-baseline justify-between">
        <h2 id="weight-heading" className="text-[15px] font-semibold text-zinc-900 dark:text-zinc-50">
          Body weight
        </h2>
        {goalWeightLbs != null ? <span className="text-xs text-zinc-500">Goal {goalWeightLbs} lb</span> : null}
      </div>
      {current ? (
        <p className="flex items-baseline gap-2.5">
          <span className="font-mono text-[28px] font-medium text-zinc-900 dark:text-zinc-50">{current.weightLbs}</span>
          <span className="text-[13px] text-zinc-600 dark:text-zinc-400">lb{trend ? ` · ${trend}` : ""}</span>
        </p>
      ) : (
        <p className="text-[13px] text-zinc-500">Optional. Log a weigh-in whenever you like; no pressure.</p>
      )}
      {points ? (
        <svg
          role="img"
          aria-label={`Weight trend over the last ${Math.min(sorted.length, 30)} weigh-ins${trend ? `, ${trend}` : ""}`}
          viewBox={`0 0 ${CHART_W} ${CHART_H}`}
          preserveAspectRatio="none"
          className="h-16 w-full"
        >
          <polyline
            points={points}
            fill="none"
            className="stroke-emerald-700 dark:stroke-emerald-400"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      ) : null}
      <form onSubmit={(e) => void submit(e)} className="flex gap-2">
        <label htmlFor="weigh-in" className="sr-only">
          Today’s weight in pounds
        </label>
        <input
          id="weigh-in"
          inputMode="decimal"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Today’s weight (lb)"
          className="h-11 min-w-0 flex-1 rounded-lg border border-zinc-200 bg-zinc-50 px-3 text-base text-zinc-900 outline-none placeholder:text-zinc-400 focus:ring-2 focus:ring-zinc-900/10 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        />
        <button
          type="submit"
          disabled={busy || !input.trim()}
          className="h-11 rounded-lg border border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-900 hover:bg-zinc-50 disabled:opacity-40 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
        >
          {busy ? "Saving…" : "Log"}
        </button>
      </form>
      {error ? (
        <p role="alert" className="text-xs text-red-700 dark:text-red-400">
          {error}
        </p>
      ) : null}
    </section>
  );
}

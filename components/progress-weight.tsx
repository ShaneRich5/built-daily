"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  logBodyWeight,
  saveProgressSettings,
} from "@/lib/progress-settings-repository";
import type { SavedBodyWeightEntry } from "@/lib/progress-types";
import { shiftLocalDateKey } from "@/lib/workout-activity";
import { formatLocalDateKey } from "@/lib/workout-date";

type ProgressWeightProps = {
  entries: SavedBodyWeightEntry[];
  goalWeightLbs: number | null;
  todayKey: string;
};

export function ProgressWeight({
  entries,
  goalWeightLbs,
  todayKey,
}: ProgressWeightProps) {
  const [weightInput, setWeightInput] = useState("");
  const [goalDraft, setGoalDraft] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const goalInput =
    goalDraft ?? (goalWeightLbs != null ? String(goalWeightLbs) : "");

  const sorted = useMemo(
    () =>
      [...entries].sort((a, b) =>
        a.entry.dateKey.localeCompare(b.entry.dateKey),
      ),
    [entries],
  );

  const current = sorted[sorted.length - 1] ?? null;
  const monthAgoKey = shiftLocalDateKey(todayKey, -30);
  const monthAgo = [...sorted]
    .reverse()
    .find((e) => e.entry.dateKey <= monthAgoKey);
  const delta =
    current && monthAgo
      ? Math.round((current.entry.weightLbs - monthAgo.entry.weightLbs) * 10) /
        10
      : null;

  const chartPoints = useMemo(() => {
    if (sorted.length === 0) return [];
    const weights = sorted.map((e) => e.entry.weightLbs);
    const min = Math.min(...weights);
    const max = Math.max(...weights);
    const span = Math.max(1, max - min);
    const w = 280;
    const h = 72;
    const pad = 4;
    return sorted.map((e, i) => {
      const x =
        sorted.length === 1
          ? w / 2
          : pad + (i / (sorted.length - 1)) * (w - pad * 2);
      const y = pad + (1 - (e.entry.weightLbs - min) / span) * (h - pad * 2);
      return { x, y, ...e.entry };
    });
  }, [sorted]);

  const polyline = chartPoints.map((p) => `${p.x},${p.y}`).join(" ");

  async function onLog(e: React.FormEvent) {
    e.preventDefault();
    const n = Number(weightInput);
    if (!Number.isFinite(n) || n <= 0) {
      setError("Enter a valid weight.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const id = await logBodyWeight(todayKey, n);
      if (!id) setError("Couldn’t save weight.");
      else setWeightInput("");
    } catch {
      setError("Couldn’t save weight.");
    } finally {
      setBusy(false);
    }
  }

  async function onSaveGoal(e: React.FormEvent) {
    e.preventDefault();
    const raw = goalInput.trim();
    const n = raw === "" ? null : Number(raw);
    if (n != null && (!Number.isFinite(n) || n <= 0)) {
      setError("Enter a valid goal weight, or leave blank.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await saveProgressSettings({ goalWeightLbs: n });
      setGoalDraft(null);
    } catch {
      setError("Couldn’t save goal.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section
      className="space-y-4 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950"
      aria-labelledby="weight-heading"
    >
      <div>
        <h2
          id="weight-heading"
          className="text-sm font-semibold text-zinc-900 dark:text-zinc-50"
        >
          Weight progress
        </h2>
        <p className="mt-1 text-sm text-zinc-500">
          Optional scale check-ins—gentle tracking, not a scoreboard.
        </p>
      </div>

      <div className="flex flex-wrap gap-6">
        <div>
          <p className="text-3xl font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
            {current ? current.entry.weightLbs : "—"}
            {current ? (
              <span className="ml-1 text-sm font-medium text-zinc-500">lbs</span>
            ) : null}
          </p>
          <p className="text-xs text-zinc-500">Current</p>
        </div>
        <div>
          <p className="text-xl font-semibold tabular-nums text-zinc-800 dark:text-zinc-100">
            {delta == null ? "—" : delta > 0 ? `+${delta}` : `${delta}`}
            {delta != null ? (
              <span className="ml-1 text-sm font-medium text-zinc-500">lbs</span>
            ) : null}
          </p>
          <p className="text-xs text-zinc-500">vs ~30 days ago</p>
        </div>
        <div>
          <p className="text-xl font-semibold tabular-nums text-zinc-800 dark:text-zinc-100">
            {goalWeightLbs != null ? goalWeightLbs : "—"}
            {goalWeightLbs != null ? (
              <span className="ml-1 text-sm font-medium text-zinc-500">lbs</span>
            ) : null}
          </p>
          <p className="text-xs text-zinc-500">Goal</p>
        </div>
      </div>

      {chartPoints.length > 0 ? (
        <svg
          viewBox="0 0 280 72"
          className="h-20 w-full text-emerald-600 dark:text-emerald-400"
          role="img"
          aria-label="Body weight over time"
        >
          <polyline
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
            points={polyline}
          />
          {chartPoints.map((p) => (
            <circle
              key={p.dateKey + String(p.weightLbs)}
              cx={p.x}
              cy={p.y}
              r="2.5"
              className="fill-current"
            >
              <title>
                {formatLocalDateKey(p.dateKey)} · {p.weightLbs} lbs
              </title>
            </circle>
          ))}
        </svg>
      ) : (
        <p className="text-sm text-zinc-500">No weight entries yet.</p>
      )}

      <form onSubmit={onLog} className="flex flex-wrap items-end gap-2">
        <div className="space-y-1">
          <Label htmlFor="log-weight">Log today (lbs)</Label>
          <Input
            id="log-weight"
            inputMode="decimal"
            value={weightInput}
            onChange={(e) => setWeightInput(e.target.value)}
            placeholder="165"
            className="w-28"
            disabled={busy}
          />
        </div>
        <Button type="submit" size="lg" disabled={busy || !weightInput.trim()}>
          Save
        </Button>
      </form>

      <form onSubmit={onSaveGoal} className="flex flex-wrap items-end gap-2">
        <div className="space-y-1">
          <Label htmlFor="goal-weight">Goal weight (optional)</Label>
          <Input
            id="goal-weight"
            inputMode="decimal"
            value={goalInput}
            onChange={(e) => setGoalDraft(e.target.value)}
            placeholder="Optional"
            className="w-28"
            disabled={busy}
          />
        </div>
        <Button type="submit" variant="outline" size="lg" disabled={busy}>
          Update goal
        </Button>
      </form>

      {error ? (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      ) : null}
    </section>
  );
}

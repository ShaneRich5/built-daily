"use client";

import { RotateCcw, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { ActivityTypeIcon } from "@/components/activity-type-icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  ACTIVITY_CATALOG,
  getActivityTypeById,
} from "@/lib/activity-catalog";
import {
  logActivity,
  subscribeRecentActivities,
} from "@/lib/activity-repository";
import {
  suggestActivityDetails,
  type ActivityDetailSuggestions,
} from "@/lib/activity-suggestions";
import type { SavedActivity } from "@/lib/activity-types";
import { localDateKeyFromMs, normalizeWorkoutTime, formatActivityDatePreview } from "@/lib/workout-date";

type LogActivitySheetProps = {
  open: boolean;
  onClose: () => void;
  onLogged?: () => void;
  /** Journal day for the new activity (`YYYY-MM-DD`). Defaults to today. */
  defaultDateKey?: string;
};

function emptyForm() {
  return {
    typeId: null as string | null,
    activityTime: "",
    durationMin: "",
    distanceMiles: "",
    locationName: "",
    notes: "",
    appliedSuggestion: false,
  };
}

function fieldsFromSuggestions(s: ActivityDetailSuggestions) {
  return {
    durationMin: s.durationMin != null ? String(s.durationMin) : "",
    distanceMiles: s.distanceMiles != null ? String(s.distanceMiles) : "",
    locationName: s.locationName ?? "",
  };
}

export function LogActivitySheet({
  open,
  onClose,
  onLogged,
  defaultDateKey,
}: LogActivitySheetProps) {
  const [typeId, setTypeId] = useState<string | null>(null);
  const [activityTime, setActivityTime] = useState("");
  const [durationMin, setDurationMin] = useState("");
  const [distanceMiles, setDistanceMiles] = useState("");
  const [locationName, setLocationName] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<SavedActivity[]>([]);
  const [appliedSuggestion, setAppliedSuggestion] = useState(false);

  useEffect(() => {
    if (!open) return;
    return subscribeRecentActivities(setHistory, { maxDocs: 80 });
  }, [open]);

  const selected = typeId ? getActivityTypeById(typeId) : undefined;
  const suggestions = useMemo(
    () => (typeId ? suggestActivityDetails(history, typeId) : null),
    [history, typeId],
  );

  const resetAndClose = () => {
    const empty = emptyForm();
    setTypeId(empty.typeId);
    setActivityTime(empty.activityTime);
    setDurationMin(empty.durationMin);
    setDistanceMiles(empty.distanceMiles);
    setLocationName(empty.locationName);
    setNotes(empty.notes);
    setAppliedSuggestion(empty.appliedSuggestion);
    setError(null);
    setSaving(false);
    onClose();
  };

  const selectType = (id: string) => {
    setTypeId(id);
    setNotes("");
    setError(null);
    const s = suggestActivityDetails(history, id);
    if (s.sampleCount > 0) {
      const fields = fieldsFromSuggestions(s);
      setDurationMin(fields.durationMin);
      setDistanceMiles(fields.distanceMiles);
      setLocationName(fields.locationName);
      setAppliedSuggestion(true);
    } else {
      setDurationMin("");
      setDistanceMiles("");
      setLocationName("");
      setAppliedSuggestion(false);
    }
  };

  const applySuggestions = () => {
    if (!suggestions || suggestions.sampleCount === 0) return;
    const fields = fieldsFromSuggestions(suggestions);
    setDurationMin(fields.durationMin);
    setDistanceMiles(fields.distanceMiles);
    setLocationName(fields.locationName);
    setAppliedSuggestion(true);
  };

  const save = async () => {
    if (!typeId || !selected) {
      setError("Pick an activity type.");
      return;
    }
    setSaving(true);
    setError(null);
    const id = await logActivity({
      activityTypeId: typeId,
      activityDate:
        defaultDateKey && /^\d{4}-\d{2}-\d{2}$/.test(defaultDateKey)
          ? defaultDateKey
          : localDateKeyFromMs(Date.now()),
      activityTime: normalizeWorkoutTime(activityTime),
      durationMin: durationMin ? Number(durationMin) : null,
      distanceMiles: distanceMiles ? Number(distanceMiles) : null,
      locationName: locationName || null,
      notes: notes || null,
    });
    setSaving(false);
    if (!id) {
      setError("Couldn’t save. Check your connection and try again.");
      return;
    }
    onLogged?.();
    resetAndClose();
  };

  if (!open) return null;

  const journalDateKey =
    defaultDateKey && /^\d{4}-\d{2}-\d{2}$/.test(defaultDateKey)
      ? defaultDateKey
      : localDateKeyFromMs(Date.now());
  const journalPreview = formatActivityDatePreview(journalDateKey);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="log-activity-title"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) resetAndClose();
      }}
    >
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl bg-white shadow-xl dark:bg-zinc-950 sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3 dark:border-zinc-800">
          <div>
            <h2
              id="log-activity-title"
              className="text-base font-semibold text-zinc-900 dark:text-zinc-50"
            >
              {selected ? selected.name : "Log activity"}
            </h2>
            {journalPreview ? (
              <p className="text-xs text-zinc-500">{journalPreview}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={resetAndClose}
            className="rounded-md p-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
          {!selected ? (
            <div className="space-y-2">
              <p className="text-sm text-zinc-500">
                Quick check-in for walks, rides, and sports—not a workout.
              </p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {ACTIVITY_CATALOG.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => selectType(t.id)}
                    className="flex min-h-12 items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-left text-sm font-medium text-zinc-800 transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:bg-zinc-900"
                  >
                    <ActivityTypeIcon
                      icon={t.icon}
                      className="size-4 shrink-0 text-zinc-500"
                    />
                    <span className="truncate">{t.name}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                void save();
              }}
            >
              <button
                type="button"
                onClick={() => {
                  setTypeId(null);
                  setAppliedSuggestion(false);
                }}
                className="text-xs font-semibold text-zinc-500 underline-offset-2 hover:underline"
              >
                Change activity
              </button>

              {suggestions && suggestions.sampleCount > 0 ? (
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-zinc-100 bg-zinc-50/80 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-900/50">
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
                      From past {selected.name.toLowerCase()}s
                    </p>
                    <p className="truncate text-xs text-zinc-600 dark:text-zinc-300">
                      {suggestions.summary ??
                        `${suggestions.sampleCount} prior log${suggestions.sampleCount === 1 ? "" : "s"}`}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={applySuggestions}
                    className="inline-flex h-8 items-center gap-1 rounded-md bg-zinc-900 px-2.5 text-xs font-semibold text-white dark:bg-zinc-100 dark:text-zinc-900"
                  >
                    <RotateCcw className="size-3" aria-hidden />
                    {appliedSuggestion ? "Re-apply" : "Use usual"}
                  </button>
                </div>
              ) : null}

              <div className="space-y-2">
                <Label htmlFor="activity-time">Time (optional)</Label>
                <Input
                  id="activity-time"
                  type="time"
                  value={activityTime}
                  onChange={(e) => setActivityTime(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="activity-duration">Duration (minutes)</Label>
                <Input
                  id="activity-duration"
                  inputMode="numeric"
                  type="number"
                  min={1}
                  max={1440}
                  placeholder="e.g. 30"
                  value={durationMin}
                  onChange={(e) => setDurationMin(e.target.value)}
                />
              </div>

              {selected.supportsDistance ? (
                <div className="space-y-2">
                  <Label htmlFor="activity-distance">
                    Distance (miles, optional)
                  </Label>
                  <Input
                    id="activity-distance"
                    inputMode="decimal"
                    type="number"
                    min={0}
                    step={0.1}
                    placeholder="e.g. 2.5"
                    value={distanceMiles}
                    onChange={(e) => setDistanceMiles(e.target.value)}
                  />
                </div>
              ) : null}

              <div className="space-y-2">
                <Label htmlFor="activity-location">Location (optional)</Label>
                <Input
                  id="activity-location"
                  maxLength={120}
                  placeholder="Park, gym lobby, home…"
                  value={locationName}
                  onChange={(e) => setLocationName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="activity-notes">Notes (optional)</Label>
                <Textarea
                  id="activity-notes"
                  maxLength={400}
                  rows={2}
                  placeholder="Felt good, played with friends…"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              {error ? (
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              ) : null}

              <Button type="submit" className="h-11 w-full" disabled={saving}>
                {saving ? "Saving…" : "Save activity"}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

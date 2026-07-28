"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { ActivityDatePreview } from "@/components/activity-date-preview";
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
  deleteActivity,
  updateActivity,
} from "@/lib/activity-repository";
import type { ActivityDoc } from "@/lib/activity-types";
import { normalizeWorkoutTime } from "@/lib/workout-date";

type ActivityDetailProps = {
  activityId: string;
  activity: ActivityDoc;
  backHref?: string;
  onSaved?: (activity: ActivityDoc) => void;
};

function draftFromActivity(activity: ActivityDoc) {
  return {
    typeId: activity.activityTypeId,
    activityDate: activity.activityDate,
    activityTime: activity.activityTime ?? "",
    durationMin:
      activity.durationMin != null ? String(activity.durationMin) : "",
    distanceMiles:
      activity.distanceMiles != null ? String(activity.distanceMiles) : "",
    locationName: activity.locationName ?? "",
    notes: activity.notes ?? "",
  };
}

export function ActivityDetail({
  activityId,
  activity,
  backHref = "/",
  onSaved,
}: ActivityDetailProps) {
  const router = useRouter();
  const [typeId, setTypeId] = useState(activity.activityTypeId);
  const [activityDate, setActivityDate] = useState(activity.activityDate);
  const [activityTime, setActivityTime] = useState(
    activity.activityTime ?? "",
  );
  const [durationMin, setDurationMin] = useState(
    activity.durationMin != null ? String(activity.durationMin) : "",
  );
  const [distanceMiles, setDistanceMiles] = useState(
    activity.distanceMiles != null ? String(activity.distanceMiles) : "",
  );
  const [locationName, setLocationName] = useState(
    activity.locationName ?? "",
  );
  const [notes, setNotes] = useState(activity.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);

  useEffect(() => {
    const draft = draftFromActivity(activity);
    setTypeId(draft.typeId);
    setActivityDate(draft.activityDate);
    setActivityTime(draft.activityTime);
    setDurationMin(draft.durationMin);
    setDistanceMiles(draft.distanceMiles);
    setLocationName(draft.locationName);
    setNotes(draft.notes);
    setError(null);
  }, [activity]);

  const selected = getActivityTypeById(typeId);

  const handleSave = useCallback(async () => {
    if (saving) return;
    if (!typeId || !getActivityTypeById(typeId)) {
      setError("Pick an activity type.");
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(activityDate)) {
      setError("Enter a valid date.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const updated = await updateActivity(activityId, {
        activityTypeId: typeId,
        activityDate,
        activityTime: normalizeWorkoutTime(activityTime),
        durationMin: durationMin ? Number(durationMin) : null,
        distanceMiles: distanceMiles ? Number(distanceMiles) : null,
        locationName: locationName || null,
        notes: notes || null,
      });
      if (!updated) {
        setError("Couldn't save. Check your connection and try again.");
        return;
      }
      onSaved?.(updated);
      setSavedFlash(true);
      window.setTimeout(() => setSavedFlash(false), 2000);
    } catch {
      setError("Couldn't save. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }, [
    activityDate,
    activityId,
    activityTime,
    distanceMiles,
    durationMin,
    locationName,
    notes,
    onSaved,
    saving,
    typeId,
  ]);

  const handleDelete = useCallback(async () => {
    if (deleting) return;
    if (
      !window.confirm(
        "Delete this activity permanently? This cannot be undone.",
      )
    ) {
      return;
    }
    setDeleting(true);
    setError(null);
    try {
      const ok = await deleteActivity(activityId);
      if (!ok) {
        setError("Couldn't delete this activity.");
        return;
      }
      router.push(backHref);
    } catch {
      setError("Couldn't delete this activity.");
    } finally {
      setDeleting(false);
    }
  }, [activityId, backHref, deleting, router]);

  return (
    <div className="space-y-6">
      <Link
        href={backHref}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Back
      </Link>

      <header className="flex items-start gap-3">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300">
          <ActivityTypeIcon
            icon={selected?.icon ?? "activity"}
            className="size-5"
          />
        </span>
        <div className="min-w-0 space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            {selected?.name ?? "Activity"}
          </h1>
          <p className="text-sm text-zinc-500">Edit activity</p>
        </div>
      </header>

      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          void handleSave();
        }}
      >
        <div className="space-y-2">
          <Label>Activity type</Label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {ACTIVITY_CATALOG.map((t) => {
              const active = t.id === typeId;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    setTypeId(t.id);
                    if (!t.supportsDistance) setDistanceMiles("");
                    setError(null);
                  }}
                  className={
                    active
                      ? "flex min-h-12 items-center gap-2 rounded-xl border border-teal-300 bg-teal-50 px-3 py-2.5 text-left text-sm font-medium text-teal-900 dark:border-teal-800 dark:bg-teal-950/40 dark:text-teal-100"
                      : "flex min-h-12 items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-left text-sm font-medium text-zinc-800 transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:bg-zinc-900"
                  }
                >
                  <ActivityTypeIcon
                    icon={t.icon}
                    className="size-4 shrink-0 text-zinc-500"
                  />
                  <span className="truncate">{t.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-2">
            <Label htmlFor="activity-edit-date">Date</Label>
            <Input
              id="activity-edit-date"
              type="date"
              value={activityDate}
              onChange={(e) => setActivityDate(e.target.value)}
              required
            />
            <ActivityDatePreview dateKey={activityDate} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="activity-edit-time">Time (optional)</Label>
            <Input
              id="activity-edit-time"
              type="time"
              value={activityTime}
              onChange={(e) => setActivityTime(e.target.value)}
            />
          </div>
        </div>
        <p className="text-[11px] text-zinc-400">
          Leave time blank if you only know the day.
        </p>

        <div className="space-y-2">
          <Label htmlFor="activity-edit-duration">Duration (minutes)</Label>
          <Input
            id="activity-edit-duration"
            inputMode="numeric"
            type="number"
            min={1}
            max={1440}
            placeholder="e.g. 30"
            value={durationMin}
            onChange={(e) => setDurationMin(e.target.value)}
          />
        </div>

        {selected?.supportsDistance ? (
          <div className="space-y-2">
            <Label htmlFor="activity-edit-distance">
              Distance (miles, optional)
            </Label>
            <Input
              id="activity-edit-distance"
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
          <Label htmlFor="activity-edit-location">Location (optional)</Label>
          <Input
            id="activity-edit-location"
            maxLength={120}
            placeholder="Park, gym lobby, home…"
            value={locationName}
            onChange={(e) => setLocationName(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="activity-edit-notes">Notes (optional)</Label>
          <Textarea
            id="activity-edit-notes"
            maxLength={400}
            rows={3}
            placeholder="Felt good, played with friends…"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        {error ? (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        ) : null}

        <Button type="submit" className="h-11 w-full" disabled={saving}>
          <Save className="size-4" aria-hidden />
          {saving ? "Saving…" : savedFlash ? "Saved" : "Save changes"}
        </Button>
      </form>

      <Button
        type="button"
        variant="outline"
        className="h-11 w-full border-red-200 text-red-700 hover:bg-red-50 dark:border-red-900/60 dark:text-red-400 dark:hover:bg-red-950/30"
        disabled={deleting || saving}
        onClick={() => void handleDelete()}
      >
        <Trash2 className="size-4" aria-hidden />
        {deleting ? "Deleting…" : "Delete activity"}
      </Button>
    </div>
  );
}

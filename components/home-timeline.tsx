"use client";

import Link from "next/link";
import { Check, Copy, Download } from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { ActivityTypeIcon } from "@/components/activity-type-icon";
import { LogActivitySheet } from "@/components/log-activity-sheet";
import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import { WorkoutCard } from "@/components/workout-card";
import { getActivityTypeById } from "@/lib/activity-catalog";
import { subscribeRecentActivities } from "@/lib/activity-repository";
import type { SavedActivity } from "@/lib/activity-types";
import {
  formatSessionJournalMeta,
  formatWorkoutTimeLabel,
  localDateKeyFromMs,
} from "@/lib/workout-date";
import {
  formatWorkoutJournalBundle,
  workoutJournalBundleFilename,
} from "@/lib/workout-journal-export";
import {
  getWorkoutSessions,
  subscribeRecentSessions,
  type SessionSummary,
} from "@/lib/workout-session-repository";

type TimelineItem =
  | {
      kind: "workout";
      id: string;
      sortKey: string;
      dateKey: string;
      title: string;
      href: string;
      dateLabel: string;
      status: SessionSummary["status"];
      exerciseCount: number;
      setCount: number;
      previewNames: string[];
    }
  | {
      kind: "activity";
      id: string;
      sortKey: string;
      dateKey: string;
      time: string | null;
      title: string;
      meta: string;
      href: string;
      icon: NonNullable<ReturnType<typeof getActivityTypeById>>["icon"];
    };

function sessionDateKey(s: SessionSummary): string {
  if (s.workoutDate) return s.workoutDate;
  const ms =
    s.status === "completed" && s.endedAt
      ? s.endedAt.getTime()
      : s.startedAt.getTime();
  return localDateKeyFromMs(ms);
}

function buildTimeline(
  sessions: SessionSummary[],
  activities: SavedActivity[],
): TimelineItem[] {
  const items: TimelineItem[] = [];

  for (const s of sessions) {
    const dateKey = sessionDateKey(s);
    const time = s.workoutTime;
    const dateMs =
      s.status === "completed" && s.endedAt
        ? s.endedAt.getTime()
        : s.startedAt.getTime();
    items.push({
      kind: "workout",
      id: s.id,
      sortKey: `${dateKey}T${time ?? "99:99"}-${s.startedAt.getTime()}`,
      dateKey,
      title: s.title,
      href:
        s.status === "in_progress"
          ? `/workout?s=${encodeURIComponent(s.id)}`
          : `/sessions/${s.id}`,
      dateLabel: formatSessionJournalMeta(
        s.workoutDate,
        s.workoutTime,
        dateMs,
      ),
      status: s.status,
      exerciseCount: s.exerciseCount,
      setCount: s.setCount,
      previewNames: s.previewExerciseNames,
    });
  }

  for (const { id, activity } of activities) {
    const type = getActivityTypeById(activity.activityTypeId);
    const parts: string[] = [];
    if (activity.durationMin != null) parts.push(`${activity.durationMin} min`);
    if (activity.distanceMiles != null) {
      parts.push(`${activity.distanceMiles} mi`);
    }
    if (activity.locationName) parts.push(activity.locationName);
    items.push({
      kind: "activity",
      id,
      sortKey: `${activity.activityDate}T${activity.activityTime ?? "99:99"}-${activity.createdAt.getTime()}`,
      dateKey: activity.activityDate,
      time: activity.activityTime,
      title: type?.name ?? "Activity",
      meta: parts.length > 0 ? parts.join(" · ") : "Activity",
      href: `/activities/${id}`,
      icon: type?.icon ?? "activity",
    });
  }

  items.sort((a, b) => b.sortKey.localeCompare(a.sortKey));
  return items;
}

function groupByDay(items: TimelineItem[]): Array<{
  dateKey: string;
  label: string;
  items: TimelineItem[];
}> {
  const today = localDateKeyFromMs(Date.now());
  const groups = new Map<string, TimelineItem[]>();
  for (const item of items) {
    const list = groups.get(item.dateKey) ?? [];
    list.push(item);
    groups.set(item.dateKey, list);
  }
  return [...groups.entries()].map(([dateKey, dayItems]) => ({
    dateKey,
    label:
      dateKey === today
        ? "Today"
        : new Intl.DateTimeFormat("en-US", {
            weekday: "short",
            month: "short",
            day: "numeric",
          }).format(new Date(`${dateKey}T12:00:00`)),
    items: dayItems,
  }));
}

async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through */
  }
  try {
    const el = document.createElement("textarea");
    el.value = text;
    el.setAttribute("readonly", "");
    el.style.position = "fixed";
    el.style.left = "-9999px";
    document.body.appendChild(el);
    el.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(el);
    return ok;
  } catch {
    return false;
  }
}

function downloadTextFile(filename: string, text: string) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function HomeTimeline() {
  const { user, loading, firebaseReady } = useAuth();
  const [sessions, setSessions] = useState<SessionSummary[] | null>(null);
  const [activities, setActivities] = useState<SavedActivity[] | null>(null);
  const [logOpen, setLogOpen] = useState(false);
  const [selecting, setSelecting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [exporting, setExporting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  useEffect(() => {
    if (!firebaseReady || loading || !user) {
      return () => {
        setSessions(null);
        setActivities(null);
      };
    }
    const unsubSessions = subscribeRecentSessions(setSessions, { maxDocs: 30 });
    const unsubActivities = subscribeRecentActivities(setActivities, {
      maxDocs: 40,
    });
    return () => {
      unsubSessions();
      unsubActivities();
    };
  }, [user, loading, firebaseReady]);

  const groups = useMemo(() => {
    if (!sessions || !activities) return [];
    return groupByDay(buildTimeline(sessions, activities));
  }, [sessions, activities]);

  const workoutIds = useMemo(
    () =>
      groups.flatMap((group) =>
        group.items.filter((item) => item.kind === "workout").map((item) => item.id),
      ),
    [groups],
  );

  const exitSelectMode = useCallback(() => {
    setSelecting(false);
    setSelectedIds(new Set());
    setExportError(null);
    setCopied(false);
  }, []);

  const toggleSelected = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setExportError(null);
  }, []);

  const selectAllWorkouts = useCallback(() => {
    setSelectedIds(new Set(workoutIds));
    setExportError(null);
  }, [workoutIds]);

  const clearAllWorkouts = useCallback(() => {
    setSelectedIds(new Set());
    setExportError(null);
    setCopied(false);
  }, []);

  const loadSelectedJournal = useCallback(async () => {
    const orderedIds = workoutIds.filter((id) => selectedIds.has(id));
    if (orderedIds.length === 0) return null;
    const rows = await getWorkoutSessions(orderedIds);
    if (rows.length === 0) {
      setExportError("Couldn’t load those workouts. Try again.");
      return null;
    }
    return formatWorkoutJournalBundle(rows.map((row) => row.session));
  }, [selectedIds, workoutIds]);

  const handleCopySelected = useCallback(async () => {
    if (exporting) return;
    setExporting(true);
    setExportError(null);
    try {
      const text = await loadSelectedJournal();
      if (!text) return;
      const ok = await copyText(text);
      if (!ok) {
        setExportError("Couldn’t copy. Try download instead.");
        return;
      }
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setExportError("Couldn’t export. Check your connection and try again.");
    } finally {
      setExporting(false);
    }
  }, [exporting, loadSelectedJournal]);

  const handleDownloadSelected = useCallback(async () => {
    if (exporting) return;
    setExporting(true);
    setExportError(null);
    try {
      const text = await loadSelectedJournal();
      if (!text) return;
      downloadTextFile(
        workoutJournalBundleFilename(selectedIds.size),
        text,
      );
    } catch {
      setExportError("Couldn’t download. Check your connection and try again.");
    } finally {
      setExporting(false);
    }
  }, [exporting, loadSelectedJournal, selectedIds.size]);

  if (!firebaseReady) {
    return (
      <EmptyState
        title="Sign-in not configured"
        detail="Add Firebase env vars to save workouts and activities."
      />
    );
  }

  if (loading) return <LoadingSkeleton />;

  if (!user) {
    return (
      <EmptyState
        title="Sign in to see your log"
        detail="Workouts and activities show up here together."
        action={
          <Link
            href="/login"
            className="mt-3 inline-flex h-10 items-center justify-center rounded-lg bg-zinc-900 px-4 text-sm font-semibold text-white dark:bg-zinc-50 dark:text-zinc-900"
          >
            Sign in
          </Link>
        }
      />
    );
  }

  if (sessions === null || activities === null) return <LoadingSkeleton />;

  return (
    <div className={`space-y-4 ${selecting ? "pb-28" : ""}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2
          id="timeline-heading"
          className="text-sm font-semibold uppercase tracking-wide text-zinc-500"
        >
          {selecting ? "Select workouts" : "Recent"}
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          {selecting ? (
            <>
              <button
                type="button"
                onClick={selectAllWorkouts}
                disabled={workoutIds.length === 0}
                className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-50 disabled:opacity-40 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:bg-zinc-900"
              >
                Select all
              </button>
              <button
                type="button"
                onClick={clearAllWorkouts}
                disabled={selectedIds.size === 0}
                className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-50 disabled:opacity-40 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:bg-zinc-900"
              >
                Clear all
              </button>
              <button
                type="button"
                onClick={exitSelectMode}
                className="rounded-lg px-3 py-2 text-sm font-semibold text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
              >
                Cancel
              </button>
            </>
          ) : (
            <>
              {workoutIds.length > 0 ? (
                <button
                  type="button"
                  onClick={() => {
                    setSelecting(true);
                    setExportError(null);
                  }}
                  className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:bg-zinc-900"
                >
                  Export
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => setLogOpen(true)}
                className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:bg-zinc-900"
              >
                Log activity
              </button>
            </>
          )}
        </div>
      </div>

      {selecting ? (
        <p className="text-sm text-zinc-500">
          Tap workouts to include them in a journal copy or download. Activities
          stay in the list but aren’t exported.
        </p>
      ) : null}

      {groups.length === 0 ? (
        <EmptyState
          title="Nothing logged yet"
          detail="Start a workout or log a walk, ride, or sport."
        />
      ) : (
        <div className="space-y-6" aria-labelledby="timeline-heading">
          {groups.map((group) => (
            <section key={group.dateKey} className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                {group.label}
              </h3>
              <ul className="space-y-2">
                {group.items.map((item) => (
                  <li key={`${item.kind}-${item.id}`}>
                    {item.kind === "workout" ? (
                      <WorkoutCard
                        name={item.title}
                        dateLabel={item.dateLabel}
                        exerciseCount={item.exerciseCount}
                        setCount={item.setCount}
                        previewNames={item.previewNames}
                        status={item.status}
                        href={selecting ? undefined : item.href}
                        selectable={selecting}
                        selected={selectedIds.has(item.id)}
                        onToggleSelect={() => toggleSelected(item.id)}
                      />
                    ) : (
                      <Link
                        href={item.href}
                        className={`flex items-start gap-3 rounded-xl border border-zinc-200 bg-white px-3 py-3 text-left transition hover:border-zinc-300 hover:bg-zinc-50 active:scale-[0.99] dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-700 dark:hover:bg-zinc-900 ${
                          selecting ? "pointer-events-none opacity-50" : ""
                        }`}
                        tabIndex={selecting ? -1 : undefined}
                        aria-disabled={selecting || undefined}
                      >
                        <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300">
                          <ActivityTypeIcon
                            icon={item.icon}
                            className="size-4"
                          />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex flex-wrap items-baseline justify-between gap-2">
                            <span className="font-semibold text-zinc-900 dark:text-zinc-50">
                              {item.title}
                            </span>
                            {item.time ? (
                              <span className="text-xs tabular-nums text-zinc-400">
                                {formatWorkoutTimeLabel(item.time)}
                              </span>
                            ) : null}
                          </span>
                          <span className="mt-0.5 block text-xs text-zinc-500">
                            Activity · {item.meta}
                          </span>
                        </span>
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      {selecting ? (
        <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-zinc-200 bg-zinc-50/95 p-4 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/95">
          <div className="mx-auto flex w-full max-w-2xl flex-col gap-2 px-4 sm:px-5">
            {exportError ? (
              <p className="text-center text-xs text-amber-700 dark:text-amber-400">
                {exportError}
              </p>
            ) : (
              <p className="text-center text-xs text-zinc-500">
                {selectedIds.size === 0
                  ? "Select at least one workout to export."
                  : `${selectedIds.size} workout${selectedIds.size === 1 ? "" : "s"} selected`}
              </p>
            )}
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="h-11 flex-1 gap-2 rounded-xl"
                disabled={selectedIds.size === 0 || exporting}
                onClick={() => void handleCopySelected()}
              >
                {copied ? (
                  <>
                    <Check className="size-4" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="size-4" />
                    Copy
                  </>
                )}
              </Button>
              <Button
                type="button"
                className="h-11 flex-1 gap-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-600/90 dark:bg-emerald-500 dark:hover:bg-emerald-500/90"
                disabled={selectedIds.size === 0 || exporting}
                onClick={() => void handleDownloadSelected()}
              >
                <Download className="size-4" />
                {exporting ? "Exporting…" : "Download .txt"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      <LogActivitySheet open={logOpen} onClose={() => setLogOpen(false)} />
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-2">
      <div className="h-20 animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-900" />
      <div className="h-20 animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-900" />
    </div>
  );
}

function EmptyState({
  title,
  detail,
  action,
}: {
  title: string;
  detail: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50/80 px-4 py-10 text-center text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950/40 dark:text-zinc-400">
      <p>{title}</p>
      <p className="mt-1 text-zinc-400 dark:text-zinc-500">{detail}</p>
      {action}
    </div>
  );
}

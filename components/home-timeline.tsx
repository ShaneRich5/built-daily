"use client";

import Link from "next/link";
import { Check, Copy, Download, Trash2 } from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { ActivityTypeIcon } from "@/components/activity-type-icon";
import {
  HistoryDeleteSheet,
  selectionLabel,
} from "@/components/history-delete-sheet";
import { LogActivitySheet } from "@/components/log-activity-sheet";
import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import { WorkoutCard } from "@/components/workout-card";
import { getActivityTypeById } from "@/lib/activity-catalog";
import { subscribeRecentActivities } from "@/lib/activity-repository";
import type { SavedActivity } from "@/lib/activity-types";
import { startOfWeekDateKey } from "@/lib/calendar-views";
import { deleteHistoryItems } from "@/lib/history-delete";
import {
  dateFromLocalDateKey,
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

/** Select-mode key: workouts and activities live in different collections. */
function selectionKey(kind: TimelineItem["kind"], id: string): string {
  return `${kind}:${id}`;
}

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
      dateLabel: formatSessionJournalMeta(s.workoutDate, s.workoutTime, dateMs),
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

type TimelinePeriod = {
  key: string;
  label: string;
  /** Multi-day buckets need each row to carry its own date; single-day ones don't. */
  showItemDate: boolean;
  items: TimelineItem[];
};

/** Short "Wed, Sep 24" style label for a row inside a multi-day bucket. */
function formatShortDayLabel(dateKey: string): string {
  const d = dateFromLocalDateKey(dateKey);
  if (!d) return dateKey;
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(d);
}

/**
 * Buckets the timeline into Today / Yesterday / This week (Sun–Sat) /
 * Past 30 days, then by month for anything older — so a long history reads
 * as a handful of sections instead of one row per day.
 */
function groupByPeriod(items: TimelineItem[]): TimelinePeriod[] {
  const todayKey = localDateKeyFromMs(Date.now());
  const today = dateFromLocalDateKey(todayKey);
  const weekStartKey = startOfWeekDateKey(todayKey);
  const currentYear = new Date().getFullYear();

  const buckets = new Map<string, TimelinePeriod>();

  for (const item of items) {
    const itemDate = dateFromLocalDateKey(item.dateKey);
    const diffDays =
      today && itemDate
        ? Math.round((today.getTime() - itemDate.getTime()) / 86_400_000)
        : 0;

    let key: string;
    let label: string;
    let showItemDate = true;

    if (diffDays <= 0) {
      key = "today";
      label = "Today";
      showItemDate = false;
    } else if (diffDays === 1) {
      key = "yesterday";
      label = "Yesterday";
      showItemDate = false;
    } else if (item.dateKey >= weekStartKey) {
      key = "week";
      label = "This week";
    } else if (diffDays <= 29) {
      key = "past30";
      label = "Past 30 days";
    } else {
      const monthDate = itemDate ?? today ?? new Date();
      key = `older-${monthDate.getFullYear()}-${monthDate.getMonth()}`;
      const opts: Intl.DateTimeFormatOptions = { month: "long" };
      if (monthDate.getFullYear() !== currentYear) opts.year = "numeric";
      label = new Intl.DateTimeFormat("en-US", opts).format(monthDate);
    }

    const bucket = buckets.get(key) ?? { key, label, showItemDate, items: [] };
    bucket.items.push(item);
    buckets.set(key, bucket);
  }

  return [...buckets.values()];
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
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  /** Shown after a bulk delete, e.g. "Deleted 3 workouts". */
  const [deletedMessage, setDeletedMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!firebaseReady || loading || !user) {
      return () => {
        setSessions(null);
        setActivities(null);
      };
    }
    const unsubSessions = subscribeRecentSessions(setSessions, {
      maxDocs: 100,
    });
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
    return groupByPeriod(buildTimeline(sessions, activities));
  }, [sessions, activities]);

  const workoutIds = useMemo(
    () =>
      groups.flatMap((group) =>
        group.items
          .filter((item) => item.kind === "workout")
          .map((item) => item.id),
      ),
    [groups],
  );
  const allKeys = useMemo(
    () =>
      groups.flatMap((group) =>
        group.items.map((item) => selectionKey(item.kind, item.id)),
      ),
    [groups],
  );
  /** Selected workouts in timeline order (exports and deletes use these). */
  const selectedWorkoutIds = useMemo(
    () =>
      workoutIds.filter((id) => selectedIds.has(selectionKey("workout", id))),
    [workoutIds, selectedIds],
  );
  const selectedActivityIds = useMemo(
    () =>
      groups.flatMap((group) =>
        group.items
          .filter(
            (item) =>
              item.kind === "activity" &&
              selectedIds.has(selectionKey("activity", item.id)),
          )
          .map((item) => item.id),
      ),
    [groups, selectedIds],
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

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(allKeys));
    setExportError(null);
  }, [allKeys]);

  const clearAll = useCallback(() => {
    setSelectedIds(new Set());
    setExportError(null);
    setCopied(false);
  }, []);

  const loadSelectedJournal = useCallback(async () => {
    if (selectedWorkoutIds.length === 0) return null;
    const rows = await getWorkoutSessions(selectedWorkoutIds);
    if (rows.length === 0) {
      setExportError("Couldn’t load those workouts. Try again.");
      return null;
    }
    return formatWorkoutJournalBundle(rows.map((row) => row.session));
  }, [selectedWorkoutIds]);

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
        workoutJournalBundleFilename(selectedWorkoutIds.length),
        text,
      );
    } catch {
      setExportError("Couldn’t download. Check your connection and try again.");
    } finally {
      setExporting(false);
    }
  }, [exporting, loadSelectedJournal, selectedWorkoutIds.length]);

  const handleDelete = useCallback(async () => {
    if (deleting) return;
    setDeleting(true);
    const what = selectionLabel(
      selectedWorkoutIds.length,
      selectedActivityIds.length,
    );
    try {
      const ok = await deleteHistoryItems({
        sessionIds: selectedWorkoutIds,
        activityIds: selectedActivityIds,
      });
      setConfirmDelete(false);
      if (!ok) {
        setExportError(
          "Couldn’t delete everything. Check your connection and try again.",
        );
        return;
      }
      exitSelectMode();
      setDeletedMessage(`Deleted ${what}.`);
      window.setTimeout(() => setDeletedMessage(null), 4000);
    } finally {
      setDeleting(false);
    }
  }, [deleting, selectedWorkoutIds, selectedActivityIds, exitSelectMode]);

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
    <div
      className={`space-y-4 ${
        selecting ? "pb-[calc(7rem+var(--bottom-nav-height,0px))]" : ""
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2
          id="timeline-heading"
          className="text-sm font-semibold uppercase tracking-wide text-zinc-500"
        >
          {selecting ? "Select to export or delete" : "Workouts & activities"}
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          {selecting ? (
            <>
              <button
                type="button"
                onClick={selectAll}
                disabled={allKeys.length === 0}
                className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-50 disabled:opacity-40 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:bg-zinc-900"
              >
                Select all
              </button>
              <button
                type="button"
                onClick={clearAll}
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
              {allKeys.length > 0 ? (
                <button
                  type="button"
                  onClick={() => {
                    setSelecting(true);
                    setExportError(null);
                    setDeletedMessage(null);
                  }}
                  className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:bg-zinc-900"
                >
                  Select
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
          Tap workouts and activities to select them. Copy and download export
          the selected workouts as a journal; activities aren’t exported.
        </p>
      ) : null}

      {deletedMessage ? (
        <p
          role="status"
          className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300"
        >
          {deletedMessage}
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
            <section key={group.key} className="space-y-2">
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
                        selected={selectedIds.has(
                          selectionKey("workout", item.id),
                        )}
                        onToggleSelect={() =>
                          toggleSelected(selectionKey("workout", item.id))
                        }
                      />
                    ) : selecting ? (
                      <ActivitySelectRow
                        selected={selectedIds.has(
                          selectionKey("activity", item.id),
                        )}
                        onToggle={() =>
                          toggleSelected(selectionKey("activity", item.id))
                        }
                      >
                        <ActivityRowBody
                          item={item}
                          showDate={group.showItemDate}
                        />
                      </ActivitySelectRow>
                    ) : (
                      <Link
                        href={item.href}
                        className="flex items-start gap-3 rounded-xl border border-zinc-200 bg-white px-3 py-3 text-left transition hover:border-zinc-300 hover:bg-zinc-50 active:scale-[0.99] dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-700 dark:hover:bg-zinc-900"
                      >
                        <ActivityRowBody
                          item={item}
                          showDate={group.showItemDate}
                        />
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
        <div className="fixed bottom-[var(--bottom-nav-height,0px)] left-0 right-0 z-40 border-t border-zinc-200 bg-zinc-50/95 p-4 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/95">
          <div className="mx-auto flex w-full max-w-2xl flex-col gap-2 px-4 sm:px-5">
            {exportError ? (
              <p className="text-center text-xs text-amber-700 dark:text-amber-400">
                {exportError}
              </p>
            ) : (
              <p
                className="text-center text-xs text-zinc-500"
                aria-live="polite"
              >
                {selectedIds.size === 0
                  ? "Select workouts or activities."
                  : `${selectionLabel(selectedWorkoutIds.length, selectedActivityIds.length)} selected`}
              </p>
            )}
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="h-11 flex-1 gap-2 rounded-xl"
                disabled={selectedWorkoutIds.length === 0 || exporting}
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
                disabled={selectedWorkoutIds.length === 0 || exporting}
                onClick={() => void handleDownloadSelected()}
              >
                <Download className="size-4" />
                {exporting ? "Exporting…" : "Download .txt"}
              </Button>
              <Button
                type="button"
                variant="outline"
                aria-label={`Delete ${selectionLabel(selectedWorkoutIds.length, selectedActivityIds.length)}`}
                className="h-11 shrink-0 gap-2 rounded-xl border-red-200 px-3.5 text-red-700 hover:bg-red-50 hover:text-red-800 dark:border-red-900/60 dark:text-red-400 dark:hover:bg-red-950/40"
                disabled={selectedIds.size === 0 || deleting}
                onClick={() => setConfirmDelete(true)}
              >
                <Trash2 className="size-4" aria-hidden />
                Delete
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      <HistoryDeleteSheet
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        workouts={selectedWorkoutIds.length}
        activities={selectedActivityIds.length}
        deleting={deleting}
        onConfirm={() => void handleDelete()}
      />
      <LogActivitySheet open={logOpen} onClose={() => setLogOpen(false)} />
    </div>
  );
}

type ActivityItem = Extract<TimelineItem, { kind: "activity" }>;

/** Icon, name, day/time and details of an activity row (normal and select mode). */
function ActivityRowBody({
  item,
  showDate,
}: {
  item: ActivityItem;
  showDate: boolean;
}) {
  return (
    <>
      <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300">
        <ActivityTypeIcon icon={item.icon} className="size-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-baseline justify-between gap-2">
          <span className="font-semibold text-zinc-900 dark:text-zinc-50">
            {item.title}
          </span>
          {showDate || item.time ? (
            <span className="text-xs tabular-nums text-zinc-400">
              {showDate ? formatShortDayLabel(item.dateKey) : null}
              {showDate && item.time ? " · " : null}
              {item.time ? formatWorkoutTimeLabel(item.time) : null}
            </span>
          ) : null}
        </span>
        <span className="mt-0.5 block text-xs text-zinc-500">
          Activity · {item.meta}
        </span>
      </span>
    </>
  );
}

/** An activity row in select mode, matching WorkoutCard's selectable style. */
function ActivitySelectRow({
  selected,
  onToggle,
  children,
}: {
  selected: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={selected}
      className={`flex w-full items-start gap-3 rounded-xl border px-3 py-3 text-left transition active:scale-[0.99] ${
        selected
          ? "border-emerald-600 bg-emerald-50/80 dark:border-emerald-500 dark:bg-emerald-950/30"
          : "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950"
      }`}
    >
      <span
        className={`mt-1.5 flex size-6 shrink-0 items-center justify-center rounded-md border ${
          selected
            ? "border-emerald-600 bg-emerald-600 text-white dark:border-emerald-500 dark:bg-emerald-500"
            : "border-zinc-300 bg-white text-transparent dark:border-zinc-600 dark:bg-zinc-950"
        }`}
        aria-hidden
      >
        <Check className="size-3.5" />
      </span>
      {children}
    </button>
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

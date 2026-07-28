"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { ActivityTypeIcon } from "@/components/activity-type-icon";
import { LogActivitySheet } from "@/components/log-activity-sheet";
import { useAuth } from "@/components/auth-provider";
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

export function HomeTimeline() {
  const { user, loading, firebaseReady } = useAuth();
  const [sessions, setSessions] = useState<SessionSummary[] | null>(null);
  const [activities, setActivities] = useState<SavedActivity[] | null>(null);
  const [logOpen, setLogOpen] = useState(false);

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
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2
          id="timeline-heading"
          className="text-sm font-semibold uppercase tracking-wide text-zinc-500"
        >
          Recent
        </h2>
        <button
          type="button"
          onClick={() => setLogOpen(true)}
          className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:bg-zinc-900"
        >
          Log activity
        </button>
      </div>

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
                        href={item.href}
                      />
                    ) : (
                      <div className="flex items-start gap-3 rounded-xl border border-zinc-200 bg-white px-3 py-3 dark:border-zinc-800 dark:bg-zinc-950">
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
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

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

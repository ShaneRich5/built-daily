"use client";

/**
 * Phase 2's "this week" strip: reuses the planner calendar's own week-view
 * cells (components/planner/planner-calendar.tsx) so spacing and markers
 * match the planner exactly, instead of a bespoke home-only layout.
 */
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/components/auth-provider";
import {
  DayCellButton,
  WeekdayHeader,
} from "@/components/planner/planner-calendar";
import { subscribeRecentActivities } from "@/lib/activity-repository";
import type { SavedActivity } from "@/lib/activity-types";
import { buildWeekCalendarCells } from "@/lib/calendar-views";
import {
  buildPlannerListItems,
  buildWorkoutHref,
  markersByDate,
} from "@/lib/planner-list-items";
import { subscribeScheduledWorkoutsInRange } from "@/lib/planner-repository";
import type { ScheduledWorkoutEntry } from "@/lib/planner-types";
import { localDateKeyFromMs } from "@/lib/workout-date";
import {
  subscribeRecentCompletedSessions,
  type CompletedSessionSummary,
} from "@/lib/workout-session-repository";

export function HomeWeekStrip() {
  const router = useRouter();
  const { user, firebaseReady } = useAuth();
  const [todayKey] = useState(() => localDateKeyFromMs(Date.now()));

  const cells = useMemo(
    () => buildWeekCalendarCells(todayKey, todayKey),
    [todayKey],
  );
  const weekStartKey = cells[0]?.dateKey ?? todayKey;
  const weekEndKey = cells[cells.length - 1]?.dateKey ?? todayKey;

  const [entries, setEntries] = useState<ScheduledWorkoutEntry[]>([]);
  const [sessions, setSessions] = useState<CompletedSessionSummary[]>([]);
  const [activities, setActivities] = useState<SavedActivity[]>([]);

  useEffect(() => {
    if (!user || !firebaseReady) {
      return () => {
        setEntries([]);
        setSessions([]);
        setActivities([]);
      };
    }
    const unsubEntries = subscribeScheduledWorkoutsInRange(
      weekStartKey,
      weekEndKey,
      setEntries,
    );
    const unsubSessions = subscribeRecentCompletedSessions(setSessions, {
      maxDocs: 60,
    });
    const unsubActivities = subscribeRecentActivities(setActivities, {
      maxDocs: 60,
    });
    return () => {
      unsubEntries();
      unsubSessions();
      unsubActivities();
    };
  }, [user, firebaseReady, weekStartKey, weekEndKey]);

  const markers = useMemo(
    () => markersByDate(buildPlannerListItems(sessions, entries, activities)),
    [sessions, entries, activities],
  );

  const plannedByDay = useMemo(() => {
    const map = new Map<string, ScheduledWorkoutEntry>();
    for (const e of entries) {
      if (e.status === "planned" && e.exerciseIds.length > 0) {
        map.set(e.dateKey, e);
      }
    }
    return map;
  }, [entries]);

  if (!user || !firebaseReady) return null;

  const handleSelect = (dateKey: string) => {
    const planned = plannedByDay.get(dateKey);
    if (planned) {
      const href = buildWorkoutHref(
        planned.label,
        planned.planId,
        planned.exerciseIds,
      );
      if (href) {
        router.push(href);
        return;
      }
    }
    router.push("/planner");
  };

  return (
    <section className="space-y-2" aria-labelledby="week-strip-heading">
      <div className="flex items-center justify-between">
        <h2
          id="week-strip-heading"
          className="text-sm font-semibold uppercase tracking-wide text-zinc-500"
        >
          This week
        </h2>
        <Link
          href="/planner"
          className="text-xs font-semibold text-zinc-500 underline-offset-2 hover:text-zinc-800 hover:underline dark:hover:text-zinc-300"
        >
          Open planner
        </Link>
      </div>
      <div className="rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950">
        <WeekdayHeader compact />
        <div className="mt-1 grid grid-cols-7 gap-1.5">
          {cells.map((cell) => (
            <DayCellButton
              key={cell.dateKey}
              cell={cell}
              selected={false}
              inRange
              markers={markers.get(cell.dateKey)}
              onSelect={handleSelect}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

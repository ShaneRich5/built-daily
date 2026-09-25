"use client";

/**
 * Phase 2's "this week" strip: reuses the planner calendar's own week-view
 * cells (components/planner/planner-calendar.tsx) so spacing and markers
 * match the planner exactly, instead of a bespoke home-only layout.
 */
import { Play } from "lucide-react";
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
      <div className="flex items-end justify-between gap-2">
        <div>
          <h2
            id="week-strip-heading"
            className="text-sm font-semibold uppercase tracking-wide text-zinc-500"
          >
            This week
          </h2>
          <p className="mt-0.5 text-xs text-zinc-500">
            Tap a planned day to start it, or any other day to plan one.
          </p>
        </div>
        <Link
          href="/planner"
          className="shrink-0 text-xs font-semibold text-zinc-500 underline-offset-2 hover:text-zinc-800 hover:underline dark:hover:text-zinc-300"
        >
          Open planner
        </Link>
      </div>
      <div className="rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950">
        <WeekdayHeader compact />
        <div className="mt-1 grid grid-cols-7 gap-1.5">
          {cells.map((cell) => {
            const planned = plannedByDay.has(cell.dateKey);
            return (
              <div key={cell.dateKey} className="relative">
                <DayCellButton
                  cell={cell}
                  selected={false}
                  inRange
                  markers={markers.get(cell.dateKey)}
                  onSelect={handleSelect}
                />
                {planned ? (
                  <span
                    className="pointer-events-none absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-sky-600 text-white shadow-sm dark:bg-sky-500"
                    title="Planned — tap to start"
                  >
                    <Play className="size-2.5 fill-current" aria-hidden />
                  </span>
                ) : null}
              </div>
            );
          })}
        </div>
        <ul className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-zinc-500">
          <li className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Workout
          </li>
          <li className="flex items-center gap-1.5">
            <span className="flex h-3 w-3 items-center justify-center rounded-full bg-sky-600 dark:bg-sky-500">
              <Play className="size-1.5 fill-current text-white" aria-hidden />
            </span>
            Planned · tap to start
          </li>
        </ul>
      </div>
    </section>
  );
}

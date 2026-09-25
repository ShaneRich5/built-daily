"use client";

/**
 * Phase 2's "this week" strip: a 7-day row on home showing planned vs done
 * vs rest, built on the planner status field from Phase 1. A day with no
 * plan and no workout is "rest", never "missed" — matches the existing
 * heatmap philosophy (see heatmapDayKind in lib/progress-insights.ts).
 */
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { weekStartMondayKey } from "@/lib/progress-insights";
import { shiftLocalDateKey } from "@/lib/workout-activity";
import { subscribeScheduledWorkoutsInRange } from "@/lib/planner-repository";
import type { ScheduledWorkoutEntry } from "@/lib/planner-types";
import {
  subscribeRecentCompletedSessions,
  type SessionSummary,
} from "@/lib/workout-session-repository";
import { dateFromLocalDateKey, localDateKeyFromMs } from "@/lib/workout-date";

type DayStatus = "done" | "planned" | "skipped" | "missed" | "rest" | "future";

type DayInfo = {
  dateKey: string;
  label: string;
  dayNumber: number;
  isToday: boolean;
  status: DayStatus;
  entry: ScheduledWorkoutEntry | null;
};

function sessionDateKey(s: SessionSummary): string {
  if (s.workoutDate) return s.workoutDate;
  const ms = s.endedAt ? s.endedAt.getTime() : s.startedAt.getTime();
  return localDateKeyFromMs(ms);
}

function statusStyles(status: DayStatus, isToday: boolean): string {
  const base =
    "flex h-14 w-11 flex-col items-center justify-center gap-1 rounded-xl border text-xs font-semibold transition sm:w-12";
  const ring = isToday ? " ring-2 ring-offset-1 ring-zinc-900 dark:ring-zinc-100" : "";
  switch (status) {
    case "done":
      return `${base} border-emerald-600 bg-emerald-600 text-white${ring}`;
    case "planned":
      return `${base} border-emerald-600 bg-emerald-50 text-emerald-900 dark:border-emerald-500 dark:bg-emerald-950/50 dark:text-emerald-200${ring}`;
    case "skipped":
      return `${base} border-zinc-200 bg-zinc-100 text-zinc-400 line-through dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-600${ring}`;
    case "missed":
      return `${base} border-dashed border-zinc-300 bg-white text-zinc-400 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-600${ring}`;
    case "future":
      return `${base} border-zinc-200 bg-white text-zinc-400 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-600${ring}`;
    case "rest":
    default:
      return `${base} border-zinc-200 bg-white text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400${ring}`;
  }
}

function statusDot(status: DayStatus): string {
  switch (status) {
    case "done":
      return "●";
    case "planned":
      return "○";
    case "skipped":
      return "–";
    case "missed":
      return "·";
    default:
      return "";
  }
}

export function HomeWeekStrip() {
  const router = useRouter();
  const { user, firebaseReady } = useAuth();
  const [todayKey] = useState(() => localDateKeyFromMs(Date.now()));
  const weekStartKey = useMemo(() => weekStartMondayKey(todayKey), [todayKey]);
  const weekEndKey = useMemo(
    () => shiftLocalDateKey(weekStartKey, 6),
    [weekStartKey],
  );

  const [entries, setEntries] = useState<ScheduledWorkoutEntry[] | null>(null);
  const [sessions, setSessions] = useState<SessionSummary[] | null>(null);

  useEffect(() => {
    if (!user || !firebaseReady) {
      return () => {
        setEntries([]);
        setSessions([]);
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
    return () => {
      unsubEntries();
      unsubSessions();
    };
  }, [user, firebaseReady, weekStartKey, weekEndKey]);

  const days: DayInfo[] = useMemo(() => {
    const completedDateKeys = new Set(
      (sessions ?? [])
        .filter((s) => s.status === "completed")
        .map(sessionDateKey),
    );
    const entriesByDay = new Map<string, ScheduledWorkoutEntry>();
    for (const e of entries ?? []) {
      // Prefer the most decisive entry if a day somehow has more than one.
      const existing = entriesByDay.get(e.dateKey);
      if (
        !existing ||
        (existing.status === "planned" && e.status !== "planned")
      ) {
        entriesByDay.set(e.dateKey, e);
      }
    }

    return Array.from({ length: 7 }, (_, i) => {
      const dateKey = shiftLocalDateKey(weekStartKey, i);
      const date = dateFromLocalDateKey(dateKey);
      const entry = entriesByDay.get(dateKey) ?? null;
      const workedOut = completedDateKeys.has(dateKey);
      const isPast = dateKey < todayKey;
      const isToday = dateKey === todayKey;

      let status: DayStatus;
      if (workedOut || entry?.status === "completed") {
        status = "done";
      } else if (entry?.status === "skipped") {
        status = "skipped";
      } else if (entry?.status === "planned") {
        status = isPast ? "missed" : "planned";
      } else if (isPast || isToday) {
        status = "rest";
      } else {
        status = "future";
      }

      return {
        dateKey,
        label: date
          ? date.toLocaleDateString("en-US", { weekday: "short" }).slice(0, 2)
          : "",
        dayNumber: date ? date.getDate() : 0,
        isToday,
        status,
        entry,
      };
    });
  }, [entries, sessions, weekStartKey, todayKey]);

  if (!user || !firebaseReady) return null;

  const handleDayTap = (day: DayInfo) => {
    if (day.status === "done") return;
    if (day.entry && day.status === "planned") {
      const params = new URLSearchParams();
      if (day.entry.exerciseIds.length > 0) {
        params.set("e", day.entry.exerciseIds.join(","));
      }
      params.set("t", day.entry.label);
      if (day.entry.planId) params.set("p", day.entry.planId);
      const qs = params.toString();
      router.push(qs ? `/workout?${qs}` : "/workout");
      return;
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
      <ul className="flex justify-between gap-1.5 sm:gap-2">
        {days.map((day) => (
          <li key={day.dateKey} className="flex-1">
            <button
              type="button"
              onClick={() => handleDayTap(day)}
              disabled={day.status === "done"}
              className={statusStyles(day.status, day.isToday)}
              aria-label={`${day.label} ${day.dayNumber}, ${day.status}`}
            >
              <span className="text-[10px] font-medium uppercase tracking-wide opacity-80">
                {day.label}
              </span>
              <span className="text-sm tabular-nums">{day.dayNumber}</span>
              <span className="text-[10px] leading-none" aria-hidden>
                {statusDot(day.status)}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

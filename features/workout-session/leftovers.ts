/**
 * Leftovers: exercises you didn't get to when you finish. Each one goes to the
 * next planned day for this template, to Unscheduled, or away. Pure helpers;
 * the planner writes live behind `LeftoverPlanner`.
 */
import { dateFromLocalDateKey } from "@/lib/workout-date";
import {
  exerciseProgress,
  type SessionExercise,
} from "@/features/workout-session/session-model";

export type LeftoverChoice = "next" | "later" | "drop";

/** The next open planned day for the template this workout came from. */
export type NextPlannedDay = {
  entryId: string;
  label: string;
  dateKey: string;
};

/** What Finish writes to the planner. */
export type LeftoverPlan = {
  next: NextPlannedDay | null;
  /** Exercise ids added to `next`. */
  nextIds: string[];
  /** Exercise ids for one new Unscheduled entry. */
  laterIds: string[];
  laterLabel: string;
};

/** Planner access for the finish sheet; absent when nothing can be saved (signed out, editing). */
export type LeftoverPlanner = {
  findNext: (planId: string) => Promise<NextPlannedDay | null>;
  save: (plan: LeftoverPlan) => Promise<void>;
};

/** Exercises with nothing logged, plan and maybe alike, in workout order. */
export function untouchedExercises(
  exercises: SessionExercise[],
): SessionExercise[] {
  return exercises.filter(
    (item) => exerciseProgress(item.sets) === "not_started",
  );
}

/** Maybes default to Drop (never missed). Plan exercises carry over: next time if there is one. */
export function defaultLeftoverChoice(
  item: SessionExercise,
  hasNext: boolean,
): LeftoverChoice {
  if (item.section === "maybe") return "drop";
  return hasNext ? "next" : "later";
}

export function buildLeftoverPlan(
  items: SessionExercise[],
  choices: Record<string, LeftoverChoice>,
  next: NextPlannedDay | null,
  workoutTitle: string,
): LeftoverPlan {
  const idsFor = (choice: LeftoverChoice) =>
    items
      .filter((item) => choices[item.lineId] === choice)
      .map((item) => item.exercise.id);
  return {
    next,
    nextIds: next ? idsFor("next") : [],
    laterIds: idsFor("later"),
    laterLabel: `Leftovers from ${workoutTitle}`,
  };
}

/** "Mon, Nov 16" */
export function plannedDayLabel(dateKey: string): string {
  const date = dateFromLocalDateKey(dateKey);
  if (!date) return dateKey;
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(date);
}

/** The line under the choices, naming where each option sends things. */
export function leftoverHelpText(next: NextPlannedDay | null): string {
  const nextPart = next
    ? `Next time adds it to ${next.label} on ${plannedDayLabel(next.dateKey)}. `
    : "";
  return `${nextPart}Later puts it in Unscheduled. Maybes default to Drop, and dropping is never counted as missed.`;
}

/** Pure helpers for the read-only view of a finished workout. */
import { sessionMuscleSummary } from "@/lib/exercise-muscle";
import {
  formatDurationSec,
  formatSetSummary,
} from "@/lib/workout-journal-export";
import { formatSessionJournalMeta } from "@/lib/workout-date";
import type { WorkoutSessionDoc } from "@/lib/workout-types";

export type SavedSessionStat = { label: string; value: string };

export type SavedSessionExercise = {
  lineId: string;
  name: string;
  /** One chip per set with values, e.g. "135 lb × 8". */
  sets: string[];
  note: string | null;
};

export type SavedSessionSummary = {
  title: string;
  when: string;
  note: string | null;
  stats: SavedSessionStat[];
  muscles: string | null;
  exercises: SavedSessionExercise[];
};

export function summarizeSavedSession(session: WorkoutSessionDoc): SavedSessionSummary {
  const stats: SavedSessionStat[] = [
    { label: session.exerciseCount === 1 ? "Exercise" : "Exercises", value: String(session.exerciseCount) },
    { label: session.setCount === 1 ? "Set" : "Sets", value: String(session.setCount) },
  ];
  // Older workouts may carry a duration from the old session timer.
  if (session.activeDurationSec != null && session.activeDurationSec > 0) {
    stats.push({ label: "Duration", value: formatDurationSec(session.activeDurationSec) });
  }
  return {
    title: session.title,
    when: formatSessionJournalMeta(
      session.workoutDate,
      session.workoutTime,
      (session.endedAt ?? session.startedAt).getTime(),
    ),
    note: session.workoutNote?.trim() || null,
    stats,
    muscles: sessionMuscleSummary(
      session.lines.map((line) => ({
        id: line.exerciseId,
        name: line.nameSnapshot,
        metric: line.metric,
      })),
    ),
    exercises: session.lines.map((line) => ({
      lineId: line.lineId,
      name: line.nameSnapshot,
      sets: line.sets.map(formatSetSummary).filter((summary) => summary !== "—"),
      note: session.exerciseNotesByLineId?.[line.lineId]?.trim() || null,
    })),
  };
}

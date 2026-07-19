import {
  formatSessionJournalMeta,
  formatWorkoutHeaderDate,
} from "@/lib/workout-date";
import type {
  SessionLine,
  SetLog,
  WorkoutSessionDoc,
} from "@/lib/workout-types";

export function formatDurationSec(totalSec: number): string {
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) {
    return `${h}h ${m}m`;
  }
  if (m > 0) {
    return s > 0 ? `${m} min ${s}s` : `${m} min`;
  }
  return `${s}s`;
}

function formatHoldSec(sec: number): string {
  if (sec >= 60) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return s > 0 ? `${m}:${String(s).padStart(2, "0")}` : `${m}:00`;
  }
  return `${sec}s`;
}

/** Single-line set summary for UI and journal export. */
export function formatSetSummary(set: SetLog): string {
  const parts: string[] = [];

  if (set.weight != null && set.reps != null) {
    parts.push(`${set.weight} lb × ${set.reps}`);
  } else if (set.weight != null) {
    parts.push(`${set.weight} lb`);
  } else if (set.reps != null) {
    parts.push(`${set.reps} reps`);
  } else if (set.durationSec != null) {
    parts.push(formatHoldSec(set.durationSec));
  }

  if (set.paceMph != null) {
    parts.push(`${set.paceMph} mph`);
  }
  if (set.inclinePercent != null) {
    parts.push(`${set.inclinePercent}%`);
  }
  if (set.resistanceLevel != null) {
    parts.push(`R${set.resistanceLevel}`);
  }
  if (set.distanceMiles != null) {
    parts.push(`${set.distanceMiles} mi`);
  }

  if (set.timedSetSec != null && set.durationSec == null) {
    parts.push(`(${formatHoldSec(set.timedSetSec)})`);
  }

  return parts.length > 0 ? parts.join(" · ") : "—";
}

function formatSetLine(set: SetLog, index: number): string {
  let line = `  ${index + 1}. ${formatSetSummary(set)}`;
  if (set.note) {
    line += `\n     Note: ${set.note}`;
  }
  return line;
}

function formatExerciseBlock(
  line: SessionLine,
  exerciseNote: string | null | undefined,
): string {
  const blocks: string[] = [line.nameSnapshot];
  if (exerciseNote) {
    blocks.push(`  Note: ${exerciseNote}`);
  }
  if (line.sets.length === 0) {
    blocks.push("  (no sets logged)");
  } else {
    line.sets.forEach((set, i) => {
      blocks.push(formatSetLine(set, i));
    });
  }
  return blocks.join("\n");
}

/**
 * Plain-text workout log for pasting into a journal (Notes, Day One, Notion, etc.).
 */
export function formatWorkoutJournalEntry(doc: WorkoutSessionDoc): string {
  const fallbackMs = (doc.endedAt ?? doc.startedAt).getTime();
  const meta: string[] = [
    formatSessionJournalMeta(doc.workoutDate, doc.workoutTime, fallbackMs),
  ];

  if (doc.activeDurationSec != null && doc.activeDurationSec > 0) {
    meta.push(formatDurationSec(doc.activeDurationSec));
  }

  meta.push(
    `${doc.exerciseCount} exercise${doc.exerciseCount === 1 ? "" : "s"}`,
  );
  meta.push(`${doc.setCount} set${doc.setCount === 1 ? "" : "s"}`);

  const sections: string[] = [doc.title, meta.join(" · ")];

  if (doc.workoutNote) {
    sections.push("", "Notes", doc.workoutNote);
  }

  sections.push("", "Exercises", "");

  const notes = doc.exerciseNotesByLineId;
  const exerciseBlocks = doc.lines.map((line) =>
    formatExerciseBlock(line, notes?.[line.lineId] ?? null),
  );
  sections.push(exerciseBlocks.join("\n\n"));

  return sections.join("\n").trimEnd() + "\n";
}

/** Safe filename stem for a downloaded `.txt` journal file. */
export function workoutJournalFilename(doc: WorkoutSessionDoc): string {
  const stem = doc.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  const dateStem =
    doc.workoutDate ??
    formatWorkoutHeaderDate((doc.endedAt ?? doc.startedAt).getTime())
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  return `${dateStem}-${stem || "workout"}.txt`;
}

"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  formatWorkoutJournalEntry,
  workoutJournalFilename,
} from "@/lib/workout-journal-export";
import { createWorkoutPlan } from "@/lib/workout-plan-repository";
import {
  buildWorkoutSessionDoc,
  type ActiveWorkoutFinishSnapshot,
} from "@/lib/workout-session-mapper";
import {
  deleteWorkoutSession,
  reopenSessionAsInProgress,
  updateCompletedWorkoutSession,
} from "@/lib/workout-session-repository";
import { NOTE_LIMITS, type WorkoutPlanDoc, type WorkoutSessionDoc } from "@/lib/workout-types";
import { summarizeSavedSession } from "@/features/saved-session/saved-session-model";
import { SavedSessionView } from "@/features/saved-session/saved-session-view";
import { copyText, downloadTextFile } from "@/features/workout-session/journal-actions";
import { initialDataFromSavedSession } from "@/features/workout-session/session-snapshot";
import { WorkoutSessionScreen } from "@/features/workout-session/workout-session-screen";

type SavedSessionScreenProps = {
  sessionId: string;
  session: WorkoutSessionDoc;
  backHref?: string;
  onSaved?: (session: WorkoutSessionDoc) => void;
};

/** A template made from this workout: same exercises, one target set per logged set. */
function templateFromSession(session: WorkoutSessionDoc): WorkoutPlanDoc {
  const now = new Date();
  return {
    name: session.title.trim().slice(0, NOTE_LIMITS.title) || "Workout template",
    createdAt: now,
    updatedAt: now,
    source: "custom",
    lines: session.lines.map((line) => ({
      lineId: line.lineId,
      exerciseId: line.exerciseId,
      nameSnapshot: line.nameSnapshot,
      metric: line.metric,
      targetSets: Math.max(1, line.sets.length),
      notes: session.exerciseNotesByLineId?.[line.lineId] ?? null,
      // Keep maybes and any alternates picked up mid-workout.
      ...(line.section ? { section: line.section } : {}),
      ...(line.alternates?.length ? { alternates: line.alternates } : {}),
    })),
  };
}

/** A finished workout: read view by default, the workout editor on "Edit workout". */
export function SavedSessionScreen({
  sessionId,
  session: initialSession,
  backHref = "/",
  onSaved,
}: SavedSessionScreenProps) {
  const router = useRouter();
  const [session, setSession] = useState(initialSession);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [journalCopied, setJournalCopied] = useState(false);

  const summary = useMemo(() => summarizeSavedSession(session), [session]);
  const exercises = useMemo(
    () =>
      session.lines.map((line) => ({
        id: line.exerciseId,
        name: line.nameSnapshot,
        metric: line.metric,
      })),
    [session.lines],
  );

  /** Run one of the menu actions with a shared busy flag and error message. */
  const run = async (action: () => Promise<void>, failure: string) => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch {
      setError(failure);
    } finally {
      setBusy(false);
    }
  };

  const save = async (snapshot: ActiveWorkoutFinishSnapshot) => {
    const doc = buildWorkoutSessionDoc(snapshot, {
      status: "completed",
      endedAt: session.endedAt,
    });
    try {
      const saved = await updateCompletedWorkoutSession(sessionId, doc);
      if (!saved) {
        window.alert("Couldn’t save. Check that you’re signed in.");
        return;
      }
      setSession(saved);
      onSaved?.(saved);
      setEditing(false);
      window.scrollTo({ top: 0 });
    } catch {
      window.alert("Save failed. Check your connection and try again.");
    }
  };

  if (editing) {
    return (
      <WorkoutSessionScreen
        {...initialDataFromSavedSession(session)}
        historyExcludeSessionId={sessionId}
        editing={{ onCancel: () => setEditing(false) }}
        onFinish={save}
      />
    );
  }

  return (
    <SavedSessionView
      summary={summary}
      exercises={exercises}
      backHref={backHref}
      journalCopied={journalCopied}
      error={error}
      busy={busy}
      onEdit={() => {
        setError(null);
        setEditing(true);
        window.scrollTo({ top: 0 });
      }}
      onReopen={() =>
        void run(async () => {
          if (!(await reopenSessionAsInProgress(sessionId))) throw new Error("reopen");
          router.push(`/workout?s=${encodeURIComponent(sessionId)}`);
        }, "Couldn’t reopen this workout.")
      }
      onSaveAsTemplate={() =>
        void run(async () => {
          const templateId = await createWorkoutPlan(templateFromSession(session));
          if (!templateId) throw new Error("template");
          router.push(`/templates/${encodeURIComponent(templateId)}`);
        }, "Couldn’t create a template from this workout.")
      }
      onCopyJournal={() =>
        void copyText(formatWorkoutJournalEntry(session)).then((ok) => {
          if (!ok) return;
          setJournalCopied(true);
          window.setTimeout(() => setJournalCopied(false), 2000);
        })
      }
      onDownloadJournal={() =>
        downloadTextFile(workoutJournalFilename(session), formatWorkoutJournalEntry(session))
      }
      onDelete={() => {
        if (!window.confirm("Delete this workout permanently? This cannot be undone.")) return;
        void run(async () => {
          if (!(await deleteWorkoutSession(sessionId))) throw new Error("delete");
          router.push(backHref);
        }, "Couldn’t delete this workout.");
      }}
    />
  );
}

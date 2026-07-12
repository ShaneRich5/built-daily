"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, Copy, Download, Play, Plus, Save, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ExerciseMetric } from "@/lib/exercise-catalog";
import {
  formatDurationSec,
  formatWorkoutJournalEntry,
  workoutJournalFilename,
} from "@/lib/workout-journal-export";
import { formatWorkoutHeaderDate } from "@/lib/workout-date";
import { uiSetRowToSetLog, type UiSetRow } from "@/lib/workout-session-mapper";
import {
  deleteWorkoutSession,
  reopenSessionAsInProgress,
  updateCompletedWorkoutSession,
} from "@/lib/workout-session-repository";
import {
  NOTE_LIMITS,
  type SessionLine,
  type SetLog,
  type WorkoutSessionDoc,
} from "@/lib/workout-types";

type WorkoutSessionDetailProps = {
  sessionId: string;
  session: WorkoutSessionDoc;
  backHref?: string;
  onSaved?: (session: WorkoutSessionDoc) => void;
};

const numberFieldClassName =
  "h-11 font-mono tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none";

function emptyUiSet(): UiSetRow {
  return { weight: "", reps: "", seconds: "", timedSetSec: "", note: "" };
}

function setLogToUi(set: SetLog): UiSetRow {
  return {
    weight: set.weight != null ? String(set.weight) : "",
    reps: set.reps != null ? String(set.reps) : "",
    seconds: set.durationSec != null ? String(set.durationSec) : "",
    timedSetSec: set.timedSetSec != null ? String(set.timedSetSec) : "",
    note: set.note ?? "",
  };
}

function cloneSession(session: WorkoutSessionDoc): WorkoutSessionDoc {
  return {
    ...session,
    lines: session.lines.map((line) => ({
      ...line,
      sets: line.sets.map((s) => ({ ...s })),
    })),
    exerciseNotesByLineId: session.exerciseNotesByLineId
      ? { ...session.exerciseNotesByLineId }
      : null,
    previewExerciseNames: [...session.previewExerciseNames],
  };
}

function draftFromSession(session: WorkoutSessionDoc): {
  title: string;
  workoutNote: string;
  exerciseNotes: Record<string, string>;
  lines: SessionLine[];
} {
  const notes: Record<string, string> = {};
  for (const line of session.lines) {
    notes[line.lineId] = session.exerciseNotesByLineId?.[line.lineId] ?? "";
  }
  return {
    title: session.title,
    workoutNote: session.workoutNote ?? "",
    exerciseNotes: notes,
    lines: session.lines.map((line) => ({
      ...line,
      sets: line.sets.map((s) => ({ ...s })),
    })),
  };
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

function buildSaveDoc(
  base: WorkoutSessionDoc,
  title: string,
  workoutNote: string,
  exerciseNotes: Record<string, string>,
  lines: SessionLine[],
): WorkoutSessionDoc {
  const cleanedNotes: Record<string, string> = {};
  for (const line of lines) {
    const n = (exerciseNotes[line.lineId] ?? "").trim().slice(0, NOTE_LIMITS.exerciseNote);
    if (n) cleanedNotes[line.lineId] = n;
  }
  const setCount = lines.reduce((acc, l) => acc + l.sets.length, 0);
  return {
    ...base,
    status: "completed",
    title: title.trim().slice(0, NOTE_LIMITS.title) || "Workout",
    workoutNote:
      workoutNote.trim().slice(0, NOTE_LIMITS.workoutNote) || null,
    exerciseNotesByLineId:
      Object.keys(cleanedNotes).length > 0 ? cleanedNotes : null,
    lines,
    exerciseCount: lines.length,
    setCount,
    previewExerciseNames: lines.slice(0, 3).map((l) => l.nameSnapshot),
  };
}

export function WorkoutSessionDetail({
  sessionId,
  session,
  backHref = "/",
  onSaved,
}: WorkoutSessionDetailProps) {
  const router = useRouter();
  const [base, setBase] = useState(() => cloneSession(session));
  const [title, setTitle] = useState(session.title);
  const [workoutNote, setWorkoutNote] = useState(session.workoutNote ?? "");
  const [exerciseNotes, setExerciseNotes] = useState<Record<string, string>>(
    () => draftFromSession(session).exerciseNotes,
  );
  const [lines, setLines] = useState<SessionLine[]>(
    () => draftFromSession(session).lines,
  );
  const [saving, setSaving] = useState(false);
  const [reopening, setReopening] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const d = draftFromSession(session);
    setBase(cloneSession(session));
    setTitle(d.title);
    setWorkoutNote(d.workoutNote);
    setExerciseNotes(d.exerciseNotes);
    setLines(d.lines);
    setSaveError(null);
  }, [session]);

  const previewDoc = useMemo(
    () => buildSaveDoc(base, title, workoutNote, exerciseNotes, lines),
    [base, title, workoutNote, exerciseNotes, lines],
  );

  const journalText = formatWorkoutJournalEntry(previewDoc);
  const canSave =
    title.trim().length > 0 &&
    lines.length > 0 &&
    lines.every((l) => l.sets.length > 0) &&
    lines.reduce((acc, l) => acc + l.sets.length, 0) > 0;

  const metaParts = [
    formatWorkoutHeaderDate((base.endedAt ?? base.startedAt).getTime()),
    base.activeDurationSec != null && base.activeDurationSec > 0
      ? formatDurationSec(base.activeDurationSec)
      : null,
  ].filter(Boolean);

  const updateSetField = (
    lineIndex: number,
    setIndex: number,
    metric: ExerciseMetric,
    field: keyof UiSetRow,
    value: string,
  ) => {
    setLines((prev) => {
      const next = prev.map((line, li) => {
        if (li !== lineIndex) return line;
        const sets = line.sets.map((set, si) => {
          if (si !== setIndex) return set;
          const ui = setLogToUi(set);
          ui[field] = value;
          return uiSetRowToSetLog(ui, metric);
        });
        return { ...line, sets };
      });
      return next;
    });
  };

  const addSet = (lineIndex: number) => {
    setLines((prev) =>
      prev.map((line, li) => {
        if (li !== lineIndex) return line;
        return {
          ...line,
          sets: [...line.sets, uiSetRowToSetLog(emptyUiSet(), line.metric)],
        };
      }),
    );
  };

  const removeSet = (lineIndex: number, setIndex: number) => {
    setLines((prev) =>
      prev.map((line, li) => {
        if (li !== lineIndex) return line;
        if (line.sets.length <= 1) return line;
        return {
          ...line,
          sets: line.sets.filter((_, si) => si !== setIndex),
        };
      }),
    );
  };

  const removeExercise = (lineIndex: number) => {
    setLines((prev) => {
      if (prev.length <= 1) return prev;
      const removed = prev[lineIndex];
      if (!removed) return prev;
      setExerciseNotes((notes) => {
        const next = { ...notes };
        delete next[removed.lineId];
        return next;
      });
      return prev.filter((_, i) => i !== lineIndex);
    });
  };

  const handleSave = useCallback(async () => {
    if (!canSave || saving) return;
    setSaving(true);
    setSaveError(null);
    try {
      const doc = buildSaveDoc(base, title, workoutNote, exerciseNotes, lines);
      const saved = await updateCompletedWorkoutSession(sessionId, doc);
      if (!saved) {
        setSaveError("Couldn’t save. Check that you’re signed in.");
        return;
      }
      setBase(cloneSession(saved));
      onSaved?.(saved);
      setSavedFlash(true);
      window.setTimeout(() => setSavedFlash(false), 2000);
    } catch {
      setSaveError(
        "Save failed. If this keeps happening, deploy updated Firestore rules.",
      );
    } finally {
      setSaving(false);
    }
  }, [
    base,
    canSave,
    exerciseNotes,
    lines,
    onSaved,
    saving,
    sessionId,
    title,
    workoutNote,
  ]);

  const handleReopen = useCallback(async () => {
    if (reopening) return;
    setReopening(true);
    setSaveError(null);
    try {
      const result = await reopenSessionAsInProgress(sessionId);
      if (!result) {
        setSaveError("Couldn’t reopen this workout.");
        return;
      }
      router.push(`/workout?s=${encodeURIComponent(sessionId)}`);
    } catch {
      setSaveError("Couldn’t reopen this workout.");
    } finally {
      setReopening(false);
    }
  }, [reopening, router, sessionId]);

  const handleDelete = useCallback(async () => {
    if (deleting) return;
    if (
      !window.confirm(
        "Delete this workout? This cannot be undone.",
      )
    ) {
      return;
    }
    setDeleting(true);
    setSaveError(null);
    try {
      const ok = await deleteWorkoutSession(sessionId);
      if (!ok) {
        setSaveError("Couldn’t delete this workout.");
        return;
      }
      router.push(backHref);
    } catch {
      setSaveError("Couldn’t delete this workout.");
    } finally {
      setDeleting(false);
    }
  }, [backHref, deleting, router, sessionId]);

  const handleCopy = useCallback(async () => {
    const ok = await copyText(journalText);
    if (ok) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    }
  }, [journalText]);

  return (
    <div className="flex flex-1 flex-col gap-6 pb-28">
      <div className="space-y-3">
        <Link
          href={backHref}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
        >
          <ArrowLeft className="size-4" />
          Back
        </Link>
        <header className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
              Finished
            </p>
          </div>
          <Label htmlFor="session-title" className="sr-only">
            Workout title
          </Label>
          <Input
            id="session-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={NOTE_LIMITS.title}
            className="h-12 rounded-xl text-xl font-semibold"
            placeholder="Workout title"
          />
          <p className="text-sm text-zinc-500">{metaParts.join(" · ")}</p>
        </header>
      </div>

      <Button
        type="button"
        variant="outline"
        className="h-11 w-full gap-2 rounded-xl border-amber-200 bg-amber-50 text-amber-900 hover:bg-amber-100 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200 dark:hover:bg-amber-950/70"
        disabled={reopening}
        onClick={() => void handleReopen()}
      >
        <Play className="size-4" />
        {reopening ? "Reopening…" : "Move back to in progress"}
      </Button>

      <section className="space-y-2">
        <Label htmlFor="workout-note">Notes</Label>
        <Textarea
          id="workout-note"
          value={workoutNote}
          onChange={(e) => setWorkoutNote(e.target.value)}
          maxLength={NOTE_LIMITS.workoutNote}
          rows={3}
          placeholder="How the session felt…"
          className="rounded-xl"
        />
      </section>

      <section className="space-y-3" aria-labelledby="exercises-heading">
        <h2
          id="exercises-heading"
          className="text-xs font-semibold uppercase tracking-wide text-zinc-500"
        >
          Exercises
        </h2>
        <ul className="space-y-3">
          {lines.map((line, lineIndex) => (
            <li
              key={line.lineId}
              className="space-y-3 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Label
                    htmlFor={`name-${line.lineId}`}
                    className="text-xs text-zinc-500"
                  >
                    Exercise
                  </Label>
                  <button
                    type="button"
                    onClick={() => removeExercise(lineIndex)}
                    disabled={lines.length <= 1}
                    className="inline-flex h-8 items-center gap-1 rounded-md px-2 text-xs font-medium text-zinc-400 hover:bg-red-50 hover:text-red-700 disabled:opacity-30 dark:hover:bg-red-950/40 dark:hover:text-red-300"
                    aria-label={`Remove ${line.nameSnapshot}`}
                  >
                    <Trash2 className="size-3.5" />
                    Remove
                  </button>
                </div>
                <Input
                  id={`name-${line.lineId}`}
                  value={line.nameSnapshot}
                  onChange={(e) => {
                    const nameSnapshot = e.target.value.slice(0, 200);
                    setLines((prev) =>
                      prev.map((l, i) =>
                        i === lineIndex ? { ...l, nameSnapshot } : l,
                      ),
                    );
                  }}
                  className="h-10 rounded-lg font-medium"
                />
                <Label
                  htmlFor={`ex-note-${line.lineId}`}
                  className="text-xs text-zinc-500"
                >
                  Exercise note
                </Label>
                <Textarea
                  id={`ex-note-${line.lineId}`}
                  value={exerciseNotes[line.lineId] ?? ""}
                  onChange={(e) =>
                    setExerciseNotes((prev) => ({
                      ...prev,
                      [line.lineId]: e.target.value,
                    }))
                  }
                  maxLength={NOTE_LIMITS.exerciseNote}
                  rows={2}
                  placeholder="Optional"
                  className="rounded-lg"
                />
              </div>

              <ul className="space-y-2">
                {line.sets.map((set, setIndex) => (
                  <li
                    key={`${line.lineId}-${setIndex}`}
                    className="rounded-lg border border-zinc-100 p-2 dark:border-zinc-800"
                  >
                    <div className="mb-1.5 flex items-center justify-between">
                      <span className="text-xs font-medium text-zinc-400">
                        Set {setIndex + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeSet(lineIndex, setIndex)}
                        disabled={line.sets.length <= 1}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 disabled:opacity-30 dark:hover:bg-zinc-900 dark:hover:text-zinc-200"
                        aria-label={`Remove set ${setIndex + 1}`}
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                    <SetEditors
                      metric={line.metric}
                      set={set}
                      lineIndex={lineIndex}
                      setIndex={setIndex}
                      onChange={updateSetField}
                    />
                    <Label
                      htmlFor={`set-note-${line.lineId}-${setIndex}`}
                      className="mt-2 block text-xs text-zinc-500"
                    >
                      Set note
                    </Label>
                    <Input
                      id={`set-note-${line.lineId}-${setIndex}`}
                      value={set.note ?? ""}
                      onChange={(e) =>
                        updateSetField(
                          lineIndex,
                          setIndex,
                          line.metric,
                          "note",
                          e.target.value,
                        )
                      }
                      maxLength={NOTE_LIMITS.setNote}
                      placeholder="Optional"
                      className="mt-1 h-9"
                    />
                  </li>
                ))}
              </ul>

              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => addSet(lineIndex)}
              >
                <Plus className="size-3.5" />
                Add set
              </Button>
            </li>
          ))}
        </ul>
      </section>

      {saveError ? (
        <p className="text-sm text-amber-700 dark:text-amber-400" role="alert">
          {saveError}
        </p>
      ) : null}

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button
          type="button"
          variant="outline"
          className="h-11 flex-1 gap-2 rounded-xl"
          onClick={() => void handleCopy()}
        >
          {copied ? (
            <>
              <Check className="size-4" />
              Copied
            </>
          ) : (
            <>
              <Copy className="size-4" />
              Copy journal
            </>
          )}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-11 flex-1 gap-2 rounded-xl"
          onClick={() =>
            downloadTextFile(workoutJournalFilename(previewDoc), journalText)
          }
        >
          <Download className="size-4" />
          Download .txt
        </Button>
      </div>

      <Button
        type="button"
        variant="ghost"
        className="h-11 w-full gap-2 rounded-xl text-red-700 hover:bg-red-50 hover:text-red-800 dark:text-red-400 dark:hover:bg-red-950/40 dark:hover:text-red-300"
        disabled={deleting}
        onClick={() => void handleDelete()}
      >
        <Trash2 className="size-4" />
        {deleting ? "Deleting…" : "Delete workout"}
      </Button>

      <div className="fixed bottom-0 left-0 right-0 border-t border-zinc-200 bg-zinc-50/95 p-4 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/95">
        <div className="mx-auto w-full max-w-2xl px-4 sm:px-5">
          <Button
            type="button"
            size="lg"
            className="h-12 w-full gap-2 rounded-xl bg-emerald-600 text-base font-semibold text-white hover:bg-emerald-600/90 dark:bg-emerald-500 dark:hover:bg-emerald-500/90"
            disabled={!canSave || saving}
            onClick={() => void handleSave()}
          >
            {savedFlash ? (
              <>
                <Check className="size-4" />
                Saved
              </>
            ) : (
              <>
                <Save className="size-4" />
                {saving ? "Saving…" : "Save changes"}
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

function SetEditors({
  metric,
  set,
  lineIndex,
  setIndex,
  onChange,
}: {
  metric: ExerciseMetric;
  set: SetLog;
  lineIndex: number;
  setIndex: number;
  onChange: (
    lineIndex: number,
    setIndex: number,
    metric: ExerciseMetric,
    field: keyof UiSetRow,
    value: string,
  ) => void;
}) {
  const ui = setLogToUi(set);

  if (metric === "duration") {
    return (
      <Input
        type="number"
        inputMode="numeric"
        min={0}
        step={1}
        value={ui.seconds}
        onChange={(e) =>
          onChange(lineIndex, setIndex, metric, "seconds", e.target.value)
        }
        placeholder="Seconds"
        className={numberFieldClassName}
        aria-label={`Hold seconds, set ${setIndex + 1}`}
      />
    );
  }

  if (metric === "bodyweight_reps") {
    return (
      <Input
        type="number"
        inputMode="numeric"
        min={0}
        step={1}
        value={ui.reps}
        onChange={(e) =>
          onChange(lineIndex, setIndex, metric, "reps", e.target.value)
        }
        placeholder="Reps"
        className={numberFieldClassName}
        aria-label={`Reps, set ${setIndex + 1}`}
      />
    );
  }

  return (
    <div className="grid grid-cols-2 gap-2">
      <Input
        type="number"
        inputMode="decimal"
        min={0}
        step="any"
        value={ui.weight}
        onChange={(e) =>
          onChange(lineIndex, setIndex, metric, "weight", e.target.value)
        }
        placeholder="lb"
        className={numberFieldClassName}
        aria-label={`Weight, set ${setIndex + 1}`}
      />
      <Input
        type="number"
        inputMode="numeric"
        min={0}
        step={1}
        value={ui.reps}
        onChange={(e) =>
          onChange(lineIndex, setIndex, metric, "reps", e.target.value)
        }
        placeholder="reps"
        className={numberFieldClassName}
        aria-label={`Reps, set ${setIndex + 1}`}
      />
    </div>
  );
}

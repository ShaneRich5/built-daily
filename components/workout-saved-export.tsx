"use client";

import { Check, Copy, Download } from "lucide-react";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  formatWorkoutJournalEntry,
  workoutJournalFilename,
} from "@/lib/workout-journal-export";
import type { WorkoutSessionDoc } from "@/lib/workout-types";

type WorkoutSavedExportProps = {
  session: WorkoutSessionDoc;
  /** False when Firestore save was skipped or failed (e.g. signed out). */
  persisted: boolean;
  onDone: () => void;
};

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

export function WorkoutSavedExport({
  session,
  persisted,
  onDone,
}: WorkoutSavedExportProps) {
  const journalText = formatWorkoutJournalEntry(session);
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);

  const handleCopy = useCallback(async () => {
    const ok = await copyText(journalText);
    if (ok) {
      setCopied(true);
      setCopyFailed(false);
      window.setTimeout(() => setCopied(false), 2000);
    } else {
      setCopyFailed(true);
    }
  }, [journalText]);

  const handleDownload = useCallback(() => {
    downloadTextFile(workoutJournalFilename(session), journalText);
  }, [journalText, session]);

  return (
    <div className="flex flex-1 flex-col gap-5 pb-28 pt-2">
      <header className="space-y-1">
        <p
          className={
            persisted
              ? "text-sm font-medium text-emerald-700 dark:text-emerald-400"
              : "text-sm font-medium text-amber-700 dark:text-amber-400"
          }
        >
          {persisted ? "Workout saved" : "Not saved to your account"}
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Add it to your journal
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {persisted
            ? "Copy this log and paste it into Notes, Day One, Notion, or wherever you keep your training journal."
            : "Sign in before finishing next time so it appears under Recent workouts. You can still copy this log now."}
        </p>
      </header>

      <pre
        className="max-h-[min(52vh,28rem)] overflow-auto rounded-xl border border-zinc-200 bg-white p-4 font-mono text-xs leading-relaxed whitespace-pre-wrap text-zinc-800 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200"
        tabIndex={0}
        aria-label="Journal entry preview"
      >
        {journalText}
      </pre>

      {copyFailed ? (
        <p className="text-sm text-amber-700 dark:text-amber-400" role="status">
          Couldn’t copy automatically — select the text above, or download the
          file.
        </p>
      ) : null}

      <div className="fixed bottom-0 left-0 right-0 border-t border-zinc-200 bg-zinc-50/95 p-4 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/95">
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-2 px-4 sm:px-5">
          <Button
            type="button"
            size="lg"
            className="h-12 w-full gap-2 rounded-xl bg-emerald-600 text-base font-semibold text-white hover:bg-emerald-600/90 dark:bg-emerald-500 dark:hover:bg-emerald-500/90"
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
                Copy journal entry
              </>
            )}
          </Button>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="h-11 flex-1 gap-2 rounded-xl"
              onClick={handleDownload}
            >
              <Download className="size-4" />
              Download .txt
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="lg"
              className="h-11 flex-1 rounded-xl"
              onClick={onDone}
            >
              Done
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, MoreHorizontal, Plus, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { CatalogExercise } from "@/lib/exercise-catalog";
import { buildWorkoutHref } from "@/lib/planner-list-items";
import { createWorkoutPlan, deleteWorkoutPlan, updateWorkoutPlan } from "@/lib/workout-plan-repository";
import { getRecentCompletedSessions } from "@/lib/workout-session-repository";
import { NOTE_LIMITS, type PlanLine, type WorkoutPlanDoc } from "@/lib/workout-types";
import { recentExercises } from "@/features/workout-session/exercise-suggestions";
import { ExerciseSearchSheet } from "@/features/workout-session/exercise-search-sheet";
import { TemplateLineRow } from "@/features/templates/template-line-row";
import {
  clampTargetSets,
  lineFromExercise,
  moveLine,
  MAX_TEMPLATE_LINES,
  templateDoc,
} from "@/features/templates/template-model";

type TemplateEditorProps = {
  planId: string | null;
  initialPlan: WorkoutPlanDoc | null;
};

const iconButton =
  "inline-flex size-11 items-center justify-center rounded-lg text-zinc-900 hover:bg-zinc-100 dark:text-zinc-100 dark:hover:bg-zinc-900";

/** Build or edit a reusable workout: a name and an ordered list of exercises with target sets. */
export function TemplateEditor({ planId, initialPlan }: TemplateEditorProps) {
  const router = useRouter();
  const [name, setName] = useState(initialPlan?.name ?? "");
  const [lines, setLines] = useState<PlanLine[]>(initialPlan?.lines ?? []);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchKey, setSearchKey] = useState(0);
  const [recent, setRecent] = useState<CatalogExercise[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const savedKey = useMemo(
    () => JSON.stringify({ name: initialPlan?.name ?? "", lines: initialPlan?.lines ?? [] }),
    [initialPlan],
  );
  const dirty = JSON.stringify({ name, lines }) !== savedKey;
  const canSave = name.trim().length > 0 && lines.length > 0;

  // "Recent" in the search sheet: exercises from your last workouts.
  useEffect(() => {
    let cancelled = false;
    void getRecentCompletedSessions(30)
      .catch(() => [])
      .then((sessions) => {
        if (!cancelled) setRecent(recentExercises(sessions));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const updateLine = (lineId: string, patch: Partial<PlanLine>) =>
    setLines((prev) => prev.map((line) => (line.lineId === lineId ? { ...line, ...patch } : line)));

  const addExercises = (picked: CatalogExercise[]) => {
    setLines((prev) => [...prev, ...picked.map(lineFromExercise)].slice(0, MAX_TEMPLATE_LINES));
    setSearchOpen(false);
    setError(null);
  };

  const removeLine = (line: PlanLine) => {
    if (!window.confirm(`Remove ${line.nameSnapshot} from this template?`)) return;
    setLines((prev) => prev.filter((l) => l.lineId !== line.lineId));
  };

  /** Saves and returns the template id (null when it couldn't save). */
  const save = async (): Promise<string | null> => {
    if (!canSave) {
      setError(name.trim() ? "Add at least one exercise." : "Give this template a name.");
      return null;
    }
    setBusy(true);
    setError(null);
    try {
      const doc = templateDoc(name, lines, initialPlan);
      if (planId) {
        if (!(await updateWorkoutPlan(planId, doc))) throw new Error("save");
        return planId;
      }
      const id = await createWorkoutPlan(doc);
      if (!id) throw new Error("save");
      return id;
    } catch {
      setError("Couldn’t save. Check that you’re signed in and try again.");
      return null;
    } finally {
      setBusy(false);
    }
  };

  const saveAndStay = async () => {
    const id = await save();
    if (id && !planId) router.replace(`/templates/${id}`);
    else if (id) router.refresh();
  };

  const startNow = async () => {
    const id = dirty || !planId ? await save() : planId;
    if (!id) return;
    const href = buildWorkoutHref(name, id, lines.map((line) => line.exerciseId));
    if (href) router.push(href);
  };

  const deleteTemplate = async () => {
    if (!planId || !window.confirm("Delete this template? This can’t be undone.")) return;
    setBusy(true);
    try {
      if (!(await deleteWorkoutPlan(planId))) throw new Error("delete");
      router.push("/planner");
    } catch {
      setError("Couldn’t delete this template.");
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col gap-4 pb-[calc(5rem+var(--bottom-nav-height,0px))]">
      <header className="flex items-center justify-between">
        <Link
          href="/planner"
          aria-label="Back to planner"
          className={`-ml-2.5 ${iconButton}`}
          onClick={(e) => {
            if (dirty && !window.confirm("Leave without saving your changes?")) e.preventDefault();
          }}
        >
          <ArrowLeft className="size-5" aria-hidden />
        </Link>
        <h1 className="text-[15px] font-semibold text-zinc-900 dark:text-zinc-50">
          {planId ? "Edit template" : "New template"}
        </h1>
        {planId ? (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={<button type="button" aria-label="Template options" className={`-mr-2.5 ${iconButton}`} />}
            >
              <MoreHorizontal className="size-4" aria-hidden />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem variant="destructive" className="min-h-11 gap-2" onClick={() => void deleteTemplate()}>
                <Trash2 className="size-4" aria-hidden />
                Delete template
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <span className="size-11" aria-hidden />
        )}
      </header>

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="template-name"
          className="text-xs font-medium tracking-wide text-zinc-500 uppercase dark:text-zinc-400"
        >
          Name
        </label>
        <input
          id="template-name"
          value={name}
          maxLength={NOTE_LIMITS.title}
          onChange={(e) => setName(e.target.value)}
          placeholder="Push day, Legs, Full body…"
          className="h-12 rounded-xl border border-zinc-200 bg-white px-3 text-[17px] font-semibold text-zinc-900 outline-none placeholder:font-normal placeholder:text-zinc-400 focus:ring-2 focus:ring-zinc-900/10 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
        />
      </div>

      <section aria-labelledby="template-exercises-heading" className="flex flex-col gap-2">
        <h2
          id="template-exercises-heading"
          className="text-xs font-medium tracking-wide text-zinc-500 uppercase dark:text-zinc-400"
        >
          Exercises · {lines.length}
        </h2>
        {lines.length > 0 ? (
          <ol className="flex flex-col gap-2">
            {lines.map((line, index) => (
              <li key={line.lineId}>
                <TemplateLineRow
                  line={line}
                  position={index + 1}
                  isFirst={index === 0}
                  isLast={index === lines.length - 1}
                  onTargetSetsChange={(n) => updateLine(line.lineId, { targetSets: clampTargetSets(n) })}
                  onNoteChange={(notes) =>
                    updateLine(line.lineId, {
                      notes: notes.slice(0, NOTE_LIMITS.exerciseNote) || null,
                    })
                  }
                  onMove={(delta) => setLines((prev) => moveLine(prev, index, delta))}
                  onRemove={() => removeLine(line)}
                />
              </li>
            ))}
          </ol>
        ) : null}
        <button
          type="button"
          disabled={lines.length >= MAX_TEMPLATE_LINES}
          onClick={() => {
            setSearchKey((k) => k + 1);
            setSearchOpen(true);
          }}
          className="flex h-13 items-center justify-center gap-2 rounded-xl border-[1.5px] border-dashed border-zinc-300 text-sm font-semibold text-zinc-700 hover:bg-zinc-100 disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
        >
          <Plus className="size-4" aria-hidden />
          Add exercises
        </button>
      </section>

      <div className="fixed inset-x-0 bottom-[var(--bottom-nav-height,0px)] z-40 border-t border-zinc-200 bg-zinc-50/95 px-3 pt-2 pb-3 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/95">
        {error ? (
          <p role="alert" className="mx-auto mb-2 max-w-2xl text-center text-xs text-red-700 dark:text-red-400">
            {error}
          </p>
        ) : null}
        <div className="mx-auto flex w-full max-w-2xl gap-1.5 sm:px-2">
          <button
            type="button"
            disabled={busy || lines.length === 0}
            onClick={() => void startNow()}
            className="h-11 rounded-lg border border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-900 hover:bg-zinc-50 disabled:opacity-40 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
          >
            Start now
          </button>
          <button
            type="button"
            disabled={busy || !dirty}
            onClick={() => void saveAndStay()}
            className="h-11 min-w-0 flex-1 rounded-lg bg-emerald-700 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50 dark:bg-emerald-600"
          >
            {busy ? "Saving…" : planId && !dirty ? "Saved" : "Save template"}
          </button>
        </div>
      </div>

      <ExerciseSearchSheet
        key={searchKey}
        open={searchOpen}
        onOpenChange={setSearchOpen}
        mode={{
          kind: "add",
          afterName: lines[lines.length - 1]?.nameSnapshot ?? null,
          room: MAX_TEMPLATE_LINES - lines.length,
        }}
        suggested={recent}
        recent={recent}
        onAdd={addExercises}
        onReplace={() => {}}
      />
    </div>
  );
}

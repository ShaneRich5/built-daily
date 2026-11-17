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
import type { LineSection } from "@/lib/line-grouping";
import { NOTE_LIMITS, type PlanLine, type WorkoutPlanDoc } from "@/lib/workout-types";
import { recentExercises } from "@/features/workout-session/exercise-suggestions";
import { ExerciseSearchSheet } from "@/features/workout-session/exercise-search-sheet";
import { TemplateLineRow } from "@/features/templates/template-line-row";
import {
  addAlternate,
  clampTargetSets,
  lineFromExercise,
  MAX_TEMPLATE_LINES,
  moveLineInSection,
  orderBySection,
  removeAlternate,
  sectionOf,
  setLineSection,
  templateDoc,
} from "@/features/templates/template-model";

function lastName(lines: PlanLine[]): string | null {
  return lines[lines.length - 1]?.nameSnapshot ?? null;
}

type TemplateEditorProps = {
  planId: string | null;
  initialPlan: WorkoutPlanDoc | null;
};

/** What the search sheet is picking for: exercises for a section, or one alternate for a line. */
type SearchTarget = { kind: "add"; section: LineSection } | { kind: "alternate"; lineId: string };

const sectionLabel = "text-xs font-medium tracking-wide uppercase";
const addButton =
  "flex h-12 min-w-0 flex-1 items-center justify-center gap-2 rounded-xl border-[1.5px] border-dashed border-zinc-300 text-sm font-semibold text-zinc-700 hover:bg-zinc-100 disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900";

const iconButton =
  "inline-flex size-11 items-center justify-center rounded-lg text-zinc-900 hover:bg-zinc-100 dark:text-zinc-100 dark:hover:bg-zinc-900";

/**
 * Build or edit a reusable workout: a name, the Plan (with alternates per
 * exercise), and Maybes for when there's time. Lines stay ordered Plan first.
 */
export function TemplateEditor({ planId, initialPlan }: TemplateEditorProps) {
  const router = useRouter();
  const [name, setName] = useState(initialPlan?.name ?? "");
  const [lines, setLines] = useState<PlanLine[]>(() => orderBySection(initialPlan?.lines ?? []));
  const [searchFor, setSearchFor] = useState<SearchTarget | null>(null);
  const [searchKey, setSearchKey] = useState(0);
  const [recent, setRecent] = useState<CatalogExercise[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const savedKey = useMemo(
    () =>
      JSON.stringify({ name: initialPlan?.name ?? "", lines: orderBySection(initialPlan?.lines ?? []) }),
    [initialPlan],
  );
  const dirty = JSON.stringify({ name, lines }) !== savedKey;
  const planLines = lines.filter((line) => sectionOf(line) === "plan");
  const maybeLines = lines.filter((line) => sectionOf(line) === "maybe");
  const atLimit = lines.length >= MAX_TEMPLATE_LINES;
  const canSave = name.trim().length > 0 && planLines.length > 0;
  const alternateLine =
    searchFor?.kind === "alternate" ? lines.find((line) => line.lineId === searchFor.lineId) : undefined;

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

  const openSearch = (target: SearchTarget) => {
    setSearchKey((k) => k + 1);
    setSearchFor(target);
  };

  const addExercises = (picked: CatalogExercise[]) => {
    const section = searchFor?.kind === "add" ? searchFor.section : "plan";
    const added = picked.map((exercise) => lineFromExercise(exercise, section));
    setLines((prev) => orderBySection([...prev, ...added]).slice(0, MAX_TEMPLATE_LINES));
    setSearchFor(null);
    setError(null);
  };

  const pickAlternate = (exercise: CatalogExercise) => {
    if (alternateLine) updateLine(alternateLine.lineId, addAlternate(alternateLine, exercise));
    setSearchFor(null);
  };

  const removeLine = (line: PlanLine) => {
    if (!window.confirm(`Remove ${line.nameSnapshot} from this template?`)) return;
    setLines((prev) => prev.filter((l) => l.lineId !== line.lineId));
  };

  /** Saves and returns the template id (null when it couldn't save). */
  const save = async (): Promise<string | null> => {
    if (!canSave) {
      setError(name.trim() ? "Add at least one exercise to the plan." : "Give this template a name.");
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
    const href = buildWorkoutHref(name, id, orderBySection(lines).map((line) => line.exerciseId));
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

  const renderRow = (line: PlanLine, index: number, sectionSize: number) => (
    <TemplateLineRow
      line={line}
      position={index + 1}
      isFirst={index === 0}
      isLast={index === sectionSize - 1}
      onTargetSetsChange={(n) => updateLine(line.lineId, { targetSets: clampTargetSets(n) })}
      onNoteChange={(notes) =>
        updateLine(line.lineId, {
          notes: notes.slice(0, NOTE_LIMITS.exerciseNote) || null,
        })
      }
      onMove={(delta) => setLines((prev) => moveLineInSection(prev, line.lineId, delta))}
      onToggleSection={() =>
        setLines((prev) => setLineSection(prev, line.lineId, sectionOf(line) === "plan" ? "maybe" : "plan"))
      }
      onAddAlternate={() => openSearch({ kind: "alternate", lineId: line.lineId })}
      onRemoveAlternate={(exerciseId) =>
        setLines((prev) => prev.map((l) => (l.lineId === line.lineId ? removeAlternate(l, exerciseId) : l)))
      }
      onRemove={() => removeLine(line)}
    />
  );

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

      {lines.length > 0 ? (
        <p className="text-[13px] text-zinc-500 dark:text-zinc-400">
          Move an exercise between Plan and Maybe from its menu. Alternates show as quick swaps in the
          workout.
        </p>
      ) : null}

      <section aria-labelledby="template-plan-heading" className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between">
          <h2 id="template-plan-heading" className={`${sectionLabel} text-zinc-900 dark:text-zinc-50`}>
            Plan
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {planLines.length} {planLines.length === 1 ? "exercise" : "exercises"}
          </p>
        </div>
        {planLines.length > 0 ? (
          <ol className="flex flex-col gap-2">
            {planLines.map((line, index) => (
              <li key={line.lineId}>{renderRow(line, index, planLines.length)}</li>
            ))}
          </ol>
        ) : null}
      </section>

      {maybeLines.length > 0 ? (
        <section
          aria-labelledby="template-maybe-heading"
          className="flex flex-col gap-2 rounded-2xl border-[1.5px] border-dashed border-zinc-300 bg-zinc-100 p-3 dark:border-zinc-700 dark:bg-zinc-900/60"
        >
          <div>
            <h2 id="template-maybe-heading" className={`${sectionLabel} text-zinc-900 dark:text-zinc-50`}>
              Maybe
            </h2>
            <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
              Shows in the workout, collapsed. Never counted as missed.
            </p>
          </div>
          <ol className="flex flex-col gap-2">
            {maybeLines.map((line, index) => (
              <li key={line.lineId}>{renderRow(line, index, maybeLines.length)}</li>
            ))}
          </ol>
        </section>
      ) : null}

      <div className="flex gap-2">
        <button
          type="button"
          disabled={atLimit}
          onClick={() => openSearch({ kind: "add", section: "plan" })}
          className={addButton}
        >
          <Plus className="size-4" aria-hidden />
          {planLines.length > 0 ? "Add to plan" : "Add exercises"}
        </button>
        {planLines.length > 0 ? (
          <button
            type="button"
            disabled={atLimit}
            onClick={() => openSearch({ kind: "add", section: "maybe" })}
            className={addButton}
          >
            <Plus className="size-4" aria-hidden />
            Add a maybe
          </button>
        ) : null}
      </div>

      <div className="fixed inset-x-0 bottom-[var(--bottom-nav-height,0px)] z-40 border-t border-zinc-200 bg-zinc-50/95 px-3 pt-2 pb-3 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/95">
        {error ? (
          <p role="alert" className="mx-auto mb-2 max-w-2xl text-center text-xs text-red-700 dark:text-red-400">
            {error}
          </p>
        ) : null}
        <div className="mx-auto flex w-full max-w-2xl gap-1.5 sm:px-2">
          <button
            type="button"
            disabled={busy || planLines.length === 0}
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
        open={searchFor !== null}
        onOpenChange={(open) => {
          if (!open) setSearchFor(null);
        }}
        mode={
          alternateLine
            ? { kind: "alternate", forName: alternateLine.nameSnapshot }
            : {
                kind: "add",
                afterName: lastName(searchFor?.kind === "add" && searchFor.section === "maybe" ? maybeLines : planLines),
                room: MAX_TEMPLATE_LINES - lines.length,
              }
        }
        suggested={recent}
        recent={recent}
        onAdd={addExercises}
        onReplace={pickAlternate}
      />
    </div>
  );
}

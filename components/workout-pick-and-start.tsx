"use client";

import Link from "next/link";
import { ChevronDown, Info, Play, Plus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useAuth } from "@/components/auth-provider";
import { ExerciseMusclePeek } from "@/components/exercise-muscle-peek";
import { MuscleTargetDiagram } from "@/components/muscle-target-diagram";
import { Switch } from "@/components/ui/switch";
import {
  filterCatalogExercises,
  getCatalogExerciseById,
  type CatalogExercise,
} from "@/lib/exercise-catalog";
import { muscleTargetSummary } from "@/lib/exercise-muscle";
import type { PlanLine } from "@/lib/workout-types";
import {
  subscribeUserWorkoutPlans,
  type SavedWorkoutPlan,
} from "@/lib/workout-plan-repository";

type TemplateMeta = {
  kind: "template";
  id: string;
  name: string;
  exerciseCount: number;
  lines: PlanLine[];
};

function toTemplateMeta(p: SavedWorkoutPlan): TemplateMeta {
  return {
    kind: "template",
    id: p.id,
    name: p.plan.name,
    exerciseCount: p.plan.lines.length,
    lines: p.plan.lines,
  };
}

export function WorkoutPickAndStart() {
  const router = useRouter();
  const { user, firebaseReady } = useAuth();
  const savedPlans = useSavedWorkoutPlans(user, firebaseReady);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateMeta | null>(
    null,
  );
  const [exerciseIds, setExerciseIds] = useState<string[]>([]);
  const [exerciseQuery, setExerciseQuery] = useState("");
  const [exercisesOpen, setExercisesOpen] = useState(true);
  const [peekExercise, setPeekExercise] = useState<CatalogExercise | null>(
    null,
  );
  const [showMuscles, setShowMuscles] = useState(false);

  const filteredExercises = useMemo(
    () => filterCatalogExercises(exerciseQuery),
    [exerciseQuery],
  );

  const selectedExercises = useMemo(
    () =>
      exerciseIds
        .map((id) => {
          const catalog = getCatalogExerciseById(id);
          if (catalog) return catalog;
          const fromTemplate = selectedTemplate?.lines.find(
            (line) => line.exerciseId === id,
          );
          if (!fromTemplate) return null;
          return {
            id: fromTemplate.exerciseId,
            name: fromTemplate.nameSnapshot,
          };
        })
        .filter((ex): ex is { id: string; name: string } => ex != null),
    [exerciseIds, selectedTemplate],
  );

  const selectedIdSet = useMemo(() => new Set(exerciseIds), [exerciseIds]);

  const toggleTemplate = useCallback((template: TemplateMeta) => {
    setSelectedTemplate((current) =>
      current?.id === template.id ? null : template,
    );
  }, []);

  useEffect(() => {
    if (!selectedTemplate) return;
    setExerciseIds(selectedTemplate.lines.map((line) => line.exerciseId));
    setExercisesOpen(true);
  }, [selectedTemplate]);

  const toggleExercise = useCallback((exerciseId: string) => {
    setSelectedTemplate(null);
    setExerciseIds((prev) =>
      prev.includes(exerciseId)
        ? prev.filter((id) => id !== exerciseId)
        : [...prev, exerciseId],
    );
  }, []);

  const removeExercise = useCallback((exerciseId: string) => {
    setSelectedTemplate(null);
    setExerciseIds((prev) => prev.filter((id) => id !== exerciseId));
  }, []);

  const clearAllExercises = useCallback(() => {
    setSelectedTemplate(null);
    setExerciseIds([]);
  }, []);

  const startWorkout = useCallback(() => {
    const params = new URLSearchParams();
    if (exerciseIds.length > 0) {
      params.set("e", exerciseIds.join(","));
    }
    if (selectedTemplate) {
      params.set("t", selectedTemplate.name);
      params.set("p", selectedTemplate.id);
    }
    const qs = params.toString();
    router.push(qs ? `/workout?${qs}` : "/workout");
  }, [router, exerciseIds, selectedTemplate]);

  const startTemplate = useCallback(
    (template: TemplateMeta) => {
      const params = new URLSearchParams({
        e: template.lines.map((line) => line.exerciseId).join(","),
        t: template.name,
        p: template.id,
      });
      router.push(`/workout?${params.toString()}`);
    },
    [router],
  );

  return (
    <div className="space-y-6">
      <section className="space-y-3" aria-labelledby="yours-heading">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <h2
            id="yours-heading"
            className="text-sm font-semibold uppercase tracking-wide text-zinc-500"
          >
            Your templates
          </h2>
          {user && firebaseReady ? (
            <Link
              href="/templates/new"
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 text-xs font-semibold text-zinc-800 transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:bg-zinc-900"
            >
              <Plus className="size-3.5" aria-hidden />
              Create template
            </Link>
          ) : null}
        </div>

        {!user || !firebaseReady ? (
          <div className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50/80 px-4 py-6 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-950/40 dark:text-zinc-400">
            <p>Sign in to create reusable workout templates.</p>
            <p className="mt-2 text-xs text-zinc-500">
              Templates sync to your account and show up here.
            </p>
            <Link
              href="/login"
              className="mt-3 inline-block text-sm font-semibold text-zinc-900 underline dark:text-zinc-100"
            >
              Sign in
            </Link>
          </div>
        ) : savedPlans.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50/80 px-4 py-6 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950/40 dark:text-zinc-400">
            <p>No saved templates yet.</p>
            <p className="mt-1 text-zinc-400 dark:text-zinc-500">
              Build a list of exercises and optional notes, then reuse it any
              time.
            </p>
            <Link
              href="/templates/new"
              className="mt-3 inline-block text-sm font-semibold text-zinc-900 underline dark:text-zinc-100"
            >
              Create your first template
            </Link>
          </div>
        ) : (
          <ul className="space-y-2">
            {savedPlans.map((p) => {
              const meta = toTemplateMeta(p);
              const selected = selectedTemplate?.id === meta.id;
              return (
                <li key={p.id}>
                  <div
                    className={`flex flex-col gap-2 rounded-xl border px-4 py-3 transition sm:flex-row sm:items-center sm:justify-between ${
                      selected
                        ? "border-zinc-900 bg-zinc-100 dark:border-zinc-100 dark:bg-zinc-800"
                        : "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => toggleTemplate(meta)}
                      className="min-w-0 flex-1 text-left"
                    >
                      <span className="font-medium text-zinc-900 dark:text-zinc-50">
                        {meta.name}
                      </span>
                      <span className="mt-0.5 block text-xs text-zinc-500">
                        {meta.exerciseCount} exercise
                        {meta.exerciseCount === 1 ? "" : "s"}
                      </span>
                    </button>
                    <div className="flex shrink-0 items-center gap-2">
                      <button
                        type="button"
                        onClick={() => startTemplate(meta)}
                        className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-emerald-600 px-3 text-xs font-semibold text-white transition hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600"
                      >
                        <Play className="size-3.5" aria-hidden />
                        Start
                      </button>
                      <Link
                        href={`/templates/${p.id}`}
                        className="inline-flex h-9 items-center rounded-lg px-2 text-xs font-semibold text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-900"
                      >
                        Edit
                      </Link>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section
        className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950"
        aria-labelledby="exercises-heading"
      >
        <button
          type="button"
          onClick={() => setExercisesOpen((open) => !open)}
          className="flex w-full items-start justify-between gap-3 px-4 py-3 text-left"
          aria-expanded={exercisesOpen}
          aria-controls="exercises-picker-panel"
        >
          <span className="min-w-0">
            <span
              id="exercises-heading"
              className="block text-sm font-semibold uppercase tracking-wide text-zinc-500"
            >
              Exercises for this session
            </span>
            <span className="mt-0.5 block text-xs font-medium tabular-nums text-zinc-500">
              {exerciseIds.length === 0
                ? "None selected"
                : `${exerciseIds.length} selected`}
            </span>
          </span>
          <span className="inline-flex shrink-0 items-center gap-1.5 pt-0.5 text-xs font-medium text-zinc-400">
            {exercisesOpen ? "Close" : "Open"}
            <ChevronDown
              className={`size-4 transition-transform ${exercisesOpen ? "rotate-180" : ""}`}
              aria-hidden
            />
          </span>
        </button>

        {selectedExercises.length > 0 ? (
          <div className="space-y-2 border-t border-zinc-100 px-4 py-3 dark:border-zinc-800">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-medium text-zinc-500">Selected</p>
              <button
                type="button"
                onClick={clearAllExercises}
                className="text-xs font-semibold text-zinc-500 underline-offset-2 hover:text-zinc-800 hover:underline dark:hover:text-zinc-300"
              >
                Clear all
              </button>
            </div>
            <ul className="flex flex-wrap gap-2" aria-label="Selected exercises">
              {selectedExercises.map((ex) => (
                <li key={ex.id}>
                  <button
                    type="button"
                    onClick={() => removeExercise(ex.id)}
                    className="inline-flex h-9 max-w-full items-center gap-1.5 rounded-full border border-emerald-600 bg-emerald-50 px-3 text-xs font-semibold text-emerald-900 dark:border-emerald-500 dark:bg-emerald-950/50 dark:text-emerald-200"
                    aria-label={`Remove ${ex.name}`}
                  >
                    <span className="truncate">{ex.name}</span>
                    <X className="size-3.5 shrink-0 opacity-70" aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {exercisesOpen ? (
          <div
            id="exercises-picker-panel"
            className="space-y-3 border-t border-zinc-100 px-4 py-3 dark:border-zinc-800"
          >
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Tap exercises below to add or remove them. Choosing a template
              above fills this list.
            </p>
            <input
              type="search"
              value={exerciseQuery}
              onChange={(e) => setExerciseQuery(e.target.value)}
              placeholder="Search (leg press, chest, cable…)"
              className="h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:border-zinc-600"
              aria-label="Search exercises"
            />
            <div className="flex items-center justify-end gap-2">
              <label
                htmlFor="show-muscles-toggle"
                className="text-xs font-medium text-zinc-500"
              >
                Show muscles
              </label>
              <Switch
                id="show-muscles-toggle"
                size="sm"
                checked={showMuscles}
                onCheckedChange={(checked) => {
                  const next = Boolean(checked);
                  setShowMuscles(next);
                  if (!next) setPeekExercise(null);
                }}
              />
            </div>
            <ul className="grid max-h-[min(28rem,55vh)] grid-cols-1 gap-2 overflow-y-auto overscroll-contain md:grid-cols-2">
              {filteredExercises.length === 0 ? (
                <li className="col-span-full rounded-xl border border-dashed border-zinc-200 px-4 py-6 text-center text-sm text-zinc-500 dark:border-zinc-800">
                  No exercises match “{exerciseQuery.trim()}”.
                </li>
              ) : (
                filteredExercises.map((ex) => {
                  const on = selectedIdSet.has(ex.id);
                  const targeting = showMuscles
                    ? muscleTargetSummary(ex.primary, ex.secondary)
                    : null;
                  return (
                    <li key={ex.id}>
                      <div
                        className={`flex min-h-12 w-full items-stretch rounded-xl border transition ${
                          on
                            ? "border-emerald-600 bg-emerald-50 shadow-[inset_0_0_0_1px_rgba(5,150,105,0.35)] dark:border-emerald-500 dark:bg-emerald-950/40"
                            : "border-zinc-200 bg-zinc-50 hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700"
                        }`}
                      >
                        <button
                          type="button"
                          aria-pressed={on}
                          onClick={() => toggleExercise(ex.id)}
                          className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 px-3 py-2.5 text-left active:scale-[0.99] sm:px-4"
                        >
                          {showMuscles ? (
                            <MuscleTargetDiagram
                              primary={ex.primary}
                              secondary={ex.secondary}
                              compact
                            />
                          ) : null}
                          <span className="min-w-0 flex-1">
                            <span className="block truncate font-medium text-zinc-900 dark:text-zinc-50">
                              {ex.name}
                            </span>
                            {targeting ? (
                              <span className="mt-0.5 block truncate text-xs text-zinc-500">
                                {targeting}
                              </span>
                            ) : null}
                          </span>
                          <span
                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-semibold ${
                              on
                                ? "border-emerald-600 bg-emerald-600 text-white"
                                : "border-zinc-200 text-zinc-400 dark:border-zinc-700"
                            }`}
                          >
                            {on ? "✓" : "+"}
                          </span>
                        </button>
                        {showMuscles ? (
                          <button
                            type="button"
                            onClick={() => setPeekExercise(ex)}
                            className="flex w-11 shrink-0 items-center justify-center border-l border-zinc-200 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:border-zinc-800 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                            aria-label={`See muscles targeted by ${ex.name}`}
                          >
                            <Info className="size-4" aria-hidden />
                          </button>
                        ) : null}
                      </div>
                    </li>
                  );
                })
              )}
            </ul>
          </div>
        ) : null}

        <ExerciseMusclePeek
          key={peekExercise?.id ?? "closed"}
          exercise={peekExercise}
          open={peekExercise != null}
          onClose={() => setPeekExercise(null)}
        />

        <div className="space-y-2 border-t border-zinc-100 px-4 py-3 dark:border-zinc-800">
          <button
            type="button"
            onClick={startWorkout}
            className="flex h-12 w-full items-center justify-center rounded-xl bg-zinc-900 text-base font-semibold text-white transition active:scale-[0.99] dark:bg-zinc-50 dark:text-zinc-900"
          >
            {exerciseIds.length === 0
              ? "Start empty workout"
              : `Start workout · ${exerciseIds.length}`}
          </button>
          <p className="text-center text-xs text-zinc-500">
            {exercisesOpen
              ? "Finishing a session saves it to your account when you are signed in."
              : "Tap Open above to pick or change exercises. You can also start empty."}
          </p>
        </div>
      </section>
    </div>
  );
}

function useSavedWorkoutPlans(
  user: ReturnType<typeof useAuth>["user"],
  firebaseReady: boolean,
): SavedWorkoutPlan[] {
  const [savedPlans, setSavedPlans] = useState<SavedWorkoutPlan[]>([]);

  useEffect(() => {
    if (!user || !firebaseReady) {
      return () => {
        setSavedPlans([]);
      };
    }
    const unsub = subscribeUserWorkoutPlans(setSavedPlans);
    return () => {
      unsub();
      setSavedPlans([]);
    };
  }, [user, firebaseReady]);

  return savedPlans;
}

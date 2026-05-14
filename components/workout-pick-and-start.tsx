"use client";

import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { EXERCISE_CATALOG } from "@/lib/exercise-catalog";

type Plan = {
  id: string;
  name: string;
  exerciseCount: number;
  source: "starter" | "custom";
};

const STARTERS: Plan[] = [
  {
    id: "starter-full-body",
    name: "Full body",
    exerciseCount: 6,
    source: "starter",
  },
  {
    id: "starter-upper",
    name: "Upper body",
    exerciseCount: 5,
    source: "starter",
  },
  {
    id: "starter-lower",
    name: "Lower body",
    exerciseCount: 5,
    source: "starter",
  },
  {
    id: "starter-push",
    name: "Push",
    exerciseCount: 6,
    source: "starter",
  },
  {
    id: "starter-pull",
    name: "Pull",
    exerciseCount: 6,
    source: "starter",
  },
];

export function WorkoutPickAndStart() {
  const router = useRouter();
  const [customPlans, setCustomPlans] = useState<Plan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [selectedExerciseIds, setSelectedExerciseIds] = useState<string[]>([]);
  const [newName, setNewName] = useState("");

  const allPlans = useMemo(
    () => [...STARTERS, ...customPlans],
    [customPlans],
  );

  const selectedPlan = useMemo(
    () => allPlans.find((p) => p.id === selectedPlanId) ?? null,
    [allPlans, selectedPlanId],
  );

  const toggleExercise = useCallback((id: string) => {
    setSelectedExerciseIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }, []);

  const addCustom = useCallback(() => {
    const name = newName.trim();
    if (!name) return;
    const id =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? `custom-${crypto.randomUUID()}`
        : `custom-${Date.now()}`;
    const plan: Plan = {
      id,
      name,
      exerciseCount: 0,
      source: "custom",
    };
    setCustomPlans((prev) => [...prev, plan]);
    setSelectedPlanId(id);
    setNewName("");
  }, [newName]);

  const startWorkout = useCallback(() => {
    if (selectedExerciseIds.length === 0) return;
    const params = new URLSearchParams();
    params.set("e", selectedExerciseIds.join(","));
    if (selectedPlan?.name) params.set("t", selectedPlan.name);
    if (selectedPlan?.id) params.set("p", selectedPlan.id);
    router.push(`/workout?${params.toString()}`);
  }, [router, selectedExerciseIds, selectedPlan]);

  const canStart = selectedExerciseIds.length > 0;

  return (
    <div className="space-y-6">
      <section className="space-y-3" aria-labelledby="library-heading">
        <div className="flex items-end justify-between gap-2">
          <h2
            id="library-heading"
            className="text-sm font-semibold uppercase tracking-wide text-zinc-500"
          >
            Workout library
          </h2>
          <span className="text-xs text-zinc-400">Optional label</span>
        </div>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Naming your session is optional. You will always pick concrete
          exercises next.
        </p>
        <ul className="space-y-2">
          {STARTERS.map((plan) => (
            <li key={plan.id}>
              <button
                type="button"
                onClick={() =>
                  setSelectedPlanId((cur) =>
                    cur === plan.id ? null : plan.id,
                  )
                }
                className={`flex w-full items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left transition ${
                  selectedPlanId === plan.id
                    ? "border-zinc-900 bg-zinc-100 dark:border-zinc-100 dark:bg-zinc-800"
                    : "border-zinc-200 bg-white hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-700"
                }`}
              >
                <span className="font-medium text-zinc-900 dark:text-zinc-50">
                  {plan.name}
                </span>
                <span className="shrink-0 text-xs tabular-nums text-zinc-500">
                  {plan.exerciseCount} exercises
                </span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-3" aria-labelledby="yours-heading">
        <h2
          id="yours-heading"
          className="text-sm font-semibold uppercase tracking-wide text-zinc-500"
        >
          Your workouts
        </h2>
        {customPlans.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50/80 px-4 py-6 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950/40 dark:text-zinc-400">
            <p>No custom workouts yet.</p>
            <p className="mt-1 text-zinc-400 dark:text-zinc-500">
              Add a name below—treat it like a reusable label for now.
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {customPlans.map((plan) => (
              <li key={plan.id}>
                <button
                  type="button"
                  onClick={() =>
                    setSelectedPlanId((cur) =>
                      cur === plan.id ? null : plan.id,
                    )
                  }
                  className={`flex w-full items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left transition ${
                    selectedPlanId === plan.id
                      ? "border-zinc-900 bg-zinc-100 dark:border-zinc-100 dark:bg-zinc-800"
                      : "border-zinc-200 bg-white hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-700"
                  }`}
                >
                  <span className="font-medium text-zinc-900 dark:text-zinc-50">
                    {plan.name}
                  </span>
                  <span className="shrink-0 text-xs text-zinc-400">Yours</span>
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="flex gap-2">
          <label className="sr-only" htmlFor="new-workout-name">
            New workout name
          </label>
          <input
            id="new-workout-name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") addCustom();
            }}
            placeholder="e.g. Garage circuit"
            className="min-w-0 flex-1 rounded-xl border border-zinc-200 bg-white px-3 py-3 text-sm text-zinc-900 outline-none ring-zinc-900/10 placeholder:text-zinc-400 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:ring-white/10"
          />
          <button
            type="button"
            onClick={addCustom}
            className="shrink-0 rounded-xl border border-zinc-200 bg-zinc-100 px-4 py-3 text-sm font-semibold text-zinc-900 transition hover:bg-zinc-200 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50 dark:hover:bg-zinc-700"
          >
            Add
          </button>
        </div>
      </section>

      <section className="space-y-3" aria-labelledby="exercises-heading">
        <div className="flex items-end justify-between gap-2">
          <h2
            id="exercises-heading"
            className="text-sm font-semibold uppercase tracking-wide text-zinc-500"
          >
            Exercises for this session
          </h2>
          <span className="text-xs text-zinc-400">Tap to toggle</span>
        </div>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Pick one or more moves. This list is static for now; later it can come
          from your library or search.
        </p>
        <ul className="space-y-2">
          {EXERCISE_CATALOG.map((ex) => {
            const on = selectedExerciseIds.includes(ex.id);
            return (
              <li key={ex.id}>
                <button
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggleExercise(ex.id)}
                  className={`flex w-full items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left transition ${
                    on
                      ? "border-emerald-600 bg-emerald-50 dark:border-emerald-500 dark:bg-emerald-950/40"
                      : "border-zinc-200 bg-white hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-700"
                  }`}
                >
                  <span className="font-medium text-zinc-900 dark:text-zinc-50">
                    {ex.name}
                  </span>
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-semibold ${
                      on
                        ? "border-emerald-600 bg-emerald-600 text-white"
                        : "border-zinc-200 text-zinc-400 dark:border-zinc-700"
                    }`}
                  >
                    {on ? "✓" : ""}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      <div className="space-y-2">
        <button
          type="button"
          disabled={!canStart}
          onClick={startWorkout}
          className="flex h-12 w-full items-center justify-center rounded-xl bg-zinc-900 text-base font-semibold text-white transition enabled:active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40 dark:bg-zinc-50 dark:text-zinc-900"
        >
          {!canStart
            ? "Select at least one exercise"
            : selectedPlan
              ? `Start: ${selectedPlan.name}`
              : "Start workout"}
        </button>
        <p className="text-center text-xs text-zinc-500">
          Opens the live session screen. Prototype: no save yet—finish returns
          you home.
        </p>
      </div>
    </div>
  );
}

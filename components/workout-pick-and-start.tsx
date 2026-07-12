"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useState,
} from "react";
import { useAuth } from "@/components/auth-provider";
import { filterCatalogExercises } from "@/lib/exercise-catalog";
import type { PlanLine } from "@/lib/workout-types";
import {
  subscribeUserWorkoutPlans,
  type SavedWorkoutPlan,
} from "@/lib/workout-plan-repository";

type StarterMeta = {
  kind: "starter";
  id: string;
  name: string;
  exerciseCount: number;
};

type TemplateMeta = {
  kind: "template";
  id: string;
  name: string;
  exerciseCount: number;
  lines: PlanLine[];
};

type SelectedLibrary = StarterMeta | TemplateMeta | null;

type PickState = {
  library: SelectedLibrary;
  exerciseIds: string[];
};

type PickAction =
  | { type: "toggleStarter"; starter: StarterMeta }
  | { type: "toggleTemplate"; template: TemplateMeta }
  | { type: "toggleExercise"; exerciseId: string };

const STARTERS: StarterMeta[] = [
  {
    kind: "starter",
    id: "starter-full-body",
    name: "Full body",
    exerciseCount: 6,
  },
  {
    kind: "starter",
    id: "starter-upper",
    name: "Upper body",
    exerciseCount: 5,
  },
  {
    kind: "starter",
    id: "starter-lower",
    name: "Lower body",
    exerciseCount: 5,
  },
  {
    kind: "starter",
    id: "starter-push",
    name: "Push",
    exerciseCount: 6,
  },
  {
    kind: "starter",
    id: "starter-pull",
    name: "Pull",
    exerciseCount: 6,
  },
];

function pickReducer(state: PickState, action: PickAction): PickState {
  switch (action.type) {
    case "toggleStarter": {
      const s = action.starter;
      const off =
        state.library?.kind === "starter" && state.library.id === s.id;
      return {
        ...state,
        library: off ? null : s,
      };
    }
    case "toggleTemplate": {
      const t = action.template;
      const off =
        state.library?.kind === "template" && state.library.id === t.id;
      if (off) {
        return { ...state, library: null };
      }
      return {
        library: t,
        exerciseIds: t.lines.map((line) => line.exerciseId),
      };
    }
    case "toggleExercise": {
      const id = action.exerciseId;
      const has = state.exerciseIds.includes(id);
      return {
        ...state,
        exerciseIds: has
          ? state.exerciseIds.filter((x) => x !== id)
          : [...state.exerciseIds, id],
      };
    }
  }
}

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
  const [pick, dispatch] = useReducer(pickReducer, {
    library: null,
    exerciseIds: [],
  });
  const [exerciseQuery, setExerciseQuery] = useState("");

  const filteredExercises = useMemo(
    () => filterCatalogExercises(exerciseQuery),
    [exerciseQuery],
  );

  const toggleStarter = useCallback((s: StarterMeta) => {
    dispatch({ type: "toggleStarter", starter: s });
  }, []);

  const toggleTemplate = useCallback((t: TemplateMeta) => {
    dispatch({ type: "toggleTemplate", template: t });
  }, []);

  const toggleExercise = useCallback((id: string) => {
    dispatch({ type: "toggleExercise", exerciseId: id });
  }, []);

  const selectedPlanLabel = useMemo(() => {
    if (!pick.library) return null;
    return pick.library.name;
  }, [pick.library]);

  const planIdForUrl = useMemo(() => {
    if (pick.library?.kind === "template") return pick.library.id;
    if (pick.library?.kind === "starter") return pick.library.id;
    return null;
  }, [pick.library]);

  const startWorkout = useCallback(() => {
    const params = new URLSearchParams();
    if (pick.exerciseIds.length > 0) {
      params.set("e", pick.exerciseIds.join(","));
    }
    if (selectedPlanLabel) params.set("t", selectedPlanLabel);
    if (planIdForUrl) params.set("p", planIdForUrl);
    const qs = params.toString();
    router.push(qs ? `/workout?${qs}` : "/workout");
  }, [router, pick.exerciseIds, selectedPlanLabel, planIdForUrl]);

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
              className="text-xs font-semibold text-zinc-700 underline-offset-2 hover:underline dark:text-zinc-300"
            >
              New template
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
              const selected =
                pick.library?.kind === "template" &&
                pick.library.id === meta.id;
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
                    <Link
                      href={`/templates/${p.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="shrink-0 text-xs font-semibold text-zinc-600 underline-offset-2 hover:underline dark:text-zinc-400"
                    >
                      Edit
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
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
          Optionally pick moves now, or start empty and add exercises during the
          session. Choosing a template above fills this list.
        </p>
        <input
          type="search"
          value={exerciseQuery}
          onChange={(e) => setExerciseQuery(e.target.value)}
          placeholder="Search exercises (e.g. leg press, cable…)"
          className="h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:border-zinc-600"
          aria-label="Search exercises"
        />
        <ul className="max-h-[min(28rem,55vh)] space-y-2 overflow-y-auto">
          {filteredExercises.length === 0 ? (
            <li className="rounded-xl border border-dashed border-zinc-200 px-4 py-6 text-center text-sm text-zinc-500 dark:border-zinc-800">
              No exercises match “{exerciseQuery.trim()}”.
            </li>
          ) : (
            filteredExercises.map((ex) => {
            const on = pick.exerciseIds.includes(ex.id);
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
                    {on ? "✓" : "+"}
                  </span>
                </button>
              </li>
            );
          })
          )}
        </ul>
      </section>

      <div className="space-y-2">
        <button
          type="button"
          onClick={startWorkout}
          className="flex h-12 w-full items-center justify-center rounded-xl bg-zinc-900 text-base font-semibold text-white transition active:scale-[0.99] dark:bg-zinc-50 dark:text-zinc-900"
        >
          {pick.exerciseIds.length === 0
            ? "Start empty workout"
            : "Start workout"}
        </button>
        <p className="text-center text-xs text-zinc-500">
          Finishing a session saves it to your account when you are signed in.
        </p>
      </div>
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
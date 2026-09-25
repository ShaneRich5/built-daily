"use client";

/**
 * Home's start-workout block. Keeps the templates list from
 * WorkoutPickAndStart but drops its "Exercises for this session" picker in
 * favor of one tap straight into an empty /workout — Phase 2's push to make
 * starting a workout the lowest-friction thing on the page. The full picker
 * still exists (workout-pick-and-start.tsx) for wherever ad-hoc exercise
 * selection is still useful; it's just not what home leads with.
 */
import Link from "next/link";
import { Play, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import type { PlanLine } from "@/lib/workout-types";
import {
  subscribeUserWorkoutPlans,
  type SavedWorkoutPlan,
} from "@/lib/workout-plan-repository";

type TemplateMeta = {
  id: string;
  name: string;
  exerciseCount: number;
  lines: PlanLine[];
};

function toTemplateMeta(p: SavedWorkoutPlan): TemplateMeta {
  return {
    id: p.id,
    name: p.plan.name,
    exerciseCount: p.plan.lines.length,
    lines: p.plan.lines,
  };
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

export function HomeStartWorkout() {
  const router = useRouter();
  const { user, firebaseReady } = useAuth();
  const savedPlans = useSavedWorkoutPlans(user, firebaseReady);

  const startTemplate = (template: TemplateMeta) => {
    const params = new URLSearchParams({
      e: template.lines.map((line) => line.exerciseId).join(","),
      t: template.name,
      p: template.id,
    });
    router.push(`/workout?${params.toString()}`);
  };

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
              return (
                <li key={p.id}>
                  <div className="flex flex-col gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-3 transition sm:flex-row sm:items-center sm:justify-between dark:border-zinc-800 dark:bg-zinc-950">
                    <div className="min-w-0 flex-1">
                      <span className="font-medium text-zinc-900 dark:text-zinc-50">
                        {meta.name}
                      </span>
                      <span className="mt-0.5 block text-xs text-zinc-500">
                        {meta.exerciseCount} exercise
                        {meta.exerciseCount === 1 ? "" : "s"}
                      </span>
                    </div>
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

      <button
        type="button"
        onClick={() => router.push("/workout")}
        className="flex h-12 w-full items-center justify-center rounded-xl bg-zinc-900 text-base font-semibold text-white transition active:scale-[0.99] dark:bg-zinc-50 dark:text-zinc-900"
      >
        Start workout
      </button>
    </div>
  );
}

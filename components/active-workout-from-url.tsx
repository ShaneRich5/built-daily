"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActiveWorkoutView } from "@/components/active-workout-view";
import {
  getCatalogExerciseById,
  resolveExercisesFromUrl,
} from "@/lib/exercise-catalog";
import type { ActiveWorkoutFinishSnapshot } from "@/lib/workout-session-mapper";
import { getWorkoutPlan } from "@/lib/workout-plan-repository";
import { saveCompletedWorkoutSession } from "@/lib/workout-session-repository";
import type { WorkoutPlanDoc } from "@/lib/workout-types";

const QUERY_EXERCISES = "e";
const QUERY_TITLE = "t";
const QUERY_PLAN = "p";

export function ActiveWorkoutFromUrl() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const { title, ids, planId } = useMemo(() => {
    const raw = searchParams.get(QUERY_EXERCISES);
    const titleParam = searchParams.get(QUERY_TITLE);
    const planParam = searchParams.get(QUERY_PLAN);
    const parsedIds = raw
      ? raw
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : [];
    const titleResolved =
      titleParam && titleParam.trim().length > 0
        ? titleParam.trim()
        : "Workout";
    const planResolved =
      planParam && planParam.trim().length > 0 ? planParam.trim() : null;
    return { title: titleResolved, ids: parsedIds, planId: planResolved };
  }, [searchParams]);

  const needsPlanFetch = Boolean(
    planId &&
      !planId.startsWith("starter-") &&
      ids.some((id) => !getCatalogExerciseById(id)),
  );

  const fetchKey =
    needsPlanFetch && planId ? `${planId}:${ids.join(",")}` : "";

  const [planLoad, setPlanLoad] = useState<{
    key: string;
    doc: WorkoutPlanDoc | null;
  } | null>(null);

  useEffect(() => {
    if (!fetchKey || !planId) return;
    let cancelled = false;
    void getWorkoutPlan(planId).then((res) => {
      if (!cancelled) {
        setPlanLoad({ key: fetchKey, doc: res?.plan ?? null });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [fetchKey, planId]);

  const planReady = !needsPlanFetch || planLoad?.key === fetchKey;

  const exercises = useMemo(() => {
    if (!planReady) return null;
    const lines = needsPlanFetch ? (planLoad?.doc?.lines ?? null) : null;
    return resolveExercisesFromUrl(ids, lines);
  }, [planReady, needsPlanFetch, planLoad, ids]);

  /** Remount active session when URL identity changes so local exercise state resets. */
  const workoutSessionKey = useMemo(
    () => `${planId ?? "np"}:${ids.join(",")}`,
    [planId, ids],
  );

  const handleFinish = useCallback(
    async (snapshot: ActiveWorkoutFinishSnapshot) => {
      await saveCompletedWorkoutSession({
        ...snapshot,
        planId: planId ?? snapshot.planId,
      });
      router.push("/");
    },
    [planId, router],
  );

  if (ids.length === 0) {
    return (
      <div className="flex flex-1 flex-col gap-4 py-2">
        <p className="text-sm text-muted-foreground">
          No exercises in this session link. Pick at least one exercise on the
          home screen, then tap start.
        </p>
        <Link
          href="/"
          className="inline-flex h-11 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground"
        >
          Back to home
        </Link>
      </div>
    );
  }

  if (needsPlanFetch && !planReady) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 py-12">
        <p className="text-sm text-muted-foreground">Loading workout…</p>
      </div>
    );
  }

  if (!exercises || exercises.length === 0) {
    return (
      <div className="flex flex-1 flex-col gap-4 py-2">
        <p className="text-sm text-muted-foreground">
          Could not resolve these exercises. If this template uses custom moves,
          sign in and try starting again from home.
        </p>
        <Link
          href="/"
          className="inline-flex h-11 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground"
        >
          Back to home
        </Link>
      </div>
    );
  }

  return (
    <ActiveWorkoutView
      key={workoutSessionKey}
      title={title}
      exercises={exercises}
      planId={planId}
      onFinish={handleFinish}
    />
  );
}

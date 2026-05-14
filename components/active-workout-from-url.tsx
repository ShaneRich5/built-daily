"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { ActiveWorkoutView } from "@/components/active-workout-view";
import { resolveCatalogExercises } from "@/lib/exercise-catalog";

const QUERY_EXERCISES = "e";
const QUERY_TITLE = "t";

export function ActiveWorkoutFromUrl() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const { title, exercises } = useMemo(() => {
    const raw = searchParams.get(QUERY_EXERCISES);
    const titleParam = searchParams.get(QUERY_TITLE);
    const ids = raw
      ? raw
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : [];
    const resolved = resolveCatalogExercises(ids);
    const title =
      titleParam && titleParam.trim().length > 0
        ? titleParam.trim()
        : "Workout";
    return { title, exercises: resolved };
  }, [searchParams]);

  if (exercises.length === 0) {
    return (
      <div className="flex flex-1 flex-col gap-4 py-2">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          No exercises in this session link. Pick at least one exercise on the
          home screen, then tap start.
        </p>
        <Link
          href="/"
          className="inline-flex h-11 items-center justify-center rounded-xl bg-zinc-900 px-4 text-sm font-semibold text-white dark:bg-zinc-50 dark:text-zinc-900"
        >
          Back to home
        </Link>
      </div>
    );
  }

  return (
    <ActiveWorkoutView
      title={title}
      exercises={exercises}
      onFinish={() => router.push("/")}
    />
  );
}

"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { WorkoutTemplateEditor } from "@/components/workout-template-editor";
import {
  getWorkoutPlan,
  type SavedWorkoutPlan,
} from "@/lib/workout-plan-repository";

function planIdFromParams(
  raw: string | string[] | undefined,
): string | null {
  if (typeof raw === "string" && raw.length > 0) return raw;
  if (Array.isArray(raw) && typeof raw[0] === "string" && raw[0].length > 0) {
    return raw[0];
  }
  return null;
}

export default function EditTemplatePage() {
  const params = useParams();
  const planId = planIdFromParams(params.planId);

  if (!planId) {
    return (
      <div className="space-y-4 py-4">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Template not found.
        </p>
        <Link
          href="/"
          className="inline-flex text-sm font-medium text-zinc-900 underline dark:text-zinc-100"
        >
          ← Home
        </Link>
      </div>
    );
  }

  return <EditTemplateLoader key={planId} planId={planId} />;
}

function EditTemplateLoader({ planId }: { planId: string }) {
  const [loaded, setLoaded] = useState<SavedWorkoutPlan | null | "loading">(
    "loading",
  );

  useEffect(() => {
    let cancelled = false;
    void getWorkoutPlan(planId).then((res) => {
      if (!cancelled) setLoaded(res ?? null);
    });
    return () => {
      cancelled = true;
    };
  }, [planId]);

  if (loaded === "loading") {
    return (
      <div className="py-8 text-center text-sm text-zinc-500">Loading…</div>
    );
  }

  if (loaded === null) {
    return (
      <div className="space-y-4 py-4">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Template not found or you are not signed in.
        </p>
        <Link
          href="/"
          className="inline-flex text-sm font-medium text-zinc-900 underline dark:text-zinc-100"
        >
          ← Home
        </Link>
      </div>
    );
  }

  return (
    <WorkoutTemplateEditor
      planId={loaded.id}
      initialPlan={loaded.plan}
    />
  );
}

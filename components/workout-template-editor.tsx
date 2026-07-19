"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { ArrowLeft, Clock, Save, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { WorkoutAddExerciseCard } from "@/components/workout-add-exercise-card";
import { cn } from "@/lib/utils";
import { getCatalogExerciseById, type ExerciseMetric } from "@/lib/exercise-catalog";
import {
  planLineFromCatalogExercise,
  planLineFromCustomName,
} from "@/lib/plan-mapper";
import {
  NOTE_LIMITS,
  type PlanLine,
  type PlanRestPreferences,
  type WorkoutPlanDoc,
} from "@/lib/workout-types";
import {
  createWorkoutPlan,
  deleteWorkoutPlan,
  updateWorkoutPlan,
} from "@/lib/workout-plan-repository";

const MAX_LINES = 40;

const REST_SEC_OPTIONS = [30, 60, 90, 120] as const;

/** Display labels for exercise picker badges (aligned with common tracking shorthand). */
function metricBadgeLabel(metric: ExerciseMetric): string {
  switch (metric) {
    case "weight_reps":
      return "R+W";
    case "bodyweight_reps":
      return "R+T";
    case "duration":
      return "Time";
    case "cardio":
      return "Cardio";
    default: {
      const _e: never = metric;
      return _e;
    }
  }
}

type Props = {
  planId: string | null;
  initialPlan: WorkoutPlanDoc | null;
};

export function WorkoutTemplateEditor({ planId, initialPlan }: Props) {
  const router = useRouter();
  const isEdit = Boolean(planId);

  const [name, setName] = useState(() => initialPlan?.name ?? "");
  const [lines, setLines] = useState<PlanLine[]>(() => initialPlan?.lines ?? []);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [deletePending, setDeletePending] = useState(false);

  const [autoRestTimer, setAutoRestTimer] = useState(
    () => initialPlan?.restPreferences?.autoRestTimer ?? false,
  );
  const [defaultRestSec, setDefaultRestSec] = useState<
    (typeof REST_SEC_OPTIONS)[number]
  >(() => initialPlan?.restPreferences?.defaultRestSec ?? 60);

  const restPreferences: PlanRestPreferences = useMemo(
    () => ({ autoRestTimer, defaultRestSec }),
    [autoRestTimer, defaultRestSec],
  );

  const canSave = useMemo(
    () => name.trim().length > 0 && lines.length > 0 && lines.length <= MAX_LINES,
    [name, lines.length],
  );

  const addExercise = useCallback((exerciseId: string) => {
    setLines((prev) => {
      if (prev.length >= MAX_LINES) return prev;
      const line = planLineFromCatalogExercise(exerciseId);
      if (!line) return prev;
      return [...prev, line];
    });
    setError(null);
  }, []);

  const addCustomLineFromName = useCallback((trimmed: string) => {
    const line = planLineFromCustomName(trimmed);
    if (!line) {
      setError("Enter a name for your custom exercise.");
      return false;
    }
    let added = false;
    setLines((prev) => {
      if (prev.length >= MAX_LINES) return prev;
      added = true;
      return [...prev, line];
    });
    if (!added) {
      setError(`You can add at most ${MAX_LINES} exercises.`);
      return false;
    }
    setError(null);
    return true;
  }, []);

  const removeLine = useCallback(
    (index: number) => {
      if (lines.length <= 1) {
        window.alert("Keep at least one exercise in the template.");
        return;
      }
      const line = lines[index];
      if (!line) return;
      if (
        !window.confirm(`Remove “${line.nameSnapshot}” from this template?`)
      ) {
        return;
      }
      setLines((prev) => prev.filter((_, i) => i !== index));
    },
    [lines],
  );

  const moveLine = useCallback((index: number, delta: -1 | 1) => {
    setLines((prev) => {
      const j = index + delta;
      if (j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      const t = next[index]!;
      next[index] = next[j]!;
      next[j] = t;
      return next;
    });
  }, []);

  const setTargetSets = useCallback((index: number, raw: string) => {
    const t = raw.trim();
    setLines((prev) => {
      const next = [...prev];
      const cur = next[index];
      if (!cur) return prev;
      if (!t) {
        next[index] = { ...cur, targetSets: undefined };
        return next;
      }
      const n = parseInt(t, 10);
      if (!Number.isFinite(n)) return prev;
      next[index] = {
        ...cur,
        targetSets: Math.max(1, Math.min(99, n)),
      };
      return next;
    });
  }, []);

  const setNotes = useCallback((index: number, raw: string) => {
    const slice = raw.slice(0, NOTE_LIMITS.exerciseNote);
    setLines((prev) => {
      const next = [...prev];
      const cur = next[index];
      if (!cur) return prev;
      const trimmed = slice.trim();
      next[index] = {
        ...cur,
        notes: trimmed.length > 0 ? trimmed : null,
      };
      return next;
    });
  }, []);

  const onSave = useCallback(async () => {
    setError(null);
    const trimmedName = name.trim().slice(0, NOTE_LIMITS.title);
    if (!trimmedName) {
      setError("Give this workout a name.");
      return;
    }
    if (lines.length === 0) {
      setError("Add at least one exercise.");
      return;
    }

    const now = new Date();
    const doc: WorkoutPlanDoc = {
      name: trimmedName,
      createdAt: initialPlan?.createdAt ?? now,
      updatedAt: now,
      source: "custom",
      restPreferences,
      lines: lines.map((line) => ({
        ...line,
        nameSnapshot:
          getCatalogExerciseById(line.exerciseId)?.name ?? line.nameSnapshot,
      })),
    };

    setPending(true);
    try {
      if (planId) {
        const ok = await updateWorkoutPlan(planId, doc);
        if (!ok) throw new Error("Could not save. Try signing in again.");
      } else {
        const id = await createWorkoutPlan(doc);
        if (!id) throw new Error("Could not save. Try signing in again.");
        router.replace(`/templates/${id}`);
      }
      router.refresh();
    } catch {
      setError("Something went wrong while saving.");
    } finally {
      setPending(false);
    }
  }, [name, lines, planId, router, initialPlan?.createdAt, restPreferences]);

  const onDelete = useCallback(async () => {
    if (!planId) return;
    if (!window.confirm("Delete this workout template? This cannot be undone."))
      return;
    setDeletePending(true);
    setError(null);
    try {
      const ok = await deleteWorkoutPlan(planId);
      if (!ok) throw new Error("fail");
      router.push("/");
      router.refresh();
    } catch {
      setError("Could not delete this template.");
    } finally {
      setDeletePending(false);
    }
  }, [planId, router]);

  const restToggleValue = useMemo(
    () => [String(defaultRestSec)] as string[],
    [defaultRestSec],
  );

  const cardClass = "gap-6 py-6 shadow-none";

  return (
    <div className="space-y-6 pb-10">
      <h1 className="sr-only">{isEdit ? "Edit workout" : "Create workout"}</h1>
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-2">
          <Link
            href="/"
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              "gap-1.5 px-2 text-muted-foreground",
            )}
          >
            <ArrowLeft className="size-4" />
            Back
          </Link>
        </div>
        <Button
          type="button"
          className="gap-2"
          disabled={!canSave || pending}
          onClick={() => void onSave()}
        >
          <Save className="size-4" />
          {pending ? "Saving…" : "Save workout"}
        </Button>
      </div>

      <Card className={cardClass}>
        <CardHeader className="px-6 pb-0">
          <CardTitle className="text-lg font-semibold tracking-tight">
            Workout Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 px-6">
          <div className="space-y-2">
            <Label htmlFor="workout-name">Workout Name</Label>
            <Input
              id="workout-name"
              value={name}
              onChange={(e) =>
                setName(e.target.value.slice(0, NOTE_LIMITS.title))
              }
              placeholder="e.g., Upper Body Strength"
            />
          </div>

          <div className="space-y-4 rounded-lg border border-border bg-muted/30 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Timer settings
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <Label htmlFor="auto-rest" className="text-sm font-medium">
                  Auto Rest Timer
                </Label>
                <p className="text-sm text-muted-foreground">
                  Automatically start rest timer after completing sets
                </p>
              </div>
              <Switch
                id="auto-rest"
                checked={autoRestTimer}
                onCheckedChange={setAutoRestTimer}
                className="shrink-0 sm:mt-0"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Default Rest Time</Label>
              <ToggleGroup
                spacing={0}
                variant="outline"
                value={restToggleValue}
                onValueChange={(values) => {
                  const v = values[0];
                  if (v === "30" || v === "60" || v === "90" || v === "120") {
                    setDefaultRestSec(
                      Number(v) as (typeof REST_SEC_OPTIONS)[number],
                    );
                  }
                }}
                className="flex w-full max-w-md flex-wrap gap-0 sm:flex-nowrap"
              >
                {REST_SEC_OPTIONS.map((sec) => (
                  <ToggleGroupItem
                    key={sec}
                    value={String(sec)}
                    className="min-w-0 flex-1 justify-center px-2 sm:px-3"
                  >
                    {sec}s
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </div>

            <Button type="button" variant="outline" className="gap-2" disabled>
              <Clock className="size-4" />
              Start Rest Timer
              <span className="sr-only">(available during live workouts)</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      <WorkoutAddExerciseCard
        currentCount={lines.length}
        maxExercises={MAX_LINES}
        onAddCatalog={addExercise}
        onAddCustom={addCustomLineFromName}
      />

      <Card className={cardClass}>
        {lines.length > 0 ? (
          <>
            <CardHeader className="px-6 pb-0">
              <CardTitle className="text-lg font-semibold tracking-tight">
                Exercises in this workout
              </CardTitle>
              <CardDescription>
                Reorder, set targets, or remove moves.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 px-6">
              <ul className="space-y-3">
                {lines.map((line, index) => {
                  const catalog = getCatalogExerciseById(line.exerciseId);
                  return (
                    <li
                      key={line.lineId}
                      className="rounded-lg border border-border bg-background p-3"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex min-w-0 flex-1 items-start gap-2">
                          <p className="font-medium text-foreground">
                            {catalog?.name ?? line.nameSnapshot}
                          </p>
                          <Badge variant="outline" className="shrink-0 text-xs">
                            {metricBadgeLabel(line.metric)}
                          </Badge>
                        </div>
                        <div className="flex shrink-0 flex-wrap gap-1">
                          <Button
                            type="button"
                            variant="outline"
                            size="xs"
                            aria-label="Move up"
                            disabled={index === 0}
                            onClick={() => moveLine(index, -1)}
                          >
                            ↑
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="xs"
                            aria-label="Move down"
                            disabled={index === lines.length - 1}
                            onClick={() => moveLine(index, 1)}
                          >
                            ↓
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="xs"
                            className="text-destructive hover:bg-destructive/10"
                            aria-label="Remove exercise"
                            onClick={() => removeLine(index)}
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </div>
                      {!catalog ? (
                        <p className="mt-2 text-xs text-muted-foreground">
                          Custom exercise (not in shared catalog).
                        </p>
                      ) : null}
                      <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        <div className="space-y-1.5">
                          <Label
                            className="text-xs text-muted-foreground"
                            htmlFor={`target-${line.lineId}`}
                          >
                            Target sets (optional)
                          </Label>
                          <Input
                            id={`target-${line.lineId}`}
                            type="number"
                            inputMode="numeric"
                            min={1}
                            max={99}
                            step={1}
                            value={
                              line.targetSets === undefined ||
                              line.targetSets === null
                                ? ""
                                : String(line.targetSets)
                            }
                            onChange={(e) =>
                              setTargetSets(index, e.target.value)
                            }
                            placeholder="e.g. 3"
                            className="[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                          />
                        </div>
                        <div className="space-y-1.5 sm:col-span-2">
                          <Label
                            className="text-xs text-muted-foreground"
                            htmlFor={`notes-${line.lineId}`}
                          >
                            Note (optional)
                          </Label>
                          <Textarea
                            id={`notes-${line.lineId}`}
                            value={line.notes ?? ""}
                            onChange={(e) => setNotes(index, e.target.value)}
                            rows={2}
                            placeholder="e.g. Pause at bottom"
                          />
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </>
        ) : (
          <CardContent className="px-6 py-6">
            <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-muted-foreground/30 bg-muted/10 py-16 text-center">
              <p className="text-sm font-medium text-foreground">
                No exercises added yet
              </p>
              <p className="max-w-sm text-sm text-muted-foreground">
                Add exercises above to start building your workout
              </p>
            </div>
          </CardContent>
        )}
      </Card>

      {error ? (
        <p
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {error}
        </p>
      ) : null}

      {planId ? (
        <div className="flex justify-center pt-2">
          <Button
            type="button"
            variant="ghost"
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            disabled={deletePending}
            onClick={() => void onDelete()}
          >
            {deletePending ? "Deleting…" : "Delete workout template"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

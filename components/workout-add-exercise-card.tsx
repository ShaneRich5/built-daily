"use client";

import { useCallback, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  filterCatalogExercises,
  type ExerciseMetric,
} from "@/lib/exercise-catalog";

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

export type WorkoutAddExerciseCardProps = {
  currentCount: number;
  maxExercises?: number;
  onAddCatalog: (exerciseId: string) => void;
  /** Return true if the name was accepted (clears the input). */
  onAddCustom: (name: string) => boolean;
};

const DEFAULT_MAX = 40;

export function WorkoutAddExerciseCard({
  currentCount,
  maxExercises = DEFAULT_MAX,
  onAddCatalog,
  onAddCustom,
}: WorkoutAddExerciseCardProps) {
  const [customName, setCustomName] = useState("");
  const [query, setQuery] = useState("");
  const atLimit = currentCount >= maxExercises;

  const filtered = useMemo(() => filterCatalogExercises(query), [query]);

  const submitCustom = useCallback(() => {
    const trimmed = customName.trim();
    if (!trimmed) return;
    if (onAddCustom(trimmed)) {
      setCustomName("");
    }
  }, [customName, onAddCustom]);

  return (
    <Card className="gap-6 py-6 shadow-none">
      <CardHeader className="px-6 pb-0">
        <CardTitle className="text-lg font-semibold tracking-tight">
          Add Exercise
        </CardTitle>
        <CardDescription>
          Search machines and free weights, or add your own
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 px-6">
        <Input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search (leg press, lat pulldown, cable…)"
          aria-label="Search exercises"
        />
        <div className="grid max-h-[min(20rem,40vh)] grid-cols-1 gap-2 overflow-y-auto md:grid-cols-2">
          {filtered.length === 0 ? (
            <p className="col-span-full py-4 text-center text-sm text-muted-foreground">
              No matches. Try another search or add a custom name below.
            </p>
          ) : (
            filtered.map((ex) => (
              <Button
                key={ex.id}
                type="button"
                variant="outline"
                className="h-auto min-h-[3rem] w-full justify-between gap-2 px-3 py-2.5 text-left font-normal"
                disabled={atLimit}
                onClick={() => onAddCatalog(ex.id)}
              >
                <span className="flex min-w-0 flex-1 items-center gap-2">
                  <Plus
                    className="size-4 shrink-0 text-muted-foreground"
                    aria-hidden
                  />
                  <span className="truncate font-medium text-foreground">
                    {ex.name}
                  </span>
                </span>
                <Badge variant="secondary" className="shrink-0 font-normal">
                  {metricBadgeLabel(ex.metric)}
                </Badge>
              </Button>
            ))
          )}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
          <Input
            value={customName}
            onChange={(e) => setCustomName(e.target.value.slice(0, 200))}
            placeholder="Custom exercise name"
            className="sm:flex-1"
            disabled={atLimit}
            onKeyDown={(e) => {
              if (e.key === "Enter") submitCustom();
            }}
          />
          <Button
            type="button"
            className="shrink-0 sm:w-36"
            disabled={atLimit}
            onClick={submitCustom}
          >
            Add Custom
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

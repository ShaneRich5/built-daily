"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Replace } from "lucide-react";
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
  /**
   * When set, this picker replaces an existing exercise instead of adding.
   * Pass the current exercise name for the description.
   */
  replacingName?: string;
  onCancelReplace?: () => void;
  /** Skip Card chrome when nested inside another panel. */
  embedded?: boolean;
  /**
   * Collapse the catalog behind a compact summary (active workout).
   * Opens by default when there are no exercises yet.
   */
  collapsible?: boolean;
};

const DEFAULT_MAX = 40;

export function WorkoutAddExerciseCard({
  currentCount,
  maxExercises = DEFAULT_MAX,
  onAddCatalog,
  onAddCustom,
  replacingName,
  onCancelReplace,
  embedded = false,
  collapsible = false,
}: WorkoutAddExerciseCardProps) {
  const [customName, setCustomName] = useState("");
  const [query, setQuery] = useState("");
  const isReplace = replacingName !== undefined;
  const atLimit = !isReplace && currentCount >= maxExercises;
  const emptyWorkout = currentCount === 0;
  const [addPanelOpen, setAddPanelOpen] = useState(emptyWorkout);

  useEffect(() => {
    setAddPanelOpen(emptyWorkout);
  }, [emptyWorkout]);

  const filtered = useMemo(() => filterCatalogExercises(query), [query]);

  const submitCustom = useCallback(() => {
    const trimmed = customName.trim();
    if (!trimmed) return;
    if (onAddCustom(trimmed)) {
      setCustomName("");
    }
  }, [customName, onAddCustom]);

  const title = isReplace ? "Change exercise" : "Add Exercise";
  const description = isReplace
    ? `Pick a replacement for “${replacingName}”`
    : "Search machines and free weights, or add your own";
  const PickIcon = isReplace ? Replace : Plus;
  const customButtonLabel = isReplace ? "Use Custom" : "Add Custom";

  const body = (
    <div className={embedded || collapsible ? "space-y-3" : "space-y-4"}>
      {embedded ? (
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">{title}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
          </div>
          {onCancelReplace ? (
            <button
              type="button"
              onClick={onCancelReplace}
              className="shrink-0 text-xs font-semibold text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300"
            >
              Cancel
            </button>
          ) : null}
        </div>
      ) : null}
      <Input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search (leg press, lat pulldown, cable…)"
        aria-label={isReplace ? "Search replacement exercise" : "Search exercises"}
        autoFocus={embedded && isReplace}
      />
      <div
        className={`grid grid-cols-1 gap-2 overflow-y-auto md:grid-cols-2 ${
          embedded || collapsible
            ? "max-h-[min(16rem,35vh)]"
            : "max-h-[min(20rem,40vh)]"
        }`}
      >
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
                <PickIcon
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
          {customButtonLabel}
        </Button>
      </div>
      {atLimit ? (
        <p className="text-xs text-muted-foreground">
          You’ve reached the {maxExercises}-exercise limit for this workout.
        </p>
      ) : null}
    </div>
  );

  if (embedded) {
    return (
      <div className="rounded-lg border border-zinc-200 bg-zinc-50/80 p-3 dark:border-zinc-700 dark:bg-zinc-900/50">
        {body}
      </div>
    );
  }

  if (collapsible && !isReplace) {
    return (
      <details
        className="group shrink-0 rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950"
        open={addPanelOpen}
        onToggle={(e) => setAddPanelOpen(e.currentTarget.open)}
      >
        <summary className="cursor-pointer list-none px-3 py-2.5 marker:content-none [&::-webkit-details-marker]:hidden">
          <span className="flex items-center justify-between gap-2">
            <span className="inline-flex min-w-0 items-center gap-2">
              <Plus
                className="size-4 shrink-0 text-zinc-500 group-open:hidden"
                aria-hidden
              />
              <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                {title}
              </span>
              {atLimit ? (
                <span className="truncate text-xs font-normal text-zinc-400">
                  Limit reached
                </span>
              ) : emptyWorkout ? (
                <span className="truncate text-xs font-normal text-zinc-400">
                  Search or add custom
                </span>
              ) : null}
            </span>
            <span className="shrink-0 text-xs font-medium text-zinc-400 underline-offset-2 group-open:hidden group-hover:text-zinc-600 group-hover:underline dark:group-hover:text-zinc-300">
              Open
            </span>
            <span className="hidden shrink-0 text-xs font-medium text-zinc-400 group-open:inline dark:text-zinc-500">
              Close
            </span>
          </span>
        </summary>
        <div className="border-t border-zinc-100 px-3 pb-3 pt-3 dark:border-zinc-800">
          <p className="mb-3 text-xs text-zinc-500">{description}</p>
          {body}
        </div>
      </details>
    );
  }

  return (
    <Card className="gap-6 py-6 shadow-none">
      <CardHeader className="px-6 pb-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <CardTitle className="text-lg font-semibold tracking-tight">
              {title}
            </CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          {onCancelReplace ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onCancelReplace}
            >
              Cancel
            </Button>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="px-6">{body}</CardContent>
    </Card>
  );
}

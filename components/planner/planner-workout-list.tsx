"use client";

import Link from "next/link";
import { ActivityTypeIcon } from "@/components/activity-type-icon";
import { Button } from "@/components/ui/button";
import {
  buildWorkoutHref,
  formatPlannerGroupLabel,
  type PlannerListItem,
} from "@/lib/planner-list-items";
import { formatSessionVolumeMeta } from "@/lib/workout-date";

type PlannerWorkoutListProps = {
  items: PlannerListItem[];
  todayKey: string;
  emptyTitle: string;
  emptyHint: string;
  onRemoveScheduled: (id: string) => void;
};

function formatTime(d: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(d);
}

function kindBadge(kind: PlannerListItem["kind"]): string {
  switch (kind) {
    case "completed":
      return "Workout";
    case "activity":
      return "Activity";
    case "planned":
      return "Planned";
    case "reminder":
      return "Reminder";
  }
}

export function PlannerWorkoutList({
  items,
  todayKey,
  emptyTitle,
  emptyHint,
  onRemoveScheduled,
}: PlannerWorkoutListProps) {
  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50/80 px-4 py-8 text-center dark:border-zinc-800 dark:bg-zinc-950/40">
        <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
          {emptyTitle}
        </p>
        <p className="mt-1 text-sm text-zinc-500">{emptyHint}</p>
      </div>
    );
  }

  const groups: Array<{ dateKey: string; items: PlannerListItem[] }> = [];
  for (const item of items) {
    const last = groups[groups.length - 1];
    if (last && last.dateKey === item.dateKey) last.items.push(item);
    else groups.push({ dateKey: item.dateKey, items: [item] });
  }

  return (
    <section className="space-y-4" aria-label="Workouts and activities">
      {groups.map((group) => (
        <div key={group.dateKey} className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            {formatPlannerGroupLabel(group.dateKey, todayKey)}
          </h3>
          <ul className="space-y-2">
            {group.items.map((item) => (
              <li key={`${item.kind}-${item.id}`}>
                <ListRow item={item} onRemoveScheduled={onRemoveScheduled} />
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}

function ListRow({
  item,
  onRemoveScheduled,
}: {
  item: PlannerListItem;
  onRemoveScheduled: (id: string) => void;
}) {
  if (item.kind === "completed") {
    return (
      <Link
        href={`/sessions/${item.id}`}
        className="block rounded-xl border border-zinc-200 bg-white px-3 py-3 transition hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-700 dark:hover:bg-zinc-900"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
              {kindBadge(item.kind)}
            </p>
            <p className="font-medium text-zinc-900 dark:text-zinc-50">
              {item.title}
            </p>
            <p className="mt-0.5 text-xs text-zinc-500">
              {formatSessionVolumeMeta(
                item.exerciseCount,
                item.setCount,
                "completed",
              )}
              {item.previewNames.length > 0
                ? ` · ${item.previewNames.slice(0, 3).join(", ")}`
                : ""}
            </p>
          </div>
          <time className="shrink-0 text-xs tabular-nums text-zinc-500">
            {formatTime(item.endedAt ?? item.startedAt)}
          </time>
        </div>
      </Link>
    );
  }

  if (item.kind === "activity") {
    return (
      <Link
        href={`/activities/${item.id}`}
        className="flex items-start gap-3 rounded-xl border border-zinc-200 bg-white px-3 py-3 transition hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-700 dark:hover:bg-zinc-900"
      >
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
          <ActivityTypeIcon icon={item.icon} className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400">
            {kindBadge(item.kind)}
          </p>
          <p className="font-medium text-zinc-900 dark:text-zinc-50">
            {item.title}
          </p>
          <p className="mt-0.5 text-xs text-zinc-500">{item.meta}</p>
        </div>
      </Link>
    );
  }

  const href =
    item.kind === "planned"
      ? buildWorkoutHref(item.title, item.planId, item.exerciseIds)
      : null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-3 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="min-w-0">
        <p
          className={`text-[11px] font-semibold uppercase tracking-wide ${
            item.kind === "planned"
              ? "text-sky-700 dark:text-sky-400"
              : "text-zinc-500"
          }`}
        >
          {kindBadge(item.kind)}
        </p>
        <p className="font-medium text-zinc-900 dark:text-zinc-50">
          {item.title}
        </p>
        {item.kind === "planned" ? (
          <p className="mt-0.5 text-xs text-zinc-500">
            {item.exerciseCount} exercise
            {item.exerciseCount === 1 ? "" : "s"}
          </p>
        ) : (
          <p className="mt-0.5 text-xs text-zinc-500">Reminder</p>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {href ? (
          <Link
            href={href}
            className="rounded-md bg-zinc-900 px-2.5 py-1.5 text-xs font-semibold text-white dark:bg-zinc-50 dark:text-zinc-900"
          >
            Start
          </Link>
        ) : null}
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 text-xs"
          onClick={() => onRemoveScheduled(item.id)}
        >
          Remove
        </Button>
      </div>
    </div>
  );
}

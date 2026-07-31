"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type {
  PlannerDatePreset,
  PlannerKindFilter,
} from "@/lib/planner-list-items";

const DATE_PRESETS: { id: PlannerDatePreset; label: string }[] = [
  { id: "this_month", label: "This month" },
  { id: "upcoming", label: "Upcoming" },
  { id: "history", label: "History" },
  { id: "this_week", label: "This week" },
  { id: "custom", label: "Custom" },
];

const KIND_FILTERS: { id: PlannerKindFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "workouts", label: "Workouts" },
  { id: "activities", label: "Activities" },
  { id: "planned", label: "Planned" },
  { id: "reminders", label: "Reminders" },
  { id: "missed", label: "Missed" },
];

type PlannerFiltersProps = {
  search: string;
  onSearchChange: (value: string) => void;
  datePreset: PlannerDatePreset;
  onDatePresetChange: (preset: PlannerDatePreset) => void;
  kind: PlannerKindFilter;
  onKindChange: (kind: PlannerKindFilter) => void;
  customFrom: string;
  customTo: string;
  onCustomFromChange: (value: string) => void;
  onCustomToChange: (value: string) => void;
  selectedDateKey: string | null;
  onClearSelectedDay: () => void;
};

export function PlannerFilters({
  search,
  onSearchChange,
  datePreset,
  onDatePresetChange,
  kind,
  onKindChange,
  customFrom,
  customTo,
  onCustomFromChange,
  onCustomToChange,
  selectedDateKey,
  onClearSelectedDay,
}: PlannerFiltersProps) {
  return (
    <section
      className="space-y-3 rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950 sm:p-4"
      aria-label="Filters"
    >
      <Input
        type="search"
        placeholder="Search workouts, plans, activities…"
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        className="h-11"
        aria-label="Search planner"
      />

      <div className="space-y-1.5">
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
          Date
        </p>
        <div className="flex flex-wrap gap-1.5">
          {DATE_PRESETS.map((p) => (
            <Button
              key={p.id}
              type="button"
              size="sm"
              variant={datePreset === p.id ? "default" : "outline"}
              className="h-9"
              onClick={() => onDatePresetChange(p.id)}
            >
              {p.label}
            </Button>
          ))}
          {selectedDateKey && datePreset === "selected_day" ? (
            <Button
              type="button"
              size="sm"
              variant="default"
              className="h-9"
              onClick={onClearSelectedDay}
            >
              Day · clear
            </Button>
          ) : null}
        </div>
        {datePreset === "custom" ? (
          <div className="flex flex-wrap items-end gap-2 pt-1">
            <label className="flex min-w-[9rem] flex-1 flex-col gap-1 text-xs font-medium text-zinc-600 dark:text-zinc-400">
              From
              <Input
                type="date"
                value={customFrom}
                onChange={(e) => onCustomFromChange(e.target.value)}
                className="h-10"
              />
            </label>
            <label className="flex min-w-[9rem] flex-1 flex-col gap-1 text-xs font-medium text-zinc-600 dark:text-zinc-400">
              To
              <Input
                type="date"
                value={customTo}
                onChange={(e) => onCustomToChange(e.target.value)}
                className="h-10"
              />
            </label>
          </div>
        ) : null}
      </div>

      <div className="space-y-1.5">
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
          Show
        </p>
        <div className="flex flex-wrap gap-1.5">
          {KIND_FILTERS.map((k) => (
            <Button
              key={k.id}
              type="button"
              size="sm"
              variant={kind === k.id ? "default" : "outline"}
              className="h-9"
              onClick={() => onKindChange(k.id)}
            >
              {k.label}
            </Button>
          ))}
        </div>
      </div>
    </section>
  );
}

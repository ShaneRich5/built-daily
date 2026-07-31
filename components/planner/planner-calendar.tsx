"use client";

import { ChevronLeft, ChevronRight, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  formatMonthHeading,
  WEEKDAY_LABELS_SHORT,
  type CalendarDayCell,
} from "@/lib/calendar-month";
import type { PlannerCalendarView } from "@/lib/calendar-views";
import type { PlannerDayMarkers } from "@/lib/planner-list-items";

const VIEW_OPTIONS: { id: PlannerCalendarView; label: string }[] = [
  { id: "week", label: "Week" },
  { id: "month", label: "Month" },
  { id: "three_months", label: "3 mo" },
];

type MonthBlock = {
  year: number;
  monthIndex: number;
  cells: CalendarDayCell[];
};

type PlannerCalendarProps = {
  visible: boolean;
  onVisibleChange: (visible: boolean) => void;
  view: PlannerCalendarView;
  onViewChange: (view: PlannerCalendarView) => void;
  heading: string;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  selectedDateKey: string | null;
  onSelectDate: (dateKey: string) => void;
  rangeStartKey: string;
  rangeEndKey: string;
  markersByDate: Map<string, PlannerDayMarkers>;
  /** Single grid for week/month */
  cells?: CalendarDayCell[];
  /** Multi-month blocks */
  monthBlocks?: MonthBlock[];
  compact?: boolean;
};

function DayMarkers({ markers }: { markers: PlannerDayMarkers | undefined }) {
  if (!markers) return null;
  const showReminder = markers.hasReminder && !markers.hasPlan;
  return (
    <span className="mt-0.5 flex h-3 items-center justify-center gap-0.5">
      {markers.hasWorkout ? (
        <span
          className="h-1.5 w-1.5 rounded-full bg-emerald-500"
          title="Logged workout"
        />
      ) : null}
      {markers.hasActivity ? (
        <span
          className="h-1.5 w-1.5 rounded-full bg-amber-500"
          title="Activity"
        />
      ) : null}
      {markers.hasPlan ? (
        <span
          className="h-1.5 w-1.5 rounded-full border border-sky-500 bg-sky-100 dark:bg-sky-950"
          title="Scheduled session"
        />
      ) : null}
      {showReminder ? (
        <span
          className="h-1.5 w-1.5 rounded-full bg-zinc-300 dark:bg-zinc-600"
          title="Reminder"
        />
      ) : null}
    </span>
  );
}

function DayCellButton({
  cell,
  selected,
  inRange,
  markers,
  onSelect,
  compact,
}: {
  cell: CalendarDayCell;
  selected: boolean;
  inRange: boolean;
  markers: PlannerDayMarkers | undefined;
  onSelect: (dateKey: string) => void;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(cell.dateKey)}
      className={`flex flex-col items-center justify-start rounded-lg border px-0.5 py-1 text-xs transition ${
        compact ? "min-h-[36px]" : "min-h-[44px] sm:min-h-[52px]"
      } ${
        selected
          ? "border-zinc-900 bg-zinc-100 ring-2 ring-zinc-900/20 dark:border-zinc-100 dark:bg-zinc-800 dark:ring-zinc-100/20"
          : "border-transparent bg-zinc-50/80 hover:border-zinc-200 dark:bg-zinc-900/40 dark:hover:border-zinc-700"
      } ${
        cell.isCurrentMonth
          ? "text-zinc-900 dark:text-zinc-50"
          : "text-zinc-400 dark:text-zinc-500"
      } ${inRange ? "" : "opacity-40"}`}
    >
      <span
        className={`font-semibold tabular-nums ${
          compact ? "text-[10px]" : "text-[11px] sm:text-sm"
        } ${cell.isToday ? "text-emerald-700 dark:text-emerald-400" : ""}`}
      >
        {cell.dayOfMonth}
      </span>
      <DayMarkers markers={markers} />
    </button>
  );
}

function WeekdayHeader({ compact }: { compact?: boolean }) {
  return (
    <div
      className={`grid grid-cols-7 gap-0.5 text-center font-semibold uppercase tracking-wide text-zinc-500 ${
        compact ? "text-[9px]" : "text-[10px] sm:text-xs"
      }`}
    >
      {WEEKDAY_LABELS_SHORT.map((d) => (
        <div key={d} className="py-1">
          {d}
        </div>
      ))}
    </div>
  );
}

export function PlannerCalendar({
  visible,
  onVisibleChange,
  view,
  onViewChange,
  heading,
  onPrev,
  onNext,
  onToday,
  selectedDateKey,
  onSelectDate,
  rangeStartKey,
  rangeEndKey,
  markersByDate,
  cells,
  monthBlocks,
  compact,
}: PlannerCalendarProps) {
  return (
    <section
      className="rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950 sm:p-4"
      aria-labelledby="planner-cal-heading"
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2
          id="planner-cal-heading"
          className="text-sm font-semibold text-zinc-900 dark:text-zinc-50"
        >
          Calendar
        </h2>
        <div className="flex flex-wrap items-center gap-1.5">
          {VIEW_OPTIONS.map((v) => (
            <Button
              key={v.id}
              type="button"
              size="sm"
              variant={visible && view === v.id ? "default" : "outline"}
              className="h-8 px-2.5 text-xs"
              disabled={!visible}
              onClick={() => {
                onVisibleChange(true);
                onViewChange(v.id);
              }}
            >
              {v.label}
            </Button>
          ))}
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 gap-1 px-2.5 text-xs"
            onClick={() => onVisibleChange(!visible)}
            aria-pressed={!visible}
          >
            {visible ? (
              <>
                <EyeOff className="h-3.5 w-3.5" />
                Hide
              </>
            ) : (
              <>
                <Eye className="h-3.5 w-3.5" />
                Show
              </>
            )}
          </Button>
        </div>
      </div>

      {!visible ? (
        <p className="text-sm text-zinc-500">
          Calendar hidden — browse with filters and the list below.
        </p>
      ) : (
        <>
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={onPrev}
                aria-label="Previous"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={onNext}
                aria-label="Next"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <p className="min-w-0 flex-1 text-center text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              {heading}
            </p>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="shrink-0 text-xs"
              onClick={onToday}
            >
              Today
            </Button>
          </div>

          {view === "three_months" && monthBlocks ? (
            <div className="space-y-4">
              {monthBlocks.map((block) => (
                <div key={`${block.year}-${block.monthIndex}`}>
                  <p className="mb-1 text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                    {formatMonthHeading(block.year, block.monthIndex)}
                  </p>
                  <WeekdayHeader compact />
                  <div className="mt-0.5 grid grid-cols-7 gap-0.5">
                    {block.cells.map((cell) => (
                      <DayCellButton
                        key={cell.dateKey}
                        cell={cell}
                        selected={selectedDateKey === cell.dateKey}
                        inRange={
                          cell.dateKey >= rangeStartKey &&
                          cell.dateKey <= rangeEndKey
                        }
                        markers={markersByDate.get(cell.dateKey)}
                        onSelect={onSelectDate}
                        compact
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : cells ? (
            <>
              <WeekdayHeader compact={compact || view === "week"} />
              <div
                className={`mt-1 grid grid-cols-7 ${
                  view === "week" ? "gap-1.5" : "gap-1"
                }`}
              >
                {cells.map((cell) => (
                  <DayCellButton
                    key={cell.dateKey}
                    cell={cell}
                    selected={selectedDateKey === cell.dateKey}
                    inRange={
                      cell.dateKey >= rangeStartKey &&
                      cell.dateKey <= rangeEndKey
                    }
                    markers={markersByDate.get(cell.dateKey)}
                    onSelect={onSelectDate}
                    compact={compact}
                  />
                ))}
              </div>
            </>
          ) : null}

          <ul className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-zinc-500">
            <li className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Workout
            </li>
            <li className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
              Activity
            </li>
            <li className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full border border-sky-500 bg-sky-100 dark:bg-sky-950" />
              Planned
            </li>
            <li className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-zinc-300 dark:bg-zinc-600" />
              Reminder
            </li>
          </ul>
        </>
      )}
    </section>
  );
}

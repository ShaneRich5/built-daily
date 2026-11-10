import { cn } from "@/lib/utils";
import { PlannerCalendar } from "@/features/planner/planner-calendar";
import { PlannerDayAgenda } from "@/features/planner/planner-day-agenda";
import type { PlannerAgendaItem, PlannerCalendarDay, PlannerView as View } from "@/features/planner/planner-model";
import { PlannerTemplates, type PlannerTemplateRow } from "@/features/planner/planner-templates";
import { WeekBoard, type WeekBoardProps } from "@/features/planner/week-board";

const secondaryButton =
  "inline-flex h-11 flex-1 items-center justify-center rounded-lg border border-zinc-200 bg-white text-[13px] font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:bg-zinc-900";

export type PlannerViewProps = {
  view: View;
  onViewChange: (view: View) => void;
  calendarTitle: string;
  days: PlannerCalendarDay[];
  selectedKey: string;
  onSelect: (dateKey: string) => void;
  onPrev: () => void;
  onNext: () => void;
  agendaHeading: string;
  agenda: PlannerAgendaItem[];
  canPlan: boolean;
  onPlan: () => void;
  onLogActivity: () => void;
  onRemovePlanned: (id: string) => void;
  /** Week view only: repeat last week's planned workouts. */
  copyLastWeek: { onCopy: () => void; busy: boolean; message: string | null } | null;
  templates: PlannerTemplateRow[];
  /** Week view shows the rearrangeable week board instead of the calendar and agenda. */
  board: WeekBoardProps | null;
};

/** Planner: the week board (or a month calendar and the day's agenda), then your templates. */
export function PlannerView(props: PlannerViewProps) {
  return (
    <div className="flex flex-1 flex-col gap-4">
      <header className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Planner</h1>
        <div
          role="tablist"
          aria-label="Calendar view"
          className="inline-flex rounded-[10px] border border-zinc-200 bg-zinc-100 p-[3px] dark:border-zinc-800 dark:bg-zinc-900"
        >
          {(["week", "month"] as const).map((v) => (
            <button
              key={v}
              type="button"
              role="tab"
              aria-selected={props.view === v}
              onClick={() => props.onViewChange(v)}
              className={cn(
                "h-9 rounded-lg px-3.5 text-[13px] capitalize",
                props.view === v
                  ? "bg-white font-semibold text-zinc-900 shadow-sm dark:bg-zinc-950 dark:text-zinc-50"
                  : "font-medium text-zinc-500",
              )}
            >
              {v}
            </button>
          ))}
        </div>
      </header>

      {props.board ? (
        <WeekBoard {...props.board} />
      ) : (
        <PlannerCalendar
          view={props.view}
          title={props.calendarTitle}
          days={props.days}
          selectedKey={props.selectedKey}
          onSelect={props.onSelect}
          onPrev={props.onPrev}
          onNext={props.onNext}
        />
      )}

      {props.copyLastWeek ? (
        <div className="-mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
          <button
            type="button"
            disabled={props.copyLastWeek.busy}
            onClick={props.copyLastWeek.onCopy}
            className="h-9 text-[13px] font-medium text-zinc-600 underline underline-offset-4 hover:text-zinc-900 disabled:opacity-50 dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            {props.copyLastWeek.busy ? "Copying…" : "Copy last week’s plan"}
          </button>
          {props.copyLastWeek.message ? (
            <span className="text-xs text-zinc-500" aria-live="polite">
              {props.copyLastWeek.message}
            </span>
          ) : null}
        </div>
      ) : null}

      {props.board ? (
        <div className="flex gap-2">
          <button type="button" onClick={props.onPlan} className={`${secondaryButton} border-dashed border-zinc-300 dark:border-zinc-700`}>
            + Plan a workout
          </button>
          <button type="button" onClick={props.onLogActivity} className={secondaryButton}>
            Log activity
          </button>
        </div>
      ) : (
        <PlannerDayAgenda
          heading={props.agendaHeading}
          items={props.agenda}
          canPlan={props.canPlan}
          onPlan={props.onPlan}
          onLogActivity={props.onLogActivity}
          onRemovePlanned={props.onRemovePlanned}
        />
      )}

      <PlannerTemplates templates={props.templates} />
    </div>
  );
}

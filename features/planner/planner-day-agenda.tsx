import Link from "next/link";
import { Activity, Bell, ChevronRight, Dumbbell, MoreVertical, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { PlannerAgendaItem } from "@/features/planner/planner-model";

type PlannerDayAgendaProps = {
  heading: string;
  items: PlannerAgendaItem[];
  /** Planning only makes sense today or later. */
  canPlan: boolean;
  onPlan: () => void;
  onLogActivity: () => void;
  onRemovePlanned: (id: string) => void;
};

const rowBase =
  "flex min-h-16 items-center gap-2.5 rounded-xl border bg-white px-3 dark:bg-zinc-950";
const secondaryButton =
  "inline-flex h-11 flex-1 items-center justify-center rounded-lg border border-zinc-200 bg-white text-[13px] font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:bg-zinc-900";

function RowText({ title, meta }: { title: string; meta: string }) {
  return (
    <span className="min-w-0 flex-1">
      <span className="block truncate text-[15px] font-medium text-zinc-900 dark:text-zinc-50">{title}</span>
      <span className="block truncate text-xs text-zinc-500 dark:text-zinc-400">{meta}</span>
    </span>
  );
}

function RemoveMenu({ id, title, onRemove }: { id: string; title: string; onRemove: (id: string) => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            aria-label={`Options for ${title}`}
            className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-900"
          />
        }
      >
        <MoreVertical className="size-4" aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuItem variant="destructive" className="min-h-11 gap-2" onClick={() => onRemove(id)}>
          <Trash2 className="size-4" aria-hidden />
          Remove from calendar
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** What happened, or is planned, on the selected day, plus ways to add to it. */
export function PlannerDayAgenda({
  heading,
  items,
  canPlan,
  onPlan,
  onLogActivity,
  onRemovePlanned,
}: PlannerDayAgendaProps) {
  return (
    <section aria-labelledby="agenda-heading" className="flex flex-col gap-2">
      <h2
        id="agenda-heading"
        className="text-xs font-medium tracking-wide text-zinc-500 uppercase dark:text-zinc-400"
      >
        {heading}
      </h2>
      {items.length === 0 ? (
        <p className="rounded-xl border border-dashed border-zinc-200 px-4 py-4 text-sm text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
          {canPlan ? "Nothing planned. A rest day is part of the plan too." : "Nothing logged this day."}
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((item) => (
            <li key={`${item.kind}-${item.id}`}>
              {item.kind === "completed" || item.kind === "activity" ? (
                <Link
                  href={item.href}
                  className={`${rowBase} border-zinc-200 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900`}
                >
                  <span
                    className={
                      item.kind === "completed"
                        ? "inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                        : "inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300"
                    }
                  >
                    {item.kind === "completed" ? (
                      <Dumbbell className="size-4" aria-hidden />
                    ) : (
                      <Activity className="size-4" aria-hidden />
                    )}
                  </span>
                  <RowText title={item.title} meta={item.meta} />
                  <ChevronRight className="size-4 shrink-0 text-zinc-400" aria-hidden />
                </Link>
              ) : item.kind === "planned" ? (
                <div className={`${rowBase} border-[1.5px] border-dashed border-emerald-300 pr-1 dark:border-emerald-800`}>
                  <RowText title={item.title} meta={item.meta} />
                  {item.startHref ? (
                    <Link
                      href={item.startHref}
                      className="inline-flex h-10 shrink-0 items-center rounded-lg bg-emerald-700 px-3.5 text-[13px] font-semibold text-white hover:bg-emerald-800 dark:bg-emerald-600"
                    >
                      Start
                    </Link>
                  ) : null}
                  <RemoveMenu id={item.id} title={item.title} onRemove={onRemovePlanned} />
                </div>
              ) : (
                <div className={`${rowBase} border-zinc-200 pr-1 dark:border-zinc-800`}>
                  <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-zinc-600 dark:bg-zinc-900 dark:text-zinc-300">
                    <Bell className="size-4" aria-hidden />
                  </span>
                  <RowText title={item.title} meta={item.meta} />
                  <RemoveMenu id={item.id} title={item.title} onRemove={onRemovePlanned} />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      <div className="flex gap-2">
        {canPlan ? (
          <button
            type="button"
            onClick={onPlan}
            className={`${secondaryButton} border-dashed border-zinc-300 dark:border-zinc-700`}
          >
            + Plan a workout
          </button>
        ) : null}
        <button type="button" onClick={onLogActivity} className={secondaryButton}>
          Log activity
        </button>
      </div>
    </section>
  );
}

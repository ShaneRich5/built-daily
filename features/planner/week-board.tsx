import Link from "next/link";
import { Activity, Check, ChevronLeft, ChevronRight, GripVertical, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  targetFor,
  type BoardCard,
  type BoardDay,
  type WeekBoard as WeekBoardData,
} from "@/features/planner/week-board-model";

export type WeekBoardProps = {
  board: WeekBoardData;
  tray: BoardCard[];
  todayKey: string;
  /** The card picked up with its handle, waiting for a day. */
  picked: BoardCard | null;
  onPick: (card: BoardCard | null) => void;
  onDrop: (day: BoardDay) => void;
  onDropInTray: () => void;
  onOpenCard: (card: BoardCard) => void;
  onPlanDay: (dateKey: string) => void;
  onPrev: () => void;
  onNext: () => void;
};

const iconButton =
  "inline-flex size-11 shrink-0 items-center justify-center rounded-lg text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-900";

function PlanCard({
  card,
  picked,
  onPick,
  onOpen,
}: {
  card: BoardCard;
  picked: boolean;
  onPick: () => void;
  onOpen: () => void;
}) {
  return (
    <div
      className={cn(
        "flex min-h-13 items-center gap-1.5 rounded-xl bg-white pr-1 dark:bg-zinc-950",
        picked
          ? "border-2 border-emerald-700 bg-emerald-50 dark:border-emerald-500 dark:bg-emerald-950/40"
          : card.dateKey === null || card.slid
            ? "border border-dashed border-zinc-400 dark:border-zinc-600"
            : "border border-zinc-200 dark:border-zinc-800",
      )}
    >
      <button
        type="button"
        onClick={onOpen}
        className="flex min-h-13 min-w-0 flex-1 flex-col justify-center rounded-l-xl pl-3 text-left"
      >
        <span className="block truncate text-[15px] font-medium text-zinc-900 dark:text-zinc-50">{card.title}</span>
        <span className="block truncate text-xs text-zinc-600 dark:text-zinc-400">{card.meta}</span>
      </button>
      <button
        type="button"
        aria-label={picked ? `Stop moving ${card.title}` : `Move ${card.title}`}
        aria-pressed={picked}
        onClick={onPick}
        className={cn(
          iconButton,
          "rounded-[10px]",
          picked ? "text-emerald-700 dark:text-emerald-400" : "text-zinc-600 dark:text-zinc-400",
        )}
      >
        <GripVertical className="size-[18px]" aria-hidden />
      </button>
    </div>
  );
}

function DoneRow({ item }: { item: BoardDay["done"][number] }) {
  return (
    <Link
      href={item.href}
      className="flex min-h-10 items-center gap-2 rounded-lg px-1 text-sm text-zinc-700 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-900"
    >
      <span
        className={cn(
          "inline-flex size-6 shrink-0 items-center justify-center rounded-full",
          item.kind === "workout"
            ? "bg-emerald-700 text-white dark:bg-emerald-600"
            : "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-200",
        )}
        aria-hidden
      >
        {item.kind === "workout" ? <Check className="size-3.5" /> : <Activity className="size-3.5" />}
      </span>
      <span className="min-w-0 flex-1 truncate">{item.title}</span>
      <span className="sr-only">{item.kind === "workout" ? "workout done" : "activity logged"}</span>
    </Link>
  );
}

/**
 * The week as a list of days you can rearrange: tap a card's handle, then tap
 * a day. Unscheduled holds ideas and leftovers with no day yet.
 */
export function WeekBoard({
  board,
  tray,
  todayKey,
  picked,
  onPick,
  onDrop,
  onDropInTray,
  onOpenCard,
  onPlanDay,
  onPrev,
  onNext,
}: WeekBoardProps) {
  const showTray = tray.length > 0 || (picked !== null && picked.dateKey !== null);
  return (
    <div className="flex flex-col gap-3.5">
      <div className="flex items-center justify-between">
        <button type="button" aria-label="Previous week" onClick={onPrev} className={iconButton}>
          <ChevronLeft className="size-[18px]" aria-hidden />
        </button>
        <div className="text-center">
          <p className="text-[15px] font-semibold text-zinc-900 dark:text-zinc-50">{board.title}</p>
          <p className="mt-0.5 text-xs text-zinc-600 dark:text-zinc-400">{board.subtitle}</p>
        </div>
        <button type="button" aria-label="Next week" onClick={onNext} className={iconButton}>
          <ChevronRight className="size-[18px]" aria-hidden />
        </button>
      </div>

      {showTray ? (
        <section
          aria-labelledby="tray-heading"
          className="flex flex-col gap-2 rounded-[14px] border border-zinc-200 bg-zinc-100 p-2.5 dark:border-zinc-800 dark:bg-zinc-900"
        >
          <div className="flex items-baseline justify-between px-0.5">
            <h2
              id="tray-heading"
              className="text-xs font-medium tracking-wide text-zinc-600 uppercase dark:text-zinc-400"
            >
              Unscheduled
            </h2>
            <p className="text-xs text-zinc-600 dark:text-zinc-400">No day yet</p>
          </div>
          {tray.map((card) => (
            <PlanCard
              key={card.id}
              card={card}
              picked={picked?.id === card.id}
              onPick={() => onPick(picked?.id === card.id ? null : card)}
              onOpen={() => onOpenCard(card)}
            />
          ))}
          {picked && picked.dateKey !== null ? (
            <button
              type="button"
              onClick={onDropInTray}
              className="h-11 rounded-[10px] border-[1.5px] border-dashed border-emerald-700 bg-white text-[13px] font-semibold text-emerald-700 dark:border-emerald-500 dark:bg-zinc-950 dark:text-emerald-400"
            >
              Put it here, pick a day later
            </button>
          ) : null}
        </section>
      ) : null}

      <section
        aria-label={`Week of ${board.title}`}
        className="overflow-hidden rounded-[14px] border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950"
      >
        <ol>
          {board.days.map((day) => {
            const target = picked ? targetFor(day, picked, todayKey) : null;
            const empty = day.cards.length === 0 && day.done.length === 0;
            return (
              <li
                key={day.dateKey}
                aria-current={day.isToday ? "date" : undefined}
                className={cn(
                  "flex min-h-17 items-center gap-2.5 border-b border-zinc-100 py-2 pr-2 pl-2.5 last:border-b-0 dark:border-zinc-800",
                  target ? "bg-emerald-50/50 dark:bg-emerald-950/20" : "",
                )}
              >
                <div className="flex w-10 shrink-0 flex-col items-center gap-0.5">
                  <span className="text-[11px] font-medium text-zinc-600 dark:text-zinc-400">{day.dow}</span>
                  <span
                    className={cn(
                      "inline-flex size-7.5 items-center justify-center rounded-full text-sm font-semibold",
                      day.isToday
                        ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                        : day.isPast
                          ? "text-zinc-500"
                          : "text-zinc-900 dark:text-zinc-50",
                    )}
                  >
                    {day.dayOfMonth}
                  </span>
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                  {day.done.map((item) => (
                    <DoneRow key={`${item.kind}-${item.id}`} item={item} />
                  ))}
                  {day.cards.map((card) => (
                    <PlanCard
                      key={card.id}
                      card={card}
                      picked={picked?.id === card.id}
                      onPick={() => onPick(picked?.id === card.id ? null : card)}
                      onOpen={() => onOpenCard(card)}
                    />
                  ))}
                  {empty ? (
                    <span className="text-sm text-zinc-500 dark:text-zinc-400">
                      {day.isToday ? "Today · rest" : "Rest"}
                    </span>
                  ) : null}
                </div>
                <div className="flex w-16 shrink-0 justify-end">
                  {target ? (
                    <button
                      type="button"
                      aria-label={`${target} ${picked?.title ?? ""} to ${day.label}`}
                      onClick={() => onDrop(day)}
                      className="h-11 w-16 rounded-[10px] border-[1.5px] border-dashed border-emerald-700 bg-white text-[13px] font-semibold text-emerald-700 dark:border-emerald-500 dark:bg-zinc-950 dark:text-emerald-400"
                    >
                      {target}
                    </button>
                  ) : !picked && !day.isPast ? (
                    <button
                      type="button"
                      aria-label={`Plan a workout on ${day.label}`}
                      onClick={() => onPlanDay(day.dateKey)}
                      className="inline-flex size-11 items-center justify-center rounded-[10px] border border-dashed border-zinc-300 bg-white text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-400"
                    >
                      <Plus className="size-4" aria-hidden />
                    </button>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ol>
      </section>

      {picked ? (
        <div
          role="status"
          className="fixed inset-x-3 bottom-[calc(0.75rem+var(--bottom-nav-height,0px))] z-40 mx-auto flex max-w-2xl items-center gap-2.5 rounded-[14px] bg-zinc-900 py-2 pr-2 pl-3.5 text-white shadow-xl dark:bg-zinc-100 dark:text-zinc-900"
        >
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold">Moving {picked.title}</span>
            <span className="block text-xs text-zinc-300 dark:text-zinc-600">Tap a day to drop it there</span>
          </span>
          <button
            type="button"
            onClick={() => onPick(null)}
            className="h-11 rounded-[10px] border border-zinc-600 px-3.5 text-sm font-semibold dark:border-zinc-400"
          >
            Cancel
          </button>
        </div>
      ) : null}
    </div>
  );
}

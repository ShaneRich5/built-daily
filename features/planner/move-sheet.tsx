"use client";

import Link from "next/link";
import { ArrowLeftRight, ArrowRight, Ban, Inbox, Plus, Trash2 } from "lucide-react";
import { useState, type ReactNode } from "react";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { addDaysToDateKey } from "@/lib/calendar-views";
import {
  deleteScheduledWorkout,
  moveScheduledWorkouts,
  updateScheduledWorkout,
  type ScheduledWorkoutMove,
} from "@/lib/planner-repository";
import { cn } from "@/lib/utils";
import { dateFromLocalDateKey } from "@/lib/workout-date";
import {
  pushBackPlan,
  shortDay,
  whenLabel,
  type BoardCard,
  type MovableEntry,
} from "@/features/planner/week-board-model";

type MoveSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The plan being moved; the sheet shows nothing without one. */
  card: BoardCard | null;
  todayKey: string;
  /** Open plans (upcoming and missed), for the busy dots, swaps and pushing back. */
  movable: MovableEntry[];
};

type StripDay = { dateKey: string; dow: string; day: number; busy: MovableEntry[] };

function nextSevenDays(todayKey: string, movable: MovableEntry[], cardId: string): StripDay[] {
  return Array.from({ length: 7 }, (_, i) => {
    const dateKey = addDaysToDateKey(todayKey, i);
    const d = dateFromLocalDateKey(dateKey);
    return {
      dateKey,
      dow: d ? new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(d) : "",
      day: d?.getDate() ?? 0,
      busy: movable.filter((e) => e.dateKey === dateKey && e.id !== cardId),
    };
  });
}

function OptionRow({
  icon,
  title,
  sub,
  onClick,
  disabled,
  tone = "default",
}: {
  icon: ReactNode;
  title: string;
  sub: string;
  onClick: () => void;
  disabled: boolean;
  tone?: "default" | "danger";
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="flex min-h-15 w-full items-center gap-3 rounded-lg px-2.5 py-1.5 text-left hover:bg-zinc-50 disabled:opacity-50 dark:hover:bg-zinc-900"
    >
      <span
        className={cn(
          "inline-flex size-9 shrink-0 items-center justify-center rounded-lg",
          tone === "danger"
            ? "bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300"
            : "bg-zinc-100 text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300",
        )}
        aria-hidden
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-medium text-zinc-900 dark:text-zinc-50">{title}</span>
        <span className="block text-xs text-zinc-600 dark:text-zinc-400">{sub}</span>
      </span>
    </button>
  );
}

/**
 * Move one planned workout: pick a day (a busy day offers a swap), push the
 * rest of the week back, park it in Unscheduled, skip it, or remove it.
 */
export function MoveSheet({ open, onOpenChange, card, todayKey, movable }: MoveSheetProps) {
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const close = (next: boolean) => {
    if (!next) setPendingKey(null);
    onOpenChange(next);
  };

  if (!card) {
    return (
      <BottomSheet open={open} onOpenChange={close} title="Move">
        <span />
      </BottomSheet>
    );
  }

  const run = async (write: () => Promise<boolean>) => {
    setSaving(true);
    try {
      const ok = await write();
      if (!ok) throw new Error("not saved");
      close(false);
    } catch {
      window.alert("Couldn’t update your plan. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  };
  const move = (moves: ScheduledWorkoutMove[]) => run(() => moveScheduledWorkouts(moves));

  const strip = nextSevenDays(todayKey, movable, card.id);
  const pending = strip.find((d) => d.dateKey === pendingKey) ?? null;
  // Swapping would push the other plan into the past, so a missed or unscheduled card only joins.
  const canSwap = card.dateKey !== null && card.dateKey >= todayKey;
  const pushBack = pushBackPlan(card, movable, todayKey);
  const exercises = card.exerciseIds.length;
  const sub = `${whenLabel(card, todayKey)}${exercises > 0 ? ` · ${exercises} exercise${exercises === 1 ? "" : "s"}` : ""}`;

  const pickDay = (day: StripDay) => {
    if (day.dateKey === card.dateKey) return;
    if (day.busy.length === 0) {
      void move([{ id: card.id, dateKey: day.dateKey }]);
      return;
    }
    setPendingKey(day.dateKey === pendingKey ? null : day.dateKey);
  };

  return (
    <BottomSheet
      open={open}
      onOpenChange={close}
      title={card.title}
      description={sub}
      footer={
        <button
          type="button"
          onClick={() => close(false)}
          className="h-12 w-full rounded-lg border border-zinc-200 bg-white text-[15px] font-semibold text-zinc-900 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
        >
          Cancel
        </button>
      }
    >
      <div className="flex flex-col gap-3 px-4 pb-4">
        {card.startHref ? (
          <Link
            href={card.startHref}
            className="inline-flex h-11 items-center justify-center rounded-lg bg-emerald-700 text-[15px] font-semibold text-white hover:bg-emerald-800 dark:bg-emerald-600"
          >
            Start now
          </Link>
        ) : null}

        <fieldset className="flex flex-col gap-2">
          <legend className="pb-2 text-xs font-medium tracking-wide text-zinc-600 uppercase dark:text-zinc-400">
            Move to
          </legend>
          <div className="grid grid-cols-7 gap-1">
            {strip.map((day) => {
              const current = day.dateKey === card.dateKey;
              const selected = day.dateKey === pendingKey;
              const busyNames = day.busy.map((e) => e.label).join(", ");
              return (
                <button
                  key={day.dateKey}
                  type="button"
                  disabled={saving}
                  aria-pressed={current || selected}
                  aria-label={`${day.dateKey === todayKey ? "Today, " : ""}${shortDay(day.dateKey)}${current ? ", current day" : busyNames ? `, ${busyNames} planned` : ""}`}
                  onClick={() => pickDay(day)}
                  className={cn(
                    "flex h-16 flex-col items-center justify-center gap-0.5 rounded-xl border",
                    current
                      ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                      : selected
                        ? "border-emerald-700 bg-emerald-50 text-emerald-900 dark:border-emerald-500 dark:bg-emerald-950/50 dark:text-emerald-100"
                        : "border-zinc-200 bg-white text-zinc-900 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50",
                  )}
                >
                  <span className="text-[11px] font-medium">{day.dow}</span>
                  <span className="text-[15px] font-semibold">{day.day}</span>
                  <span
                    aria-hidden
                    className={cn(
                      "size-1.5 rounded-full",
                      day.busy.length > 0 ? (current ? "bg-emerald-300" : "bg-emerald-700 dark:bg-emerald-400") : "bg-transparent",
                    )}
                  />
                </button>
              );
            })}
          </div>
          <p className="text-xs text-zinc-600 dark:text-zinc-400">
            Dot = something already planned. Picking that day offers a swap.
          </p>
        </fieldset>

        <div className="-mx-1.5 flex flex-col border-t border-zinc-100 pt-2 dark:border-zinc-800">
          {pending ? (
            <>
              {canSwap ? (
                <OptionRow
                  icon={<ArrowLeftRight className="size-[18px]" />}
                  title={`Swap with ${pending.dow} · ${pending.busy.map((e) => e.label).join(", ")}`}
                  sub={`${card.title} on ${pending.dow}, ${pending.busy.map((e) => e.label).join(", ")} on ${shortDay(card.dateKey ?? todayKey).split(",")[0]}`}
                  disabled={saving}
                  onClick={() =>
                    void move([
                      { id: card.id, dateKey: pending.dateKey },
                      ...pending.busy.map((e) => ({ id: e.id, dateKey: card.dateKey })),
                    ])
                  }
                />
              ) : null}
              <OptionRow
                icon={<Plus className="size-[18px]" />}
                title={`Add to ${pending.dow} as well`}
                sub={`Two things on ${shortDay(pending.dateKey)}`}
                disabled={saving}
                onClick={() => void move([{ id: card.id, dateKey: pending.dateKey }])}
              />
            </>
          ) : null}
          {pushBack ? (
            <OptionRow
              icon={<ArrowRight className="size-[18px]" />}
              title={
                card.dateKey !== null && card.dateKey < todayKey
                  ? "Pick up from today"
                  : "Push the rest of the week back a day"
              }
              sub={pushBack.summary}
              disabled={saving}
              onClick={() => void move(pushBack.moves)}
            />
          ) : null}
          {card.dateKey !== null ? (
            <OptionRow
              icon={<Inbox className="size-[18px]" />}
              title="Move to Unscheduled"
              sub="Keep it, pick a day later"
              disabled={saving}
              onClick={() => void move([{ id: card.id, dateKey: null }])}
            />
          ) : null}
          {card.dateKey !== null ? (
            <OptionRow
              icon={<Ban className="size-[18px]" />}
              title="Skip this one"
              sub="Marked skipped, nothing else changes"
              disabled={saving}
              onClick={() => void run(() => updateScheduledWorkout(card.id, { status: "skipped" }))}
            />
          ) : null}
          <OptionRow
            icon={<Trash2 className="size-[18px]" />}
            title="Remove from planner"
            sub="Deletes this plan"
            tone="danger"
            disabled={saving}
            onClick={() => {
              if (window.confirm(`Remove ${card.title} from your planner?`)) {
                void run(() => deleteScheduledWorkout(card.id));
              }
            }}
          />
        </div>
      </div>
    </BottomSheet>
  );
}

"use client";

import { Check, X } from "lucide-react";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { cn } from "@/lib/utils";
import type { SharedWorkout } from "@/lib/shared-workouts";
import {
  card,
  outlineButton,
  primaryGreen,
  sectionLabel,
} from "@/features/groups/group-ui";
import {
  formatPlanDay,
  sharedSetsLabel,
  sharedWorkoutMeta,
  type SharedWorkoutWeek,
} from "@/features/groups/groups-model";

/**
 * Someone's shared workouts, this week and last. Opened by tapping their name;
 * there's no feed. `weeks === null` while loading; `notSharing` when they've
 * turned it off (or it never synced).
 */
export function MemberWorkoutsSheet({
  open,
  onOpenChange,
  name,
  isMe,
  weeks,
  notSharing,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** First name, or "You". */
  name: string;
  isMe: boolean;
  weeks: SharedWorkoutWeek[] | null;
  notSharing: boolean;
}) {
  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title={isMe ? "What you share" : `${name}’s workouts`}
      description={
        isMe
          ? "This is what your group sees: this week and last."
          : "This week and last."
      }
    >
      <div className="flex flex-col gap-5 px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        {notSharing ? (
          <p className="py-4 text-sm text-zinc-500 dark:text-zinc-400">
            {isMe
              ? "Nothing shared yet. It fills in after your next workout."
              : `${name} isn’t sharing workouts right now.`}
          </p>
        ) : weeks === null ? (
          <div
            className="h-40 animate-pulse rounded-2xl bg-zinc-100 dark:bg-zinc-900"
            aria-busy="true"
            aria-label="Loading"
          />
        ) : (
          weeks.map((week) => (
            <section key={week.title} className="flex flex-col gap-2">
              <h3 className={sectionLabel}>{week.title}</h3>
              {week.workouts.length > 0 ? (
                <ul className="flex flex-col gap-2">
                  {week.workouts.map((w) => (
                    <SharedWorkoutItem key={w.id} workout={w} />
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  Nothing logged.
                </p>
              )}
            </section>
          ))
        )}
      </div>
    </BottomSheet>
  );
}

function SharedWorkoutItem({ workout: w }: { workout: SharedWorkout }) {
  const meta = sharedWorkoutMeta(w);
  return (
    <li className={cn(card, "p-3.5")}>
      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        {formatPlanDay(w.dateKey)}
      </p>
      <p className="text-[15px] font-semibold text-zinc-900 dark:text-zinc-50">
        {w.title}
      </p>
      {meta ? (
        <p className="text-[13px] text-zinc-500 dark:text-zinc-400">{meta}</p>
      ) : null}
      {w.exercises.length > 0 ? (
        <ul className="mt-2.5 flex flex-col gap-1.5 border-t border-zinc-100 pt-2.5 dark:border-zinc-800">
          {w.exercises.map((ex, i) => (
            <li key={`${ex.name}-${i}`} className="text-sm">
              <span className="font-medium text-zinc-900 dark:text-zinc-50">
                {ex.name}
              </span>
              <span className="block text-[13px] text-zinc-600 dark:text-zinc-300">
                {sharedSetsLabel(ex.sets)}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </li>
  );
}

/** Opt in or out of sharing workouts with one group. */
export function ShareWorkoutsSheet({
  open,
  onOpenChange,
  audience,
  sharing,
  busy,
  error,
  onChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Who'd see it: the group's name, or a buddy's first name. */
  audience: string;
  sharing: boolean;
  busy: boolean;
  error: string | null;
  onChange: (share: boolean) => void;
}) {
  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Workout sharing"
      description={
        sharing
          ? `You share your workouts with ${audience}.`
          : `Off. ${audience} sees the days you train and the workout name.`
      }
      footer={
        <div className="flex flex-col gap-2">
          {error ? (
            <p className="text-sm text-zinc-700 dark:text-zinc-300">{error}</p>
          ) : null}
          {sharing ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => onChange(false)}
              className={cn(outlineButton, "h-12 w-full")}
            >
              {busy ? "Stopping…" : "Stop sharing"}
            </button>
          ) : (
            <button
              type="button"
              disabled={busy}
              onClick={() => onChange(true)}
              className={cn(primaryGreen, "w-full")}
            >
              {busy ? "Sharing…" : `Share with ${audience}`}
            </button>
          )}
        </div>
      }
    >
      <div className="flex flex-col gap-3 px-4 pb-3">
        <div className="rounded-xl bg-zinc-50 p-3.5 dark:bg-zinc-900/60">
          <h3 className={sectionLabel}>
            {sharing ? "What they see" : "If you turn it on, they’ll see"}
          </h3>
          <ul className="mt-2 flex flex-col gap-1.5 text-[13px] text-zinc-700 dark:text-zinc-300">
            <li className="flex gap-2">
              <Check
                className="mt-0.5 size-4 shrink-0 text-emerald-700 dark:text-emerald-400"
                aria-hidden
              />
              Your workouts and activities from this week and last
            </li>
            <li className="flex gap-2">
              <Check
                className="mt-0.5 size-4 shrink-0 text-emerald-700 dark:text-emerald-400"
                aria-hidden
              />
              Each exercise with its sets: weight, reps, time or distance
            </li>
            <li className="flex gap-2">
              <X className="mt-0.5 size-4 shrink-0 text-zinc-400" aria-hidden />
              Never your notes or body weight
            </li>
          </ul>
        </div>
        <p className="text-[13px] text-zinc-500 dark:text-zinc-400">
          Only {audience} sees it, not your other groups. Stop any time and the
          shared copy is deleted.
        </p>
      </div>
    </BottomSheet>
  );
}

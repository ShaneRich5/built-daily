import { ChevronLeft, MoreHorizontal } from "lucide-react";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { Avatar, card, DayTile, outlineButton, primaryGreen, sectionLabel } from "@/features/groups/group-ui";

export type PlanViewProps = {
  groupName: string;
  groupHref: string;
  weekday: string;
  dayOfMonth: number;
  label: string;
  /** "6:30 AM · Iron Works Gym" */
  meta: string;
  plannedBy: string;
  note: { author: string; text: string } | null;
  going: { uid: string; name: string; detail: string }[];
  /** "Maya, Jordan and 2 others haven't said yet. No pressure either way." */
  notYet: string | null;
  exercises: { name: string; sets: number | null }[];
  isGoing: boolean;
  isToday: boolean;
  isPast: boolean;
  /** `/workout?…` from the template, or null for "something else". */
  startHref: string | null;
  /** "Thu, Nov 12" */
  dayLabel: string;
  isCreator: boolean;
  busy: boolean;
  onImIn: () => void;
  onCantMake: () => void;
  onInvite: () => void;
  onCancelPlan: () => void;
  onEditPlan: () => void;
};

/** G7: one plan together — who's going, the workout, and I'm in / Can't make it. */
export function PlanView(props: PlanViewProps) {
  const startNow = props.isGoing && props.isToday;
  return (
    <div className="flex flex-1 flex-col gap-5 pb-36">
      <div className="grid grid-cols-[1fr_auto_1fr] items-center">
        <Link
          href={props.groupHref}
          className="-ml-2 inline-flex min-h-11 items-center gap-0.5 px-2 text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
        >
          <ChevronLeft className="size-4" aria-hidden />
          Back
        </Link>
        <span className="truncate text-center text-sm font-semibold text-zinc-800 dark:text-zinc-200">{props.groupName}</span>
        <span className="flex justify-end">
          {props.isCreator ? (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <button
                    type="button"
                    aria-label="Plan options"
                    className="inline-flex size-11 items-center justify-center rounded-full text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-900"
                  />
                }
              >
                <MoreHorizontal className="size-5" aria-hidden />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" sideOffset={6} className="w-48">
                <DropdownMenuItem className="min-h-11" onClick={props.onEditPlan}>
                  Edit time, place or note
                </DropdownMenuItem>
                <DropdownMenuItem variant="destructive" className="min-h-11" onClick={props.onCancelPlan}>
                  Cancel plan
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
        </span>
      </div>

      <header className="flex items-center gap-3.5">
        <DayTile weekday={props.weekday} day={props.dayOfMonth} tone="dark" />
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">{props.label}</h1>
          <p className="truncate text-sm text-zinc-600 dark:text-zinc-300">{props.meta}</p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">Planned by {props.plannedBy}</p>
        </div>
      </header>

      {props.note ? (
        <p className="rounded-2xl rounded-tl-sm bg-zinc-100 px-3.5 py-2.5 text-sm text-zinc-800 dark:bg-zinc-900 dark:text-zinc-200">
          <span className="font-semibold">{props.note.author}:</span> {props.note.text}
        </p>
      ) : null}

      <section aria-labelledby="going-heading" className="flex flex-col gap-2">
        <h2 id="going-heading" className={sectionLabel}>
          Going · {props.going.length}
        </h2>
        <ul className={cn(card, "divide-y divide-zinc-100 dark:divide-zinc-800")}>
          {props.going.map((g) => (
            <li key={g.uid} className="flex items-center gap-3 px-3.5 py-2.5">
              <Avatar name={g.name} size="sm" />
              <span className="min-w-0">
                <span className="block text-[15px] font-medium">{g.name}</span>
                <span className="block text-xs text-zinc-500 dark:text-zinc-400">{g.detail}</span>
              </span>
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={props.onInvite}
          className="self-start py-2 text-sm font-semibold text-emerald-700 hover:underline dark:text-emerald-400"
        >
          Invite a friend to this
        </button>
        {props.notYet ? <p className="text-[13px] text-zinc-500 dark:text-zinc-400">{props.notYet}</p> : null}
      </section>

      {props.exercises.length > 0 ? (
        <section aria-labelledby="workout-heading" className="flex flex-col gap-2">
          <h2 id="workout-heading" className={sectionLabel}>
            The workout
          </h2>
          <ol className={cn(card, "divide-y divide-zinc-100 dark:divide-zinc-800")}>
            {props.exercises.map((e, i) => (
              <li key={`${e.name}-${i}`} className="flex items-center gap-3 px-3.5 py-2.5">
                <span className="w-5 text-right font-mono text-xs text-zinc-400">{i + 1}</span>
                <span className="min-w-0 flex-1 truncate text-[15px]">{e.name}</span>
                {e.sets ? <span className="text-xs text-zinc-500 dark:text-zinc-400">{e.sets} sets</span> : null}
              </li>
            ))}
          </ol>
          <p className="text-[13px] text-zinc-500 dark:text-zinc-400">
            You’ll log your own sets. Starting it on {props.weekday} copies these exercises into your workout.
          </p>
        </section>
      ) : null}

      {!props.isPast ? (
        <div className="fixed inset-x-0 bottom-[var(--bottom-nav-height,0px)] z-30 border-t border-zinc-200 bg-white/95 px-4 pt-3 pb-3 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/95">
          <div className="mx-auto flex max-w-2xl flex-col gap-1.5">
            <div className="flex gap-2">
              {props.isGoing ? (
                <button type="button" disabled={props.busy} onClick={props.onCantMake} className={cn(outlineButton, "h-12 flex-1")}>
                  Can’t make it
                </button>
              ) : null}
              {startNow && props.startHref ? (
                <Link href={props.startHref} className={cn(primaryGreen, "flex-[2]")}>
                  Start
                </Link>
              ) : props.isGoing ? null : (
                <button type="button" disabled={props.busy} onClick={props.onImIn} className={cn(primaryGreen, "flex-[2]")}>
                  {props.busy ? "Saving…" : "I’m in"}
                </button>
              )}
            </div>
            <p className="text-center text-xs text-zinc-500 dark:text-zinc-400">
              {props.isGoing
                ? `It’s on your planner for ${props.dayLabel}.`
                : `I’m in adds it to your planner for ${props.dayLabel}.`}
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}

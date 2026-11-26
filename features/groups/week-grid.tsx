import { Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, DayDot } from "@/features/groups/group-ui";
import type { MemberWeek, WeekDay } from "@/features/groups/groups-model";

const MARK_WORD = {
  trained: "trained",
  planned: "planned",
  none: "nothing yet",
} as const;

/**
 * One grid for the whole week: a row of day headers, then one row per member.
 * Today's column sits on a light grey band. `togetherDays` adds a small people
 * icon (buddy view). With `onOpenMember`, the name of anyone who shares their
 * workouts (you included, to preview) becomes a button, marked by a dotted
 * underline (no chevron: the name column is too narrow to spare the room).
 */
export function WeekGrid({
  days,
  rows,
  togetherDays,
  showCounts = true,
  onOpenMember,
}: {
  days: WeekDay[];
  rows: MemberWeek[];
  togetherDays?: Set<string>;
  showCounts?: boolean;
  onOpenMember?: (uid: string) => void;
}) {
  const cols = showCounts
    ? "grid-cols-[minmax(0,5.5rem)_repeat(7,minmax(0,1fr))_2.5rem]"
    : "grid-cols-[minmax(0,5.5rem)_repeat(7,minmax(0,1fr))]";
  return (
    <div role="table" aria-label="This week" className="text-sm">
      <div role="row" className={cn("grid items-end", cols)}>
        {/* A real grid cell (sr-only would drop out of the grid and shift the days). */}
        <span role="columnheader">
          <span className="sr-only">Member</span>
        </span>
        {days.map((d) => (
          <span
            key={d.dateKey}
            role="columnheader"
            className={cn(
              "flex flex-col items-center rounded-t-lg pt-1.5 pb-1 text-[11px] leading-tight text-zinc-500 dark:text-zinc-400",
              d.isToday &&
                "bg-zinc-100 font-bold text-zinc-900 dark:bg-zinc-900 dark:text-zinc-50",
            )}
          >
            <span aria-hidden>{d.letter}</span>
            <span className="sr-only">{d.short}</span>
            <span className="tabular-nums">{d.dayOfMonth}</span>
          </span>
        ))}
        {showCounts ? (
          <span role="columnheader">
            <span className="sr-only">Done this week</span>
          </span>
        ) : null}
      </div>
      {rows.map((row, r) => (
        <div key={row.uid} role="row" className={cn("grid items-center", cols)}>
          <span role="rowheader" className="flex min-w-0 items-center">
            {onOpenMember && row.sharesWorkouts ? (
              <button
                type="button"
                onClick={() => onOpenMember(row.uid)}
                aria-label={
                  row.isMe
                    ? "See the workouts you share"
                    : `See ${row.name}’s workouts`
                }
                className="flex min-h-11 min-w-0 items-center gap-2 rounded-lg text-left hover:bg-zinc-50 dark:hover:bg-zinc-900"
              >
                <MemberName row={row} tappable />
              </button>
            ) : (
              <span className="flex min-h-11 min-w-0 items-center gap-2">
                <MemberName row={row} />
              </span>
            )}
          </span>
          {days.map((d, i) => (
            <span
              role="cell"
              key={d.dateKey}
              className={cn(
                "relative flex h-11 items-center justify-center",
                d.isToday && "bg-zinc-100 dark:bg-zinc-900",
                d.isToday && r === rows.length - 1 && "rounded-b-lg",
              )}
            >
              <DayDot
                mark={row.marks[i]!}
                label={`${row.isMe ? "You" : row.name}, ${d.short} ${d.dayOfMonth}: ${MARK_WORD[row.marks[i]!]}`}
              />
              {togetherDays?.has(d.dateKey) && r === 0 ? (
                <Users
                  className="absolute -bottom-1 size-3 text-emerald-700 dark:text-emerald-400"
                  aria-label="Together"
                />
              ) : null}
            </span>
          ))}
          {showCounts ? (
            <span
              role="cell"
              className="text-right font-mono text-[13px] text-zinc-600 tabular-nums dark:text-zinc-300"
            >
              {row.done}/{row.goal}
            </span>
          ) : null}
        </div>
      ))}
    </div>
  );
}

export function WeekLegend() {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-500 dark:text-zinc-400">
      <span className="inline-flex items-center gap-1.5">
        <DayDot mark="trained" /> Trained
      </span>
      <span className="inline-flex items-center gap-1.5">
        <DayDot mark="planned" /> Planned
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span
          className="inline-block size-4 rounded bg-zinc-100 dark:bg-zinc-900"
          aria-hidden
        />{" "}
        Today
      </span>
    </div>
  );
}

/** `tappable`: a dotted underline hints the name opens their shared workouts. */
function MemberName({
  row,
  tappable = false,
}: {
  row: MemberWeek;
  tappable?: boolean;
}) {
  return (
    <>
      <Avatar name={row.name} size="sm" />
      <span
        className={cn(
          "truncate",
          tappable &&
            "underline decoration-zinc-400 decoration-dotted underline-offset-4",
          row.isMe
            ? "font-semibold text-zinc-900 dark:text-zinc-50"
            : "text-zinc-700 dark:text-zinc-300",
        )}
      >
        {row.isMe ? "You" : row.name}
      </span>
    </>
  );
}

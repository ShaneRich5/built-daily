import { ChevronLeft, Heart, MoreHorizontal, UserPlus } from "lucide-react";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import {
  Avatar,
  card,
  DayTile,
  outlineButton,
  primaryDark,
  PrivacyNote,
  SectionHeader,
} from "@/features/groups/group-ui";
import type { MemberWeek, PlanRow, WeekDay } from "@/features/groups/groups-model";
import { PlanRowItem } from "@/features/groups/groups-view";
import { WeekGrid, WeekLegend } from "@/features/groups/week-grid";

export type TrainedTodayCard = {
  /** "Maya and Priya" */
  names: string;
  /** "Maya: Push day · Priya: Run" */
  detail: string;
  cheered: boolean;
};

export type BuddyDetails = {
  otherName: string;
  /** "Oct 3" */
  since: string;
  bothOnTrack: boolean;
  weeksBothHitGoal: number | null;
  togetherDays: Set<string>;
  next: PlanRow | null;
  /** "Sat planned" per row, by uid. */
  nextPlanned: Record<string, string | null>;
};

export type GroupViewProps = {
  title: string;
  /** "6 members · Nov 8 – 14" */
  subtitle: string;
  days: WeekDay[];
  rows: MemberWeek[];
  trainedToday: TrainedTodayCard | null;
  planRows: PlanRow[];
  busyPlanId: string | null;
  cheerBusy: boolean;
  isOwner: boolean;
  /** Present for a gym buddy (a group of two). */
  buddy: BuddyDetails | null;
  onInvite: () => void;
  onPlan: () => void;
  onImIn: (row: PlanRow) => void;
  onCheer: () => void;
  onLeave: () => void;
  onDelete: () => void;
  onConvertToGroup: () => void;
};

function GroupMenu({ isOwner, onLeave, onDelete, label }: { isOwner: boolean; onLeave: () => void; onDelete: () => void; label: string }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            aria-label={`${label} options`}
            className="inline-flex size-11 items-center justify-center rounded-full text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-900"
          />
        }
      >
        <MoreHorizontal className="size-5" aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={6} className="w-52">
        <DropdownMenuItem className="min-h-11" onClick={onLeave}>
          Leave
        </DropdownMenuItem>
        {isOwner ? (
          <DropdownMenuItem variant="destructive" className="min-h-11" onClick={onDelete}>
            Delete for everyone
          </DropdownMenuItem>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function BackLink() {
  return (
    <Link
      href="/groups"
      className="-ml-2 inline-flex min-h-11 items-center gap-0.5 px-2 text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
    >
      <ChevronLeft className="size-4" aria-hidden />
      Groups
    </Link>
  );
}

/** G2 (group) / G8 (buddy): the shared week, who trained today, plans together. */
export function GroupView(props: GroupViewProps) {
  if (props.buddy) return <BuddyView {...props} buddy={props.buddy} />;
  return (
    <div className="flex flex-1 flex-col gap-5">
      <div className="flex items-center justify-between">
        <BackLink />
        <GroupMenu isOwner={props.isOwner} onLeave={props.onLeave} onDelete={props.onDelete} label={props.title} />
      </div>
      <header className="-mt-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">{props.title}</h1>
          <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">{props.subtitle}</p>
        </div>
        <button type="button" onClick={props.onInvite} className={outlineButton}>
          <UserPlus className="size-4" aria-hidden />
          Invite
        </button>
      </header>

      <section aria-labelledby="week-heading" className={cn(card, "flex flex-col gap-3 p-3.5")}>
        <h2 id="week-heading" className="text-[15px] font-semibold">
          This week
        </h2>
        <WeekGrid days={props.days} rows={props.rows} />
        <WeekLegend />
      </section>

      {props.trainedToday ? <TrainedToday card={props.trainedToday} busy={props.cheerBusy} onCheer={props.onCheer} /> : null}

      <section aria-labelledby="plans-heading" className="flex flex-col gap-2">
        <SectionHeader id="plans-heading" title="Plans together" aside="Join any, no pressure" />
        {props.planRows.length > 0 ? (
          <ul className={cn(card, "divide-y divide-zinc-100 dark:divide-zinc-800")}>
            {props.planRows.map((row) => (
              <PlanRowItem key={row.id} row={row} busy={props.busyPlanId === row.id} onImIn={props.onImIn} />
            ))}
          </ul>
        ) : (
          <p className={cn(card, "px-4 py-4 text-sm text-zinc-500 dark:text-zinc-400")}>
            No plans this week yet. Pick a day and the group can join you.
          </p>
        )}
        <button type="button" onClick={props.onPlan} className={cn(primaryDark, "mt-1 w-full")}>
          Plan a workout with the group
        </button>
      </section>

      <PrivacyNote />
    </div>
  );
}

function TrainedToday({ card: c, busy, onCheer }: { card: TrainedTodayCard; busy: boolean; onCheer: () => void }) {
  return (
    <section className={cn(card, "flex items-center gap-3 p-3.5")}>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-semibold text-zinc-900 dark:text-zinc-50">{c.names} trained today</span>
        <span className="block truncate text-[13px] text-zinc-500 dark:text-zinc-400">{c.detail}</span>
      </span>
      <button
        type="button"
        disabled={busy || c.cheered}
        onClick={onCheer}
        className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-lg bg-emerald-50 px-3.5 text-sm font-semibold text-emerald-800 hover:bg-emerald-100 disabled:opacity-70 dark:bg-emerald-950/40 dark:text-emerald-300"
      >
        <Heart className={cn("size-4", c.cheered && "fill-current")} aria-hidden />
        {c.cheered ? "Cheered" : "Cheer"}
      </button>
    </section>
  );
}

function BuddyView(props: GroupViewProps & { buddy: BuddyDetails }) {
  const { buddy } = props;
  const alone = props.rows.length < 2;
  return (
    <div className="flex flex-1 flex-col gap-5">
      <div className="flex items-center justify-between">
        <BackLink />
        <GroupMenu isOwner={props.isOwner} onLeave={props.onLeave} onDelete={props.onDelete} label={props.title} />
      </div>
      <header className="-mt-3 flex items-center gap-3">
        <span className="flex -space-x-3" aria-hidden>
          <Avatar name="You" size="lg" className="border-2 border-white dark:border-zinc-950" />
          <Avatar name={buddy.otherName} size="lg" className="border-2 border-white dark:border-zinc-950" />
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">{props.title}</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {alone ? "Waiting for them to join" : `Gym buddies since ${buddy.since}`}
          </p>
        </div>
      </header>

      {alone ? (
        <section className={cn(card, "flex flex-col gap-3 p-4")}>
          <p className="text-sm text-zinc-600 dark:text-zinc-300">
            Send {buddy.otherName === "your buddy" ? "your buddy" : buddy.otherName} the link. Once they join you’ll see each other’s week here.
          </p>
          <button type="button" onClick={props.onInvite} className={primaryDark}>
            <UserPlus className="size-4" aria-hidden />
            Send invite link
          </button>
        </section>
      ) : null}

      <section aria-labelledby="buddy-week-heading" className={cn(card, "flex flex-col gap-3 p-3.5")}>
        <div className="flex items-center justify-between">
          <h2 id="buddy-week-heading" className="text-[15px] font-semibold">
            This week
          </h2>
          {buddy.bothOnTrack ? (
            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
              Both on track
            </span>
          ) : null}
        </div>
        <WeekGrid days={props.days} rows={props.rows} togetherDays={buddy.togetherDays} showCounts={false} />
        <div className="flex flex-col gap-1 border-t border-zinc-100 pt-2 text-[13px] dark:border-zinc-800">
          {props.rows.map((r) => (
            <p key={r.uid} className="flex items-baseline gap-2 text-zinc-600 dark:text-zinc-300">
              <span className="font-mono font-semibold text-zinc-900 tabular-nums dark:text-zinc-50">
                {r.done} / {r.goal}
              </span>
              <span>
                {r.isMe ? "You" : r.name}
                {buddy.nextPlanned[r.uid] ? ` · ${buddy.nextPlanned[r.uid]}` : ""}
              </span>
            </p>
          ))}
        </div>
      </section>

      {buddy.weeksBothHitGoal ? (
        <div className={cn(card, "p-3.5")}>
          <p className="font-mono text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
            {buddy.weeksBothHitGoal} wk
          </p>
          <p className="text-[13px] text-zinc-500 dark:text-zinc-400">Both hit your goals</p>
        </div>
      ) : null}

      {props.trainedToday ? <TrainedToday card={props.trainedToday} busy={props.cheerBusy} onCheer={props.onCheer} /> : null}

      <section aria-labelledby="next-together-heading" className="flex flex-col gap-2">
        <SectionHeader id="next-together-heading" title="Next together" />
        {buddy.next ? (
          <Link
            href={buddy.next.href}
            className="flex items-center gap-3 rounded-2xl border-[1.5px] border-emerald-700 bg-white p-3.5 dark:border-emerald-500 dark:bg-zinc-950"
          >
            <DayTile weekday={buddy.next.weekday} day={buddy.next.dayOfMonth} tone="green" />
            <span className="min-w-0">
              <span className="block truncate text-[15px] font-semibold">{buddy.next.title}</span>
              <span className="block truncate text-xs text-zinc-500 dark:text-zinc-400">{buddy.next.meta}</span>
            </span>
          </Link>
        ) : (
          <p className={cn(card, "px-4 py-3.5 text-sm text-zinc-500 dark:text-zinc-400")}>Nothing planned together yet.</p>
        )}
        <div className="flex gap-2">
          <button type="button" onClick={props.onPlan} className={cn(primaryDark, "flex-1")}>
            Plan a session
          </button>
          {!alone ? (
            <button
              type="button"
              disabled={props.cheerBusy || props.trainedToday?.cheered}
              onClick={props.onCheer}
              className={cn(outlineButton, "h-12 flex-1")}
            >
              <Heart className="size-4" aria-hidden />
              Cheer {buddy.otherName}
            </button>
          ) : null}
        </div>
      </section>

      <p className="text-center text-xs text-zinc-500 dark:text-zinc-400">
        A buddy is a group of two. Want more people?{" "}
        {props.isOwner ? (
          <button type="button" onClick={props.onConvertToGroup} className="font-medium text-zinc-800 underline underline-offset-2 dark:text-zinc-200">
            Turn this into a group
          </button>
        ) : (
          "Ask whoever started it to turn it into a group."
        )}
      </p>
      <PrivacyNote />
    </div>
  );
}

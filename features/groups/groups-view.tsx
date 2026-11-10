import { ChevronRight, Heart, Plus, Share2 } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  Avatar,
  card,
  DayTile,
  GoingPill,
  ImInButton,
  outlineButton,
  SectionHeader,
  StackedAvatars,
} from "@/features/groups/group-ui";
import type { PlanRow } from "@/features/groups/groups-model";
import { spacedCode } from "@/features/groups/share";

export type FeaturedGroup = {
  id: string;
  name: string;
  href: string;
  /** "6 members · 4 on track this week" */
  summary: string;
  members: { uid: string; name: string; progress: string; trainedToday: boolean; isMe: boolean }[];
  /** Others who trained today and haven't had your cheer yet. */
  cheerNames: string[];
  /** You already cheered everyone who trained today. */
  cheeredAll: boolean;
  code: string;
};

export type CompactGroup = {
  id: string;
  name: string;
  href: string;
  /** "4 members · 2 on track · Dev trained today" */
  summary: string;
  avatarNames: string[];
};

export type GroupsViewProps = {
  loaded: boolean;
  comingUp: PlanRow[];
  featured: FeaturedGroup | null;
  others: CompactGroup[];
  busyPlanId: string | null;
  cheerBusy: boolean;
  onJoin: () => void;
  onNew: () => void;
  onImIn: (row: PlanRow) => void;
  onCheer: () => void;
  onShare: (groupId: string) => void;
};

function joinFirstNames(names: string[]): string {
  if (names.length <= 1) return names[0] ?? "";
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, 2).join(", ")} and ${names.length - 2} more`;
}

export function GroupsHeader({ onJoin, onNew }: { onJoin: () => void; onNew: () => void }) {
  return (
    <header className="flex items-center justify-between gap-3">
      <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Groups</h1>
      <div className="flex gap-2">
        <button type="button" onClick={onJoin} className={outlineButton}>
          Join
        </button>
        <button
          type="button"
          onClick={onNew}
          className="inline-flex h-11 items-center gap-1 rounded-lg bg-zinc-900 px-3.5 text-sm font-semibold text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          <Plus className="size-4" aria-hidden />
          New
        </button>
      </div>
    </header>
  );
}

export function PlanRowItem({
  row,
  busy,
  onImIn,
}: {
  row: PlanRow;
  busy: boolean;
  onImIn: (row: PlanRow) => void;
}) {
  return (
    <li className="flex items-center gap-3 px-3.5 py-3">
      <Link href={row.href} className="flex min-w-0 flex-1 items-center gap-3">
        <DayTile weekday={row.weekday} day={row.dayOfMonth} />
        <span className="min-w-0">
          <span className="block truncate text-[15px] font-medium text-zinc-900 dark:text-zinc-50">{row.title}</span>
          <span className="block truncate text-xs text-zinc-500 dark:text-zinc-400">{row.meta}</span>
        </span>
      </Link>
      {row.going ? <GoingPill /> : <ImInButton label={row.joinLabel} busy={busy} onClick={() => onImIn(row)} />}
    </li>
  );
}

/** G1: the shared week across your groups, then the groups themselves. */
export function GroupsView(props: GroupsViewProps) {
  const { featured } = props;
  return (
    <div className="flex flex-1 flex-col gap-6">
      <GroupsHeader onJoin={props.onJoin} onNew={props.onNew} />

      {!props.loaded ? (
        <div className="flex flex-col gap-4" aria-busy="true" aria-label="Loading">
          <div className="h-40 animate-pulse rounded-2xl bg-zinc-100 dark:bg-zinc-900" />
          <div className="h-56 animate-pulse rounded-2xl bg-zinc-100 dark:bg-zinc-900" />
        </div>
      ) : !featured ? (
        <EmptyGroups onNew={props.onNew} onJoin={props.onJoin} />
      ) : (
        <>
          <section aria-labelledby="coming-up-heading" className="flex flex-col gap-2">
            <SectionHeader id="coming-up-heading" title="Coming up together" aside="Next 7 days" />
            {props.comingUp.length > 0 ? (
              <ul className={cn(card, "divide-y divide-zinc-100 dark:divide-zinc-800")}>
                {props.comingUp.map((row) => (
                  <PlanRowItem key={`${row.groupId}-${row.id}`} row={row} busy={props.busyPlanId === row.id} onImIn={props.onImIn} />
                ))}
              </ul>
            ) : (
              <p className={cn(card, "px-4 py-4 text-sm text-zinc-500 dark:text-zinc-400")}>
                Nothing planned together yet. Open a group and plan a workout, anyone can say I’m in.
              </p>
            )}
          </section>

          <section aria-labelledby="your-groups-heading" className="flex flex-col gap-2">
            <SectionHeader id="your-groups-heading" title="Your groups" />
            <Link href={featured.href} className={cn(card, "block p-4 hover:bg-zinc-50 dark:hover:bg-zinc-900/60")}>
              <span className="flex items-center justify-between gap-2">
                <span className="text-[17px] font-semibold text-zinc-900 dark:text-zinc-50">{featured.name}</span>
                <ChevronRight className="size-4 text-zinc-400" aria-hidden />
              </span>
              <span className="mt-0.5 block text-[13px] text-zinc-500 dark:text-zinc-400">{featured.summary}</span>
              <span className="mt-3 flex gap-3 overflow-x-auto pb-1">
                {featured.members.map((m) => (
                  <span key={m.uid} className="flex w-12 shrink-0 flex-col items-center gap-1">
                    <Avatar name={m.name} ring={m.trainedToday} />
                    <span className={cn("w-full truncate text-center text-xs", m.isMe ? "font-semibold" : "text-zinc-600 dark:text-zinc-300")}>
                      {m.isMe ? "You" : m.name}
                    </span>
                    <span className="font-mono text-[11px] text-zinc-500 tabular-nums dark:text-zinc-400">{m.progress}</span>
                  </span>
                ))}
              </span>
              <span className="mt-2 flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                <span className="inline-block size-3 rounded-full ring-2 ring-emerald-600 dark:ring-emerald-500" aria-hidden />
                Trained today
              </span>
            </Link>
            {featured.cheerNames.length > 0 || featured.cheeredAll ? (
              <button
                type="button"
                disabled={props.cheerBusy || featured.cheeredAll}
                onClick={props.onCheer}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-emerald-50 text-sm font-semibold text-emerald-800 hover:bg-emerald-100 disabled:opacity-70 dark:bg-emerald-950/40 dark:text-emerald-300"
              >
                <Heart className={cn("size-4", featured.cheeredAll && "fill-current")} aria-hidden />
                {featured.cheeredAll ? "Cheered" : `Cheer ${joinFirstNames(featured.cheerNames)}`}
              </button>
            ) : null}

            {props.others.length > 0 ? (
              <ul className={cn(card, "divide-y divide-zinc-100 dark:divide-zinc-800")}>
                {props.others.map((g) => (
                  <li key={g.id}>
                    <Link href={g.href} className="flex min-h-16 items-center gap-3 px-3.5 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-900/60">
                      <StackedAvatars names={g.avatarNames} max={3} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[15px] font-medium text-zinc-900 dark:text-zinc-50">{g.name}</span>
                        <span className="block truncate text-xs text-zinc-500 dark:text-zinc-400">{g.summary}</span>
                      </span>
                      <ChevronRight className="size-4 shrink-0 text-zinc-400" aria-hidden />
                    </Link>
                  </li>
                ))}
              </ul>
            ) : null}
          </section>

          <section className="flex items-center gap-3 rounded-2xl border border-dashed border-zinc-300 p-4 dark:border-zinc-700">
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-semibold text-zinc-900 dark:text-zinc-50">Bring someone along</span>
              <span className="block text-[13px] text-zinc-500 dark:text-zinc-400">
                {featured.name} code{" "}
                <span className="font-mono font-semibold tracking-wider text-zinc-800 dark:text-zinc-100">{spacedCode(featured.code)}</span>
              </span>
            </span>
            <button type="button" onClick={() => props.onShare(featured.id)} className={outlineButton}>
              <Share2 className="size-4" aria-hidden />
              Share
            </button>
          </section>
        </>
      )}
    </div>
  );
}

function EmptyGroups({ onNew, onJoin }: { onNew: () => void; onJoin: () => void }) {
  return (
    <section className={cn(card, "flex flex-col gap-3 p-5")}>
      <h2 className="text-[17px] font-semibold">Train with someone</h2>
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        A gym buddy or a small group sees the days you train and plan, and can join your workouts with one tap. No feed, no leaderboard.
      </p>
      <button
        type="button"
        onClick={onNew}
        className="inline-flex h-12 items-center justify-center rounded-xl bg-emerald-700 text-base font-semibold text-white hover:bg-emerald-800 dark:bg-emerald-600"
      >
        Start a buddy or group
      </button>
      <button type="button" onClick={onJoin} className={cn(outlineButton, "h-12")}>
        I have a code
      </button>
    </section>
  );
}

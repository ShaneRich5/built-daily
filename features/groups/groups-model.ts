/**
 * Groups Together, pure: who trained, who plans to, and how plans read.
 * No React, no Firebase — the screens feed it plain docs, stories feed it mocks.
 *
 * Calm by design: a past day with no workout is just empty. There is no
 * "missed" state anywhere in here.
 */
import { addDaysToDateKey, startOfWeekDateKey } from "@/lib/calendar-views";
import { effectiveGroupMemberStreak, firstName } from "@/lib/group-mapper";
import type {
  AccountabilityGroupDoc,
  GroupMemberDoc,
  SharedPlanDoc,
} from "@/lib/group-types";
import { dateFromLocalDateKey } from "@/lib/workout-date";

export type GroupMemberRow = { id: string; member: GroupMemberDoc };
export type GroupPlanRow = { id: string; plan: SharedPlanDoc };

export type WeekDay = {
  dateKey: string;
  /** "S", "M", … */
  letter: string;
  /** "Thu" */
  short: string;
  dayOfMonth: number;
  isToday: boolean;
};

export type DayMark = "trained" | "planned" | "none";

export type MemberWeek = {
  uid: string;
  name: string;
  isMe: boolean;
  marks: DayMark[];
  done: number;
  goal: number;
  onTrack: boolean;
  trainedToday: boolean;
};

const LETTERS = ["S", "M", "T", "W", "T", "F", "S"];

function weekdayShort(dateKey: string): string {
  const d = dateFromLocalDateKey(dateKey);
  return d ? new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(d) : "";
}

function weekdayLong(dateKey: string): string {
  const d = dateFromLocalDateKey(dateKey);
  return d ? new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(d) : "";
}

function dayOfMonth(dateKey: string): number {
  return Number(dateKey.slice(8, 10));
}

/** Sun–Sat of the week holding `todayKey`. */
export function buildWeekDays(todayKey: string): WeekDay[] {
  const start = startOfWeekDateKey(todayKey);
  return LETTERS.map((letter, i) => {
    const dateKey = addDaysToDateKey(start, i);
    return {
      dateKey,
      letter,
      short: weekdayShort(dateKey),
      dayOfMonth: dayOfMonth(dateKey),
      isToday: dateKey === todayKey,
    };
  });
}

/** Today plus the next six days, for "Coming up together" and the day picker. */
export function nextSevenDays(todayKey: string): WeekDay[] {
  return Array.from({ length: 7 }, (_, i) => {
    const dateKey = addDaysToDateKey(todayKey, i);
    return {
      dateKey,
      letter: LETTERS[dateFromLocalDateKey(dateKey)?.getDay() ?? 0]!,
      short: weekdayShort(dateKey),
      dayOfMonth: dayOfMonth(dateKey),
      isToday: i === 0,
    };
  });
}

/** "Nov 8 – 14" (or "Oct 31 – Nov 6" across months). */
export function weekRangeLabel(todayKey: string): string {
  const start = dateFromLocalDateKey(startOfWeekDateKey(todayKey));
  const end = dateFromLocalDateKey(addDaysToDateKey(startOfWeekDateKey(todayKey), 6));
  if (!start || !end) return "";
  const month = (d: Date) => new Intl.DateTimeFormat("en-US", { month: "short" }).format(d);
  return start.getMonth() === end.getMonth()
    ? `${month(start)} ${start.getDate()} – ${end.getDate()}`
    : `${month(start)} ${start.getDate()} – ${month(end)} ${end.getDate()}`;
}

/** Days the member trained. Older rows only know their last workout day. */
function trainedDaySet(member: GroupMemberDoc): Set<string> {
  const days = new Set(member.trainedDays);
  if (member.lastWorkoutDateKey) days.add(member.lastWorkoutDateKey);
  return days;
}

export function memberTrainedOn(member: GroupMemberDoc, dateKey: string): boolean {
  return trainedDaySet(member).has(dateKey);
}

export function memberPlansOn(member: GroupMemberDoc, dateKey: string): boolean {
  return member.upcomingPlans.some((p) => p.dateKey === dateKey);
}

/** Workouts done this week. Rows without `trainedDays` fall back to the stored count. */
export function doneThisWeek(member: GroupMemberDoc, todayKey: string): number {
  const weekStart = startOfWeekDateKey(todayKey);
  const inWeek = [...trainedDaySet(member)].filter((d) => d >= weekStart && d <= todayKey).length;
  const lastInWeek = member.lastWorkoutDateKey !== null && member.lastWorkoutDateKey >= weekStart;
  return lastInWeek ? Math.max(inWeek, member.workoutsThisWeek) : inWeek;
}

/** On track = goal already hit, or the days still planned this week would get there. */
export function buildMemberWeek(
  member: GroupMemberDoc,
  todayKey: string,
  myUid: string | null,
): MemberWeek {
  const days = buildWeekDays(todayKey);
  const trained = trainedDaySet(member);
  const marks: DayMark[] = days.map(({ dateKey }) => {
    if (trained.has(dateKey)) return "trained";
    if (dateKey >= todayKey && memberPlansOn(member, dateKey)) return "planned";
    return "none";
  });
  const done = doneThisWeek(member, todayKey);
  const plannedLeft = marks.filter((m, i) => m === "planned" && days[i]!.dateKey >= todayKey).length;
  return {
    uid: member.uid,
    name: firstName(member.displayName),
    isMe: member.uid === myUid,
    marks,
    done,
    goal: member.weeklyGoal,
    onTrack: done >= member.weeklyGoal || done + plannedLeft >= member.weeklyGoal,
    trainedToday: trained.has(todayKey),
  };
}

/** Me first, then everyone else in join order. */
export function buildGroupWeek(
  members: GroupMemberRow[],
  todayKey: string,
  myUid: string | null,
): MemberWeek[] {
  const rows = members.map(({ member }) => buildMemberWeek(member, todayKey, myUid));
  return [...rows.filter((r) => r.isMe), ...rows.filter((r) => !r.isMe)];
}

/** "Maya", "Maya and Priya", "Maya, Priya and Jordan", "Maya, Jordan and 2 others". */
export function joinNames(names: string[], maxShown = 3): string {
  if (names.length === 0) return "";
  if (names.length === 1) return names[0]!;
  if (names.length <= maxShown) {
    return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
  }
  const shown = names.slice(0, maxShown - 1);
  const rest = names.length - shown.length;
  return `${shown.join(", ")} and ${rest} other${rest === 1 ? "" : "s"}`;
}

export function pluralMembers(n: number): string {
  return `${n} member${n === 1 ? "" : "s"}`;
}

/** "6 members · 4 on track this week" */
export function groupSummary(week: MemberWeek[]): string {
  const onTrack = week.filter((m) => m.onTrack).length;
  return `${pluralMembers(week.length)} · ${onTrack} on track this week`;
}

/** "4 members · 2 on track · Dev trained today" */
export function groupCompactSummary(week: MemberWeek[]): string {
  const onTrack = week.filter((m) => m.onTrack).length;
  const today = week.filter((m) => m.trainedToday && !m.isMe).map((m) => m.name);
  const parts = [pluralMembers(week.length), `${onTrack} on track`];
  if (today.length > 0) parts.push(`${joinNames(today, 2)} trained today`);
  return parts.join(" · ");
}

/** Other members who trained today, for the cheer card. */
export function trainedTodayOthers(week: MemberWeek[]): MemberWeek[] {
  return week.filter((m) => m.trainedToday && !m.isMe);
}

/** "Maya: Push day · Priya: Run" — workout names only. */
export function trainedTodayDetail(
  members: GroupMemberRow[],
  others: MemberWeek[],
  todayKey: string,
): string {
  const byUid = new Map(members.map(({ member }) => [member.uid, member]));
  return others
    .map((o) => {
      const m = byUid.get(o.uid);
      const label = m?.lastWorkoutDateKey === todayKey ? m.lastWorkoutLabel : null;
      return label ? `${o.name}: ${label}` : o.name;
    })
    .join(" · ");
}

/** "6:30 AM" from "06:30"; null for anytime. */
export function formatPlanTime(time: string | null): string | null {
  if (!time) return null;
  const [h, m] = time.split(":").map(Number);
  if (h === undefined || m === undefined || Number.isNaN(h) || Number.isNaN(m)) return null;
  const period = h < 12 ? "AM" : "PM";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m).padStart(2, "0")} ${period}`;
}

/** "Thu, Nov 12" */
export function formatPlanDay(dateKey: string): string {
  const d = dateFromLocalDateKey(dateKey);
  return d
    ? new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric" }).format(d)
    : dateKey;
}

export type PlanRow = {
  id: string;
  groupId: string;
  dateKey: string;
  /** "Thu" */
  weekday: string;
  dayOfMonth: number;
  /** "Leg day · Priya" / "Pull day · Maya, Jordan, you" */
  title: string;
  /** "Morning Crew · 6:30 AM" (or "6:30 AM · Priya and you so far" on the group page) */
  meta: string;
  going: boolean;
  /** "Join Priya for Leg day Thursday" */
  joinLabel: string;
  href: string;
};

function goingNames(plan: SharedPlanDoc, names: Map<string, string>, myUid: string | null): string[] {
  const others = plan.going.filter((uid) => uid !== myUid).map((uid) => names.get(uid) ?? "Someone");
  return plan.going.includes(myUid ?? "") ? [...others, "you"] : others;
}

function nameMap(members: GroupMemberRow[]): Map<string, string> {
  return new Map(members.map(({ member }) => [member.uid, firstName(member.displayName)]));
}

export function sharedPlanHref(groupId: string, planId: string): string {
  return `/groups/${groupId}/plans/${planId}`;
}

/** A row in "Coming up together" (Groups tab): meta is group · time. */
export function buildComingUpRow(
  row: GroupPlanRow,
  groupName: string,
  members: GroupMemberRow[],
  myUid: string | null,
): PlanRow {
  const { id, plan } = row;
  const names = nameMap(members);
  const who = goingNames(plan, names, myUid);
  const time = formatPlanTime(plan.time);
  const othersGoing = who.filter((n) => n !== "you");
  return {
    id,
    groupId: plan.groupId,
    dateKey: plan.dateKey,
    weekday: weekdayShort(plan.dateKey),
    dayOfMonth: dayOfMonth(plan.dateKey),
    title: who.length > 0 ? `${plan.label} · ${who.join(", ")}` : plan.label,
    meta: [groupName, time].filter(Boolean).join(" · "),
    going: myUid !== null && plan.going.includes(myUid),
    joinLabel: `Join ${othersGoing.length > 0 ? joinNames(othersGoing, 2) : "the group"} for ${plan.label} ${weekdayLong(plan.dateKey)}`,
    href: sharedPlanHref(plan.groupId, id),
  };
}

/** A row in "Plans together" (group page): "Thu · Leg day with Priya", "6:30 AM · Priya and you so far". */
export function buildGroupPlanRow(
  row: GroupPlanRow,
  members: GroupMemberRow[],
  myUid: string | null,
): PlanRow {
  const { id, plan } = row;
  const names = nameMap(members);
  const who = goingNames(plan, names, myUid);
  const others = who.filter((n) => n !== "you");
  const time = formatPlanTime(plan.time) ?? "Anytime";
  const sofar = who.length > 0 ? `${joinNames(who)} so far` : "No one yet";
  return {
    id,
    groupId: plan.groupId,
    dateKey: plan.dateKey,
    weekday: weekdayShort(plan.dateKey),
    dayOfMonth: dayOfMonth(plan.dateKey),
    title: `${weekdayShort(plan.dateKey)} · ${plan.label}${others.length > 0 ? ` with ${joinNames(others, 2)}` : ""}`,
    meta: `${time} · ${sofar}`,
    going: myUid !== null && plan.going.includes(myUid),
    joinLabel: `Join ${others.length > 0 ? joinNames(others, 2) : "the group"} for ${plan.label} ${weekdayLong(plan.dateKey)}`,
    href: sharedPlanHref(plan.groupId, id),
  };
}

/** For the day picker: how many other members already train or plan each day. */
export function crewCountsByDay(
  members: GroupMemberRow[],
  days: WeekDay[],
  myUid: string | null,
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const { dateKey } of days) {
    out[dateKey] = members.filter(
      ({ member }) =>
        member.uid !== myUid && (memberTrainedOn(member, dateKey) || memberPlansOn(member, dateKey)),
    ).length;
  }
  return out;
}

/** "Morning Crew" — or, for a buddy, "You & Alex" (their name once they join). */
export function groupDisplayName(
  group: Pick<AccountabilityGroupDoc, "name" | "kind">,
  members: GroupMemberRow[],
  myUid: string | null,
  buddyNickname: string | null,
): string {
  if (group.kind !== "buddy") return group.name;
  const other = members.find(({ member }) => member.uid !== myUid);
  const name = other ? firstName(other.member.displayName) : buddyNickname?.trim();
  return name ? `You & ${name}` : "You & your buddy";
}

/** "Oct 3": when the second person joined (or when it was made, if alone). */
export function buddiesSinceLabel(group: AccountabilityGroupDoc, members: GroupMemberRow[]): string {
  const latest = members.reduce(
    (max, { member }) => (member.joinedAt > max ? member.joinedAt : max),
    group.createdAt,
  );
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(latest);
}

export type BuddySummary = {
  bothOnTrack: boolean;
  /**
   * Consecutive weeks both hit their own goal: the shorter of the two stored
   * goal-week streaks (each already counts weeks the member met their goal).
   * Null when it's zero or there's no buddy yet.
   */
  weeksBothHitGoal: number | null;
  /** Days this week you both trained or planned. */
  togetherDays: Set<string>;
};

export function buildBuddySummary(
  members: GroupMemberRow[],
  week: MemberWeek[],
  todayKey: string,
): BuddySummary {
  const days = buildWeekDays(todayKey);
  const togetherDays = new Set<string>();
  if (week.length === 2) {
    days.forEach((d, i) => {
      if (week[0]!.marks[i] !== "none" && week[1]!.marks[i] !== "none") togetherDays.add(d.dateKey);
    });
  }
  const streaks = members.map(({ member }) => effectiveGroupMemberStreak(member, todayKey));
  const weeks = members.length === 2 ? Math.min(...streaks) : 0;
  return {
    bothOnTrack: week.length === 2 && week.every((m) => m.onTrack),
    weeksBothHitGoal: weeks > 0 ? weeks : null,
    togetherDays,
  };
}

/** "Sat planned" — the next day still planned this week, for the buddy footer. */
export function nextPlannedLabel(row: MemberWeek, todayKey: string): string | null {
  const days = buildWeekDays(todayKey);
  const i = row.marks.findIndex((m, idx) => m === "planned" && days[idx]!.dateKey >= todayKey);
  return i >= 0 ? `${days[i]!.short} planned` : null;
}

/** Template → plan exercises (names + set counts only). */
export function exercisesFromTemplate(
  lines: { exerciseId: string; nameSnapshot: string; targetSets?: number | null }[],
): { id: string; name: string; sets: number | null }[] {
  return lines.slice(0, 20).map((l) => ({
    id: l.exerciseId,
    name: l.nameSnapshot,
    sets: l.targetSets && l.targetSets > 0 ? l.targetSets : null,
  }));
}

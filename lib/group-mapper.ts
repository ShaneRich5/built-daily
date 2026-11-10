import { Timestamp } from "firebase/firestore";
import {
  GROUP_LIMITS,
  type AccountabilityGroupDoc,
  type CheerDoc,
  type GroupMemberDoc,
  type GroupKind,
  type GroupMemberRole,
  type GroupMembershipIndexDoc,
  type InviteCodeDoc,
  type InvitePreviewDoc,
  type InvitePreviewPlan,
  type MemberUpcomingPlan,
  type SharedPlanDoc,
  type SharedPlanExercise,
  SHARED_PLAN_LIMITS,
} from "@/lib/group-types";
import {
  DEFAULT_PROGRESS_SETTINGS,
  WEEKLY_GOAL_OPTIONS,
  type WeeklyGoalTarget,
} from "@/lib/progress-types";
import { startOfWeekDateKey } from "@/lib/calendar-views";
import { shiftLocalDateKey } from "@/lib/workout-activity";

function asTimestamp(v: unknown): Date | null {
  if (v instanceof Timestamp) return v.toDate();
  if (
    v &&
    typeof v === "object" &&
    "seconds" in v &&
    typeof (v as { seconds: unknown }).seconds === "number"
  ) {
    return new Timestamp(
      (v as { seconds: number }).seconds,
      "nanoseconds" in v &&
        typeof (v as { nanoseconds: unknown }).nanoseconds === "number"
        ? (v as { nanoseconds: number }).nanoseconds
        : 0,
    ).toDate();
  }
  return null;
}

function asRole(v: unknown): GroupMemberRole | null {
  if (v === "owner" || v === "member") return v;
  return null;
}

function asWeeklyGoal(v: unknown): WeeklyGoalTarget {
  if (
    typeof v === "number" &&
    WEEKLY_GOAL_OPTIONS.includes(v as WeeklyGoalTarget)
  ) {
    return v as WeeklyGoalTarget;
  }
  return DEFAULT_PROGRESS_SETTINGS.weeklyGoal;
}

function asDateKey(v: unknown): string | null {
  if (v == null || v === "") return null;
  if (typeof v !== "string") return null;
  return /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null;
}

export function generateInviteCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < GROUP_LIMITS.inviteCode; i++) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)]!;
  }
  return out;
}

export function normalizeInviteCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12);
}

export function displayNameFromAuth(user: {
  displayName: string | null;
  email: string | null;
}): string {
  const name = user.displayName?.trim();
  if (name) return name.slice(0, GROUP_LIMITS.displayName);
  const email = user.email?.trim();
  if (email) {
    const local = email.split("@")[0]?.trim();
    if (local) return local.slice(0, GROUP_LIMITS.displayName);
  }
  return "Member";
}

export function groupDocToFirestore(
  doc: AccountabilityGroupDoc,
): Record<string, unknown> {
  return {
    name: doc.name,
    createdBy: doc.createdBy,
    createdAt: Timestamp.fromDate(doc.createdAt),
    inviteCode: doc.inviteCode,
    memberCount: doc.memberCount,
    kind: doc.kind,
    maxMembers: doc.maxMembers,
  };
}

export function asGroupKind(v: unknown): GroupKind {
  return v === "buddy" ? "buddy" : "group";
}

/** Groups created before buddies existed have no cap stored: they hold 12. */
export function asMaxMembers(v: unknown): number {
  return v === GROUP_LIMITS.buddyMembers ? GROUP_LIMITS.buddyMembers : GROUP_LIMITS.maxMembers;
}

export function firestoreToGroupDoc(
  data: Record<string, unknown>,
): AccountabilityGroupDoc | null {
  const name =
    typeof data.name === "string"
      ? data.name.trim().slice(0, GROUP_LIMITS.name)
      : "";
  const createdBy = typeof data.createdBy === "string" ? data.createdBy : "";
  const createdAt = asTimestamp(data.createdAt);
  const inviteCode =
    typeof data.inviteCode === "string"
      ? normalizeInviteCode(data.inviteCode)
      : "";
  const memberCount =
    typeof data.memberCount === "number" && Number.isFinite(data.memberCount)
      ? Math.max(0, Math.round(data.memberCount))
      : 0;
  if (!name || !createdBy || !createdAt || !inviteCode) return null;
  return {
    name,
    createdBy,
    createdAt,
    inviteCode,
    memberCount,
    kind: asGroupKind(data.kind),
    maxMembers: asMaxMembers(data.maxMembers),
  };
}

export function memberDocToFirestore(
  doc: GroupMemberDoc,
): Record<string, unknown> {
  return {
    uid: doc.uid,
    displayName: doc.displayName,
    role: doc.role,
    joinedAt: Timestamp.fromDate(doc.joinedAt),
    lastWorkoutDateKey: doc.lastWorkoutDateKey,
    lastWorkoutAt: doc.lastWorkoutAt
      ? Timestamp.fromDate(doc.lastWorkoutAt)
      : null,
    currentStreak: doc.currentStreak,
    weeklyGoal: doc.weeklyGoal,
    workoutsThisWeek: doc.workoutsThisWeek,
    trainedDays: doc.trainedDays,
    lastWorkoutLabel: doc.lastWorkoutLabel,
    upcomingPlans: doc.upcomingPlans,
  };
}

function asDateKeyList(v: unknown, max: number): string[] {
  if (!Array.isArray(v)) return [];
  const out = v.map(asDateKey).filter((k): k is string => k !== null);
  return [...new Set(out)].sort().slice(-max);
}

function asUpcomingPlans(v: unknown): MemberUpcomingPlan[] {
  if (!Array.isArray(v)) return [];
  const out: MemberUpcomingPlan[] = [];
  for (const row of v) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    const dateKey = asDateKey(r.dateKey);
    const label = typeof r.label === "string" ? r.label.trim().slice(0, GROUP_LIMITS.workoutLabel) : "";
    if (dateKey && label) out.push({ dateKey, label });
  }
  return out.slice(0, GROUP_LIMITS.upcomingPlansMax);
}

function asShortString(v: unknown, max: number): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim().slice(0, max);
  return t || null;
}

export function firestoreToMemberDoc(
  data: Record<string, unknown>,
): GroupMemberDoc | null {
  const uid = typeof data.uid === "string" ? data.uid : "";
  const displayName =
    typeof data.displayName === "string"
      ? data.displayName.trim().slice(0, GROUP_LIMITS.displayName) || "Member"
      : "Member";
  const role = asRole(data.role);
  const joinedAt = asTimestamp(data.joinedAt);
  if (!uid || !role || !joinedAt) return null;
  const lastWorkoutAtRaw = data.lastWorkoutAt;
  const lastWorkoutAt =
    lastWorkoutAtRaw == null ? null : asTimestamp(lastWorkoutAtRaw);
  const currentStreak =
    typeof data.currentStreak === "number" && Number.isFinite(data.currentStreak)
      ? Math.max(0, Math.round(data.currentStreak))
      : 0;
  const workoutsThisWeek =
    typeof data.workoutsThisWeek === "number" &&
    Number.isFinite(data.workoutsThisWeek)
      ? Math.max(0, Math.round(data.workoutsThisWeek))
      : 0;
  return {
    uid,
    displayName,
    role,
    joinedAt,
    lastWorkoutDateKey: asDateKey(data.lastWorkoutDateKey),
    lastWorkoutAt,
    currentStreak,
    weeklyGoal: asWeeklyGoal(data.weeklyGoal),
    workoutsThisWeek,
    trainedDays: asDateKeyList(data.trainedDays, GROUP_LIMITS.trainedDaysMax),
    lastWorkoutLabel: asShortString(data.lastWorkoutLabel, GROUP_LIMITS.workoutLabel),
    upcomingPlans: asUpcomingPlans(data.upcomingPlans),
  };
}

export function inviteCodeDocToFirestore(
  doc: InviteCodeDoc,
): Record<string, unknown> {
  return {
    groupId: doc.groupId,
    createdBy: doc.createdBy,
    createdAt: Timestamp.fromDate(doc.createdAt),
    active: doc.active,
  };
}

export function firestoreToInviteCodeDoc(
  data: Record<string, unknown>,
): InviteCodeDoc | null {
  const groupId = typeof data.groupId === "string" ? data.groupId : "";
  const createdBy = typeof data.createdBy === "string" ? data.createdBy : "";
  const createdAt = asTimestamp(data.createdAt);
  if (!groupId || !createdBy || !createdAt) return null;
  if (typeof data.active !== "boolean") return null;
  return {
    groupId,
    createdBy,
    createdAt,
    active: data.active,
  };
}

export function membershipIndexToFirestore(
  doc: GroupMembershipIndexDoc,
): Record<string, unknown> {
  return {
    groupId: doc.groupId,
    nameSnapshot: doc.nameSnapshot,
    role: doc.role,
    joinedAt: Timestamp.fromDate(doc.joinedAt),
    buddyNickname: doc.buddyNickname,
  };
}

export function firestoreToMembershipIndex(
  data: Record<string, unknown>,
): GroupMembershipIndexDoc | null {
  const groupId = typeof data.groupId === "string" ? data.groupId : "";
  const nameSnapshot =
    typeof data.nameSnapshot === "string"
      ? data.nameSnapshot.trim().slice(0, GROUP_LIMITS.name)
      : "";
  const role = asRole(data.role);
  const joinedAt = asTimestamp(data.joinedAt);
  if (!groupId || !nameSnapshot || !role || !joinedAt) return null;
  return {
    groupId,
    nameSnapshot,
    role,
    joinedAt,
    buddyNickname: asShortString(data.buddyNickname, GROUP_LIMITS.displayName),
  };
}

/** "Maya Chen" → "Maya". What groups show everywhere. */
export function firstName(displayName: string): string {
  return displayName.trim().split(/\s+/)[0] || "Member";
}

const TIME = /^([01][0-9]|2[0-3]):[0-5][0-9]$/;

function asTime(v: unknown): string | null {
  return typeof v === "string" && TIME.test(v) ? v : null;
}

function asExercises(v: unknown): SharedPlanExercise[] {
  if (!Array.isArray(v)) return [];
  const out: SharedPlanExercise[] = [];
  for (const row of v) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    const id = typeof r.id === "string" ? r.id.slice(0, 128) : "";
    const name = asShortString(r.name, 200);
    const sets =
      typeof r.sets === "number" && Number.isFinite(r.sets) && r.sets > 0
        ? Math.min(20, Math.round(r.sets))
        : null;
    if (id && name) out.push({ id, name, sets });
  }
  return out.slice(0, SHARED_PLAN_LIMITS.exercises);
}

function asUidList(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return [...new Set(v.filter((x): x is string => typeof x === "string" && x.length > 0))];
}

export function sharedPlanToFirestore(plan: SharedPlanDoc): Record<string, unknown> {
  return {
    groupId: plan.groupId,
    dateKey: plan.dateKey,
    time: plan.time,
    where: plan.where,
    label: plan.label,
    exercises: plan.exercises,
    note: plan.note,
    createdBy: plan.createdBy,
    createdByName: plan.createdByName,
    going: plan.going,
    goingAt: Object.fromEntries(
      Object.entries(plan.goingAt).map(([uid, at]) => [uid, Timestamp.fromDate(at)]),
    ),
    createdAt: Timestamp.fromDate(plan.createdAt),
  };
}

export function firestoreToSharedPlan(data: Record<string, unknown>): SharedPlanDoc | null {
  const groupId = typeof data.groupId === "string" ? data.groupId : "";
  const dateKey = asDateKey(data.dateKey);
  const label = asShortString(data.label, SHARED_PLAN_LIMITS.label);
  const createdBy = typeof data.createdBy === "string" ? data.createdBy : "";
  const createdAt = asTimestamp(data.createdAt);
  if (!groupId || !dateKey || !label || !createdBy || !createdAt) return null;
  const goingAt: Record<string, Date> = {};
  if (data.goingAt && typeof data.goingAt === "object") {
    for (const [uid, at] of Object.entries(data.goingAt as Record<string, unknown>)) {
      const d = asTimestamp(at);
      if (d) goingAt[uid] = d;
    }
  }
  return {
    groupId,
    dateKey,
    time: asTime(data.time),
    where: asShortString(data.where, SHARED_PLAN_LIMITS.where),
    label,
    exercises: asExercises(data.exercises),
    note: asShortString(data.note, SHARED_PLAN_LIMITS.note),
    createdBy,
    createdByName: asShortString(data.createdByName, GROUP_LIMITS.displayName) ?? "Member",
    going: asUidList(data.going).slice(0, SHARED_PLAN_LIMITS.going),
    goingAt,
    createdAt,
  };
}

function asNameList(v: unknown, max: number): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((x) => asShortString(x, GROUP_LIMITS.displayName))
    .filter((x): x is string => x !== null)
    .slice(0, max);
}

export function invitePreviewToFirestore(doc: InvitePreviewDoc): Record<string, unknown> {
  return {
    groupId: doc.groupId,
    groupName: doc.groupName,
    kind: doc.kind,
    invitedByName: doc.invitedByName,
    memberFirstNames: doc.memberFirstNames,
    memberCount: doc.memberCount,
    workoutsThisWeek: doc.workoutsThisWeek,
    plans: doc.plans,
    updatedAt: Timestamp.fromDate(doc.updatedAt),
  };
}

export function firestoreToInvitePreview(data: Record<string, unknown>): InvitePreviewDoc | null {
  const groupId = typeof data.groupId === "string" ? data.groupId : "";
  const groupName = asShortString(data.groupName, GROUP_LIMITS.name);
  if (!groupId || !groupName) return null;
  const plans: Record<string, InvitePreviewPlan> = {};
  if (data.plans && typeof data.plans === "object") {
    for (const [id, raw] of Object.entries(data.plans as Record<string, unknown>)) {
      if (!raw || typeof raw !== "object") continue;
      const r = raw as Record<string, unknown>;
      const dateKey = asDateKey(r.dateKey);
      const label = asShortString(r.label, SHARED_PLAN_LIMITS.label);
      if (!dateKey || !label) continue;
      plans[id] = {
        dateKey,
        label,
        time: asTime(r.time),
        where: asShortString(r.where, SHARED_PLAN_LIMITS.where),
        goingFirstNames: asNameList(r.goingFirstNames, SHARED_PLAN_LIMITS.going),
      };
    }
  }
  return {
    groupId,
    groupName,
    kind: asGroupKind(data.kind),
    invitedByName: asShortString(data.invitedByName, GROUP_LIMITS.displayName) ?? "A friend",
    memberFirstNames: asNameList(data.memberFirstNames, GROUP_LIMITS.maxMembers),
    memberCount:
      typeof data.memberCount === "number" && Number.isFinite(data.memberCount)
        ? Math.max(0, Math.round(data.memberCount))
        : 0,
    workoutsThisWeek:
      typeof data.workoutsThisWeek === "number" && Number.isFinite(data.workoutsThisWeek)
        ? Math.max(0, Math.round(data.workoutsThisWeek))
        : 0,
    plans,
    updatedAt: asTimestamp(data.updatedAt) ?? new Date(0),
  };
}

/**
 * A stored roster streak only updates when the member's own sessions sync
 * (finish, edit, reopen, delete). If they simply stop working out, nothing
 * triggers a recompute, so the last value would otherwise sit there forever.
 * Treat it as stale — and show 0 — once a full week has passed with no
 * activity at all, rather than storing an expiring value.
 */
export function cheerDocId(cheer: Pick<CheerDoc, "dateKey" | "toUid" | "fromUid">): string {
  return `${cheer.dateKey}_${cheer.toUid}_${cheer.fromUid}`;
}

export function cheerDocToFirestore(doc: CheerDoc): Record<string, unknown> {
  return {
    groupId: doc.groupId,
    toUid: doc.toUid,
    fromUid: doc.fromUid,
    dateKey: doc.dateKey,
    createdAt: Timestamp.fromDate(doc.createdAt),
  };
}

export function firestoreToCheerDoc(
  data: Record<string, unknown>,
): CheerDoc | null {
  const groupId = typeof data.groupId === "string" ? data.groupId : "";
  const toUid = typeof data.toUid === "string" ? data.toUid : "";
  const fromUid = typeof data.fromUid === "string" ? data.fromUid : "";
  const dateKey = asDateKey(data.dateKey);
  const createdAt = asTimestamp(data.createdAt);
  if (!groupId || !toUid || !fromUid || !dateKey || !createdAt) return null;
  return { groupId, toUid, fromUid, dateKey, createdAt };
}

export function isGroupStreakStale(
  lastWorkoutDateKey: string | null,
  todayKey: string,
): boolean {
  if (!lastWorkoutDateKey) return true;
  const lastWeekStart = startOfWeekDateKey(lastWorkoutDateKey);
  const currentWeekStart = startOfWeekDateKey(todayKey);
  const priorWeekStart = shiftLocalDateKey(currentWeekStart, -7);
  return lastWeekStart !== currentWeekStart && lastWeekStart !== priorWeekStart;
}

export function effectiveGroupMemberStreak(
  member: Pick<GroupMemberDoc, "currentStreak" | "lastWorkoutDateKey">,
  todayKey: string,
): number {
  return isGroupStreakStale(member.lastWorkoutDateKey, todayKey)
    ? 0
    : member.currentStreak;
}


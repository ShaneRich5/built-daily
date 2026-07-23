import { Timestamp } from "firebase/firestore";
import {
  GROUP_LIMITS,
  type AccountabilityGroupDoc,
  type GroupMemberDoc,
  type GroupMemberRole,
  type GroupMembershipIndexDoc,
  type InviteCodeDoc,
} from "@/lib/group-types";

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
  };
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
  return { name, createdBy, createdAt, inviteCode, memberCount };
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
  };
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
  return {
    uid,
    displayName,
    role,
    joinedAt,
    lastWorkoutDateKey: asDateKey(data.lastWorkoutDateKey),
    lastWorkoutAt,
    currentStreak,
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
  return { groupId, nameSnapshot, role, joinedAt };
}

/** Compute next streak given previous last date and the workout day being logged. */
export function nextStreakAfterWorkout(
  previousDateKey: string | null,
  previousStreak: number,
  workoutDateKey: string,
): number {
  if (previousDateKey === workoutDateKey) {
    return Math.max(1, previousStreak);
  }
  if (previousDateKey) {
    const prev = dateKeyToUtcMs(previousDateKey);
    const cur = dateKeyToUtcMs(workoutDateKey);
    if (prev != null && cur != null && cur - prev === 86_400_000) {
      return Math.max(1, previousStreak) + 1;
    }
  }
  return 1;
}

function dateKeyToUtcMs(dateKey: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return null;
  const [y, m, d] = dateKey.split("-").map((x) => Number(x));
  if (!y || !m || !d) return null;
  return Date.UTC(y, m - 1, d);
}

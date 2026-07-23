/** Accountability group domain types (Firestore top-level + membership index). */

export const GROUP_LIMITS = {
  name: 100,
  displayName: 80,
  inviteCode: 8,
  maxMembers: 12,
  maxGroupsPerUser: 20,
} as const;

export type GroupMemberRole = "owner" | "member";

export type AccountabilityGroupDoc = {
  name: string;
  createdBy: string;
  createdAt: Date;
  inviteCode: string;
  memberCount: number;
};

export type GroupMemberDoc = {
  uid: string;
  displayName: string;
  role: GroupMemberRole;
  joinedAt: Date;
  /** Local calendar day of last completed workout (`YYYY-MM-DD`). */
  lastWorkoutDateKey: string | null;
  lastWorkoutAt: Date | null;
  /** Consecutive local calendar days with a completed workout. */
  currentStreak: number;
};

export type InviteCodeDoc = {
  groupId: string;
  createdBy: string;
  createdAt: Date;
  active: boolean;
};

export type GroupMembershipIndexDoc = {
  groupId: string;
  nameSnapshot: string;
  role: GroupMemberRole;
  joinedAt: Date;
};

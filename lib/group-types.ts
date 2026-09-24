/** Accountability group domain types (Firestore top-level + membership index). */

import type { WeeklyGoalTarget } from "@/lib/progress-types";

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
  /**
   * Copy of the member's private `settings/progress.weeklyGoal` so the roster
   * can show progress toward it without reading another user's private data.
   */
  weeklyGoal: WeeklyGoalTarget;
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

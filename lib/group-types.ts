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
  /**
   * Consecutive local weeks (Mon–Sun) the member met their own `weeklyGoal`.
   * Not a stored decay — see `isGroupStreakStale` in group-mapper.ts for why
   * the UI must re-check staleness against `lastWorkoutDateKey` at read time.
   */
  currentStreak: number;
  /**
   * Copy of the member's private `settings/progress.weeklyGoal` so the roster
   * can show progress toward it without reading another user's private data.
   */
  weeklyGoal: WeeklyGoalTarget;
  /** Completed workouts (+ activities, since #29) in the current local week. */
  workoutsThisWeek: number;
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

/** Accountability group domain types (Firestore top-level + membership index). */

import type { WeeklyGoalTarget } from "@/lib/progress-types";

export const GROUP_LIMITS = {
  name: 100,
  displayName: 80,
  inviteCode: 8,
  maxMembers: 12,
  /** A gym buddy is just a group capped at two. */
  buddyMembers: 2,
  maxGroupsPerUser: 20,
  /** Days of upcoming plans copied onto a member doc. */
  upcomingPlanDays: 7,
  /** Cap on upcoming plan rows copied onto a member doc. */
  upcomingPlansMax: 14,
  /** Trained days kept on a member doc (this week + last week). */
  trainedDaysMax: 14,
  workoutLabel: 80,
} as const;

export type GroupMemberRole = "owner" | "member";

/** `buddy` = a group of two with friendlier copy; no other difference. */
export type GroupKind = "group" | "buddy";

export type AccountabilityGroupDoc = {
  name: string;
  createdBy: string;
  createdAt: Date;
  inviteCode: string;
  memberCount: number;
  /** Missing on groups created before buddies existed: reads as `group`. */
  kind: GroupKind;
  /** 2 for a buddy, 12 for a group. Missing reads as 12. */
  maxMembers: number;
};

/**
 * One upcoming planner day copied onto a member doc so groupmates can see
 * "planned" without reading anyone's private planner. Day + label only.
 */
export type MemberUpcomingPlan = {
  dateKey: string;
  label: string;
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
   * Consecutive local weeks (Sun–Sat) the member met their own `weeklyGoal`.
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
  /**
   * Local days (`YYYY-MM-DD`) the member trained, this week and last week.
   * Days only — never what was lifted. Empty on docs written before Groups
   * Together; filled on the member's next workout sync.
   */
  trainedDays: string[];
  /** Name of the member's most recent workout or activity ("Push day", "Run"). */
  lastWorkoutLabel: string | null;
  /** The member's next 7 days of planner entries (day + label only). */
  upcomingPlans: MemberUpcomingPlan[];
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
  /**
   * Gym buddy only: what the creator calls the other person before they join
   * ("Alex"). Lives on the private index so only its owner ever sees it.
   */
  buddyNickname: string | null;
};

export const SHARED_PLAN_LIMITS = {
  label: 80,
  where: 80,
  note: 140,
  exercises: 20,
  going: 12,
} as const;

/** An exercise in a shared plan's template: what to do, never how much. */
export type SharedPlanExercise = {
  id: string;
  name: string;
  /** Target set count from the template, or null. */
  sets: number | null;
};

/** `groups/{groupId}/plans/{planId}`: "a plan together" anyone in the group can join. */
export type SharedPlanDoc = {
  groupId: string;
  /** Local day `YYYY-MM-DD`. */
  dateKey: string;
  /** Local `HH:mm`, or null for "anytime". */
  time: string | null;
  where: string | null;
  /** Workout name ("Leg day"). */
  label: string;
  /** Template exercises (names + set counts only), empty for "something else". */
  exercises: SharedPlanExercise[];
  note: string | null;
  createdBy: string;
  createdByName: string;
  /** Uids who said "I'm in" (the creator starts in it). */
  going: string[];
  /** When each uid said "I'm in", for "Said I'm in yesterday". */
  goingAt: Record<string, Date>;
  createdAt: Date;
};

/**
 * `invitePreviews/{code}`: the only group data a signed-out visitor with the
 * link can read. First names, counts, and the plans someone chose to invite
 * to. Refreshed by any member when they open the invite sheet.
 */
export type InvitePreviewDoc = {
  groupId: string;
  groupName: string;
  kind: GroupKind;
  invitedByName: string;
  memberFirstNames: string[];
  memberCount: number;
  workoutsThisWeek: number;
  plans: Record<string, InvitePreviewPlan>;
  updatedAt: Date;
};

export type InvitePreviewPlan = {
  dateKey: string;
  time: string | null;
  where: string | null;
  label: string;
  goingFirstNames: string[];
};

/**
 * A single lightweight "cheer" from one member to another for a given local
 * day. The doc id (`{dateKey}_{toUid}_{fromUid}`) encodes identity, so at
 * most one cheer can exist per sender/recipient/day and firestore.rules can
 * enforce ownership with a plain equality check.
 */
export type CheerDoc = {
  groupId: string;
  toUid: string;
  fromUid: string;
  dateKey: string;
  createdAt: Date;
};

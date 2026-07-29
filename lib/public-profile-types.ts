/** Opt-in public profile (top-level `publicProfiles/{uid}`). */

export const PUBLIC_PROFILE_LIMITS = {
  displayName: 80,
  /** Max day keys stored for the public consistency chart (~26 weeks). */
  activityByDayEntries: 200,
} as const;

/** Local `YYYY-MM-DD` → completed workout count that day. */
export type PublicActivityByDay = Record<string, number>;

export type PublicProfileDoc = {
  displayName: string;
  /** When false, only the owner may read the doc. */
  profilePublic: boolean;
  /** Consecutive local calendar days with a completed workout. */
  currentStreak: number;
  /** Completed workouts in the local Mon–Sun week of `lastWorkoutDateKey`. */
  workoutsThisWeek: number;
  /** Local calendar day of last completed workout (`YYYY-MM-DD`). */
  lastWorkoutDateKey: string | null;
  /** Sparse workout counts for the public consistency heatmap. */
  activityByDay: PublicActivityByDay;
  updatedAt: Date;
};

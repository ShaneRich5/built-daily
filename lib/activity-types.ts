/** Domain types for recreational / unstructured activities (not workouts). */

export const ACTIVITY_NOTE_LIMIT = 400;
export const ACTIVITY_LOCATION_LIMIT = 120;

export type ActivityVisibility = "private";
export type ActivitySource = "manual";

/** Logged activity under `users/{uid}/activities/{id}`. */
export type ActivityDoc = {
  activityTypeId: string;
  /** Journal calendar day (`YYYY-MM-DD`). */
  activityDate: string;
  /** Local clock time `HH:mm` (24h), optional. */
  activityTime: string | null;
  durationMin: number | null;
  distanceMiles: number | null;
  locationName: string | null;
  notes: string | null;
  visibility: ActivityVisibility;
  source: ActivitySource;
  startedAt: Date | null;
  endedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type SavedActivity = {
  id: string;
  activity: ActivityDoc;
};

/** Input for creating an activity (client form). */
export type LogActivityInput = {
  activityTypeId: string;
  activityDate: string;
  activityTime?: string | null;
  durationMin?: number | null;
  distanceMiles?: number | null;
  locationName?: string | null;
  notes?: string | null;
};

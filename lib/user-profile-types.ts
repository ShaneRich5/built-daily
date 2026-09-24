/** Account-level profile at `users/{uid}` (identity + onboarding gate). */

export const USER_PROFILE_LIMITS = {
  displayName: 80,
  timezone: 64,
} as const;

/**
 * Logged numbers (lbs, miles) are imperial regardless of this setting — it
 * records the user's preference for display, which no screen reads yet.
 */
export type MeasurementUnits = "imperial" | "metric";

export type UserProfileDoc = {
  displayName: string;
  /** IANA zone, e.g. `America/New_York` — used to resolve local day boundaries. */
  timezone: string;
  units: MeasurementUnits;
  /** Null until the user finishes onboarding. */
  onboardingCompletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export const DEFAULT_MEASUREMENT_UNITS: MeasurementUnits = "imperial";

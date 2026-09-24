import { Timestamp } from "firebase/firestore";
import {
  DEFAULT_MEASUREMENT_UNITS,
  USER_PROFILE_LIMITS,
  type MeasurementUnits,
  type UserProfileDoc,
} from "@/lib/user-profile-types";

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

function asUnits(v: unknown): MeasurementUnits {
  return v === "imperial" || v === "metric" ? v : DEFAULT_MEASUREMENT_UNITS;
}

/** Device timezone, falling back to UTC when the browser won't report one. */
export function resolveDeviceTimezone(): string {
  try {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone?.trim();
    if (zone) return zone.slice(0, USER_PROFILE_LIMITS.timezone);
  } catch {
    /* fall through to UTC */
  }
  return "UTC";
}

export function userProfileToFirestore(
  doc: UserProfileDoc,
): Record<string, unknown> {
  return {
    displayName: doc.displayName,
    timezone: doc.timezone,
    units: doc.units,
    onboardingCompletedAt: doc.onboardingCompletedAt
      ? Timestamp.fromDate(doc.onboardingCompletedAt)
      : null,
    createdAt: Timestamp.fromDate(doc.createdAt),
    updatedAt: Timestamp.fromDate(doc.updatedAt),
  };
}

export function firestoreToUserProfile(
  data: Record<string, unknown>,
): UserProfileDoc | null {
  const displayName =
    typeof data.displayName === "string"
      ? data.displayName.trim().slice(0, USER_PROFILE_LIMITS.displayName)
      : "";
  const timezone =
    typeof data.timezone === "string"
      ? data.timezone.trim().slice(0, USER_PROFILE_LIMITS.timezone)
      : "";
  const createdAt = asTimestamp(data.createdAt);
  const updatedAt = asTimestamp(data.updatedAt);
  if (!displayName || !timezone || !createdAt || !updatedAt) return null;
  return {
    displayName,
    timezone,
    units: asUnits(data.units),
    onboardingCompletedAt: asTimestamp(data.onboardingCompletedAt),
    createdAt,
    updatedAt,
  };
}

import { Timestamp } from "firebase/firestore";
import { getActivityTypeById } from "@/lib/activity-catalog";
import {
  ACTIVITY_LOCATION_LIMIT,
  ACTIVITY_NOTE_LIMIT,
  type ActivityDoc,
  type ActivitySource,
  type ActivityVisibility,
  type LogActivityInput,
} from "@/lib/activity-types";
import { isValidWorkoutTime } from "@/lib/workout-date";

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

function asOptionalString(v: unknown, maxLen: number): string | null {
  if (v == null) return null;
  if (typeof v !== "string") return null;
  const t = v.trim().slice(0, maxLen);
  return t.length > 0 ? t : null;
}

function asOptionalFinite(v: unknown): number | null {
  if (v == null) return null;
  if (typeof v !== "number" || !Number.isFinite(v)) return null;
  return v;
}

export function activityDocToFirestore(doc: ActivityDoc): Record<string, unknown> {
  return {
    activityTypeId: doc.activityTypeId,
    activityDate: doc.activityDate,
    activityTime: doc.activityTime,
    durationMin: doc.durationMin,
    distanceMiles: doc.distanceMiles,
    locationName: doc.locationName,
    notes: doc.notes,
    visibility: doc.visibility,
    source: doc.source,
    startedAt: doc.startedAt ? Timestamp.fromDate(doc.startedAt) : null,
    endedAt: doc.endedAt ? Timestamp.fromDate(doc.endedAt) : null,
    createdAt: Timestamp.fromDate(doc.createdAt),
    updatedAt: Timestamp.fromDate(doc.updatedAt),
  };
}

export function firestoreToActivityDoc(
  data: Record<string, unknown>,
): ActivityDoc | null {
  const activityTypeId =
    typeof data.activityTypeId === "string" ? data.activityTypeId.trim() : "";
  if (!activityTypeId || activityTypeId.length > 64) return null;

  const activityDate =
    typeof data.activityDate === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(data.activityDate)
      ? data.activityDate
      : "";
  if (!activityDate) return null;

  const timeRaw =
    data.activityTime == null
      ? null
      : typeof data.activityTime === "string"
        ? data.activityTime
        : null;
  const activityTime =
    timeRaw && isValidWorkoutTime(timeRaw) ? timeRaw : null;

  const durationRaw = asOptionalFinite(data.durationMin);
  const durationMin =
    durationRaw != null && durationRaw > 0 && durationRaw <= 24 * 60
      ? Math.round(durationRaw)
      : null;

  const distanceRaw = asOptionalFinite(data.distanceMiles);
  const distanceMiles =
    distanceRaw != null && distanceRaw > 0 && distanceRaw <= 500
      ? Math.round(distanceRaw * 100) / 100
      : null;

  const visibility: ActivityVisibility =
    data.visibility === "private" ? "private" : "private";
  const source: ActivitySource =
    data.source === "manual" ? "manual" : "manual";

  const createdAt = asTimestamp(data.createdAt);
  const updatedAt = asTimestamp(data.updatedAt) ?? createdAt;
  if (!createdAt) return null;

  return {
    activityTypeId,
    activityDate,
    activityTime,
    durationMin,
    distanceMiles,
    locationName: asOptionalString(data.locationName, ACTIVITY_LOCATION_LIMIT),
    notes: asOptionalString(data.notes, ACTIVITY_NOTE_LIMIT),
    visibility,
    source,
    startedAt: asTimestamp(data.startedAt),
    endedAt: asTimestamp(data.endedAt),
    createdAt,
    updatedAt: updatedAt ?? createdAt,
  };
}

export function buildActivityDoc(input: LogActivityInput): ActivityDoc | null {
  const type = getActivityTypeById(input.activityTypeId);
  if (!type) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.activityDate)) return null;

  const timeRaw = input.activityTime?.trim() || null;
  const activityTime =
    timeRaw && isValidWorkoutTime(timeRaw) ? timeRaw : null;

  let durationMin: number | null = null;
  if (input.durationMin != null && Number.isFinite(input.durationMin)) {
    const n = Math.round(input.durationMin);
    if (n > 0 && n <= 24 * 60) durationMin = n;
  }

  let distanceMiles: number | null = null;
  if (
    type.supportsDistance &&
    input.distanceMiles != null &&
    Number.isFinite(input.distanceMiles)
  ) {
    const n = Math.round(input.distanceMiles * 100) / 100;
    if (n > 0 && n <= 500) distanceMiles = n;
  }

  const locationName = input.locationName?.trim().slice(0, ACTIVITY_LOCATION_LIMIT) || null;
  const notes = input.notes?.trim().slice(0, ACTIVITY_NOTE_LIMIT) || null;
  const now = new Date();

  return {
    activityTypeId: type.id,
    activityDate: input.activityDate,
    activityTime,
    durationMin,
    distanceMiles,
    locationName: locationName && locationName.length > 0 ? locationName : null,
    notes: notes && notes.length > 0 ? notes : null,
    visibility: "private",
    source: "manual",
    startedAt: null,
    endedAt: null,
    createdAt: now,
    updatedAt: now,
  };
}

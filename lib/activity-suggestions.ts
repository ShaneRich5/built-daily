import type { SavedActivity } from "@/lib/activity-types";

/** Suggested form defaults from prior logs of the same activity type. */
export type ActivityDetailSuggestions = {
  durationMin: number | null;
  distanceMiles: number | null;
  locationName: string | null;
  /** How many prior logs informed the suggestion. */
  sampleCount: number;
  lastDateKey: string | null;
  /** Human summary, e.g. "Last walk · 32 min · 1.4 mi". */
  summary: string | null;
};

function median(nums: number[]): number | null {
  if (nums.length === 0) return null;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return Math.round((sorted[mid - 1]! + sorted[mid]!) / 2);
  }
  return sorted[mid]!;
}

function medianMiles(nums: number[]): number | null {
  if (nums.length === 0) return null;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const raw =
    sorted.length % 2 === 0
      ? (sorted[mid - 1]! + sorted[mid]!) / 2
      : sorted[mid]!;
  return Math.round(raw * 100) / 100;
}

/**
 * Suggest duration / distance / location from past entries of one type.
 * Uses the most recent log for location; median of up to last 5 for numbers
 * so one outlier doesn't dominate.
 */
export function suggestActivityDetails(
  rows: SavedActivity[],
  activityTypeId: string,
): ActivityDetailSuggestions {
  const empty: ActivityDetailSuggestions = {
    durationMin: null,
    distanceMiles: null,
    locationName: null,
    sampleCount: 0,
    lastDateKey: null,
    summary: null,
  };
  if (!activityTypeId) return empty;

  const ofType = rows
    .filter((r) => r.activity.activityTypeId === activityTypeId)
    .sort((a, b) => {
      const byDate = b.activity.activityDate.localeCompare(
        a.activity.activityDate,
      );
      if (byDate !== 0) return byDate;
      return b.activity.createdAt.getTime() - a.activity.createdAt.getTime();
    });

  if (ofType.length === 0) return empty;

  const recent = ofType.slice(0, 5);
  const durations = recent
    .map((r) => r.activity.durationMin)
    .filter((n): n is number => n != null && n > 0);
  const distances = recent
    .map((r) => r.activity.distanceMiles)
    .filter((n): n is number => n != null && n > 0);

  const last = ofType[0]!;
  const durationMin = median(durations);
  const distanceMiles = medianMiles(distances);
  const locationName = last.activity.locationName;

  const parts: string[] = [];
  if (durationMin != null) parts.push(`${durationMin} min`);
  if (distanceMiles != null) parts.push(`${distanceMiles} mi`);
  if (locationName) parts.push(locationName);

  return {
    durationMin,
    distanceMiles,
    locationName,
    sampleCount: ofType.length,
    lastDateKey: last.activity.activityDate,
    summary: parts.length > 0 ? `Usual · ${parts.join(" · ")}` : null,
  };
}

import { FieldValue } from "firebase-admin/firestore";
import { addDaysToDateKey } from "@/lib/calendar-views";
import { getAdminFirestore } from "@/lib/firebase-admin";
import type { CalendarFeedEntry } from "@/lib/calendar-feed-ics";
import type { ScheduledWorkoutStatus } from "@/lib/planner-types";
import { randomSecret } from "@/mcp/crypto";

/**
 * Server-only (Admin SDK) storage for planner calendar feeds.
 *
 * `calendarFeeds/{uid}` holds one secret feed token per user. The token is
 * stored as-is, not hashed like MCP tokens, because Settings has to show the
 * link again whenever you need to paste it into another calendar. It is
 * read-only and exposes only planned days and workout names (the same trade
 * Google Calendar makes with its own "secret address in iCal format").
 * Getting a new link overwrites the token, so the old link stops working.
 *
 * The collection has no client rules and falls through to default deny.
 */
const COLLECTION = "calendarFeeds";
const TOKEN_PREFIX = "bd_cal_";

/** How far back the feed reaches, so recent history stays on the calendar. */
const LOOKBACK_DAYS = 60;
/** Safety cap on events per feed; years of planning fit well under it. */
const MAX_ENTRIES = 1500;

/** The user's current feed token, or null if they haven't made one. */
export async function getCalendarFeedToken(
  uid: string,
): Promise<string | null> {
  const snap = await getAdminFirestore().collection(COLLECTION).doc(uid).get();
  const token = snap.data()?.token;
  return typeof token === "string" ? token : null;
}

/** Makes a new feed token for `uid`, replacing (and so revoking) any old one. */
export async function createCalendarFeedToken(uid: string): Promise<string> {
  const token = randomSecret(TOKEN_PREFIX);
  await getAdminFirestore().collection(COLLECTION).doc(uid).set({
    token,
    createdAt: FieldValue.serverTimestamp(),
    lastFetchedAt: null,
  });
  return token;
}

/** Cheap shape check before touching Firestore. */
export function looksLikeCalendarFeedToken(token: string): boolean {
  return (
    token.startsWith(TOKEN_PREFIX) && token.length > TOKEN_PREFIX.length + 20
  );
}

/**
 * Resolves a feed token to its owner, or null if unknown or replaced.
 * Best-effort records when a calendar last fetched it.
 */
export async function resolveCalendarFeedToken(
  token: string,
): Promise<string | null> {
  const snap = await getAdminFirestore()
    .collection(COLLECTION)
    .where("token", "==", token)
    .limit(1)
    .get();
  const doc = snap.docs[0];
  if (!doc) return null;

  void doc.ref
    .update({ lastFetchedAt: FieldValue.serverTimestamp() })
    .catch(() => {});
  return doc.id;
}

/**
 * Planner entries from a little before `todayKey` onward, scheduled ones
 * only (Unscheduled entries have `dateKey: null` and drop out of the range).
 */
export async function listCalendarFeedEntries(
  uid: string,
  todayKey: string,
): Promise<CalendarFeedEntry[]> {
  const snap = await getAdminFirestore()
    .collection("users")
    .doc(uid)
    .collection("scheduledWorkouts")
    .where("dateKey", ">=", addDaysToDateKey(todayKey, -LOOKBACK_DAYS))
    .orderBy("dateKey")
    .limit(MAX_ENTRIES)
    .get();

  const entries: CalendarFeedEntry[] = [];
  for (const doc of snap.docs) {
    const data = doc.data();
    if (typeof data.dateKey !== "string" || typeof data.label !== "string")
      continue;
    entries.push({
      id: doc.id,
      dateKey: data.dateKey,
      label: data.label,
      planId: typeof data.planId === "string" ? data.planId : null,
      exerciseIds: Array.isArray(data.exerciseIds)
        ? data.exerciseIds.filter((id): id is string => typeof id === "string")
        : [],
      status: readStatus(data.status),
    });
  }
  return entries;
}

function readStatus(value: unknown): ScheduledWorkoutStatus {
  return value === "completed" || value === "skipped" ? value : "planned";
}

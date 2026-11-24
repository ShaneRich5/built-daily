import { authedFetch } from "@/lib/authed-fetch";

/** The signed-in user's calendar feed link, or null if they haven't made one. Throws on failure. */
export async function getCalendarFeedUrl(): Promise<string | null> {
  const res = await authedFetch("/api/calendar-feed");
  if (!res.ok) throw new Error(`Calendar feed lookup failed (${res.status})`);
  const data = (await res.json()) as { url?: unknown };
  return typeof data.url === "string" ? data.url : null;
}

/** Makes the feed link, or replaces it so the old one stops working. Throws on failure. */
export async function createCalendarFeedUrl(): Promise<string> {
  const res = await authedFetch("/api/calendar-feed", { method: "POST" });
  if (!res.ok) throw new Error(`Calendar feed create failed (${res.status})`);
  const data = (await res.json()) as { url?: unknown };
  if (typeof data.url !== "string") throw new Error("Calendar feed create returned no url");
  return data.url;
}

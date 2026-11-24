"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import {
  createCalendarFeedUrl,
  getCalendarFeedUrl,
} from "@/lib/calendar-feed-repository";

/** The signed-in user's calendar feed link: load it, make it, or swap it for a new one. */
export function useCalendarFeed() {
  const { user, firebaseReady } = useAuth();
  const [url, setUrl] = useState<string | null>(null);
  /** Whose link `url` holds, so a different (or no) user reads as not loaded. */
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !firebaseReady) return;
    const uid = user.uid;
    let cancelled = false;
    void (async () => {
      try {
        const next = await getCalendarFeedUrl();
        if (cancelled) return;
        setUrl(next);
      } catch {
        if (cancelled) return;
        setError("Couldn’t load your calendar link. Refresh to try again.");
      }
      setLoadedFor(uid);
    })();
    return () => {
      cancelled = true;
    };
  }, [user, firebaseReady]);

  /** Used for both the first link and "Get a new link". */
  async function create() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      setUrl(await createCalendarFeedUrl());
    } catch {
      setError("Couldn’t make a calendar link. Try again.");
    } finally {
      setBusy(false);
    }
  }

  const loaded = Boolean(user) && loadedFor === user?.uid;

  return { loaded, url: loaded ? url : null, busy, error, create };
}

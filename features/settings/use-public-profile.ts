"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { getOwnPublicProfile, setProfilePublic } from "@/lib/public-profile-repository";

/** Loads whether the signed-in user's profile is public and flips it optimistically. */
export function usePublicProfile() {
  const { user, firebaseReady } = useAuth();
  const [isPublic, setIsPublic] = useState(false);
  /** Whose profile `isPublic` was loaded for, so a different (or no) user reads as not loaded. */
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !firebaseReady) return;
    const uid = user.uid;
    let cancelled = false;
    void (async () => {
      const row = await getOwnPublicProfile();
      if (cancelled) return;
      const nowPublic = row?.profile.profilePublic ?? false;
      // Re-seed chart history for profiles created before activityByDay existed.
      if (nowPublic && Object.keys(row?.profile.activityByDay ?? {}).length === 0) {
        await setProfilePublic(true);
      }
      if (cancelled) return;
      setIsPublic(nowPublic);
      setLoadedFor(uid);
    })();
    return () => {
      cancelled = true;
    };
  }, [user, firebaseReady]);

  async function toggle(next: boolean) {
    if (!user || busy) return;
    setBusy(true);
    setError(null);
    const prev = isPublic;
    setIsPublic(next);
    try {
      if (!(await setProfilePublic(next))) throw new Error("not saved");
    } catch {
      setIsPublic(prev);
      setError("Couldn’t update profile visibility. Try again.");
    } finally {
      setBusy(false);
    }
  }

  const loaded = Boolean(user) && loadedFor === user?.uid;
  const sharePath = user ? `/u/${user.uid}` : "";
  const shareUrl = typeof window !== "undefined" ? `${window.location.origin}${sharePath}` : sharePath;

  return { loaded, isPublic, busy, error, sharePath, shareUrl, toggle };
}

"use client";

/* eslint-disable react-hooks/set-state-in-effect -- mirrors AuthProvider's auth-bootstrap pattern. */

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { subscribeUserProfile } from "@/lib/user-profile-repository";
import type { UserProfileDoc } from "@/lib/user-profile-types";

/** Routes a signed-in, not-yet-onboarded user may still reach. */
const EXEMPT_PATHS = new Set(["/onboarding", "/login"]);

/**
 * Redirects a signed-in user who hasn't finished onboarding to `/onboarding`.
 * Renders nothing — this only ever triggers a client-side navigation.
 */
export function OnboardingGate() {
  const { user, firebaseReady } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [profile, setProfile] = useState<UserProfileDoc | null>(null);

  useEffect(() => {
    if (!user || !firebaseReady) {
      setProfile(null);
      return;
    }
    return subscribeUserProfile(setProfile);
  }, [user, firebaseReady]);

  useEffect(() => {
    if (!user || !profile || EXEMPT_PATHS.has(pathname)) return;
    if (profile.onboardingCompletedAt == null) {
      router.replace("/onboarding");
    }
  }, [user, profile, pathname, router]);

  return null;
}

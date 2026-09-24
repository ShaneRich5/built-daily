import { doc, getDoc, setDoc } from "firebase/firestore";
import { getFirestoreDb } from "@/lib/firebase";
import { displayNameFromAuth } from "@/lib/group-mapper";
import {
  firestoreToUserProfile,
  resolveDeviceTimezone,
  userProfileToFirestore,
} from "@/lib/user-profile-mapper";
import {
  DEFAULT_MEASUREMENT_UNITS,
  type UserProfileDoc,
} from "@/lib/user-profile-types";

type AuthUserLike = {
  uid: string;
  displayName: string | null;
  email: string | null;
};

/**
 * Create `users/{uid}` on first sign-in, and refresh name/timezone when the
 * account or device has moved on. Best-effort: never blocks sign-in.
 */
export async function ensureUserProfile(
  user: AuthUserLike,
): Promise<UserProfileDoc | null> {
  const db = getFirestoreDb();
  if (!db || !user.uid) return null;

  const ref = doc(db, "users", user.uid);
  const displayName = displayNameFromAuth(user);
  const timezone = resolveDeviceTimezone();

  try {
    const snap = await getDoc(ref);
    const existing = snap.exists()
      ? firestoreToUserProfile(snap.data() as Record<string, unknown>)
      : null;

    if (!existing) {
      const now = new Date();
      const profile: UserProfileDoc = {
        displayName,
        timezone,
        units: DEFAULT_MEASUREMENT_UNITS,
        onboardingCompletedAt: null,
        createdAt: now,
        updatedAt: now,
      };
      await setDoc(ref, userProfileToFirestore(profile), { merge: true });
      return profile;
    }

    if (existing.displayName === displayName && existing.timezone === timezone) {
      return existing;
    }

    const refreshed: UserProfileDoc = {
      ...existing,
      displayName,
      timezone,
      updatedAt: new Date(),
    };
    await setDoc(ref, userProfileToFirestore(refreshed), { merge: true });
    return refreshed;
  } catch {
    return null;
  }
}

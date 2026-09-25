import { doc, getDoc, onSnapshot, setDoc, Timestamp } from "firebase/firestore";
import { getFirebaseAuth, getFirestoreDb } from "@/lib/firebase";
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

/** Live `users/{uid}` doc for the signed-in user, or `null` if signed out / not created yet. */
export function subscribeUserProfile(
  onProfile: (profile: UserProfileDoc | null) => void,
): () => void {
  const db = getFirestoreDb();
  const uid = getFirebaseAuth()?.currentUser?.uid;
  if (!db || !uid) {
    onProfile(null);
    return () => {};
  }
  return onSnapshot(
    doc(db, "users", uid),
    (snap) => {
      onProfile(
        snap.exists()
          ? firestoreToUserProfile(snap.data() as Record<string, unknown>)
          : null,
      );
    },
    () => onProfile(null),
  );
}

/** Marks onboarding done (finished or skipped) so the gate stops redirecting. */
export async function setOnboardingCompleted(): Promise<boolean> {
  const db = getFirestoreDb();
  const uid = getFirebaseAuth()?.currentUser?.uid;
  if (!db || !uid) return false;
  const now = Timestamp.fromDate(new Date());
  await setDoc(
    doc(db, "users", uid),
    { onboardingCompletedAt: now, updatedAt: now },
    { merge: true },
  );
  return true;
}

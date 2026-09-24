import { doc, getDoc, setDoc } from "firebase/firestore";
import { getFirebaseAuth, getFirestoreDb } from "@/lib/firebase";
import { displayNameFromAuth } from "@/lib/group-mapper";
import {
  activityMapToRecord,
  firestoreToPublicProfileDoc,
  publicProfileDocToFirestore,
} from "@/lib/public-profile-mapper";
import type { PublicProfileDoc } from "@/lib/public-profile-types";
import { computeUserWorkoutSignals } from "@/lib/workout-signals-client";

export type SavedPublicProfile = {
  id: string;
  profile: PublicProfileDoc;
};

function profileRef(userId: string) {
  const db = getFirestoreDb();
  if (!db || !userId) return null;
  return doc(db, "publicProfiles", userId);
}

function emptyProfile(
  displayName: string,
  profilePublic: boolean,
  now: Date,
): PublicProfileDoc {
  return {
    displayName,
    profilePublic,
    currentStreak: 0,
    workoutsThisWeek: 0,
    lastWorkoutDateKey: null,
    activityByDay: {},
    updatedAt: now,
  };
}

/** Public read for visitors. Returns null if missing, private, or denied. */
export async function getPublicProfile(
  userId: string,
): Promise<SavedPublicProfile | null> {
  const ref = profileRef(userId);
  if (!ref) return null;
  try {
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    const profile = firestoreToPublicProfileDoc(
      snap.data() as Record<string, unknown>,
    );
    if (!profile || !profile.profilePublic) return null;
    return { id: snap.id, profile };
  } catch {
    return null;
  }
}

/** Owner read — works even when `profilePublic` is false. */
export async function getOwnPublicProfile(): Promise<SavedPublicProfile | null> {
  const user = getFirebaseAuth()?.currentUser;
  if (!user) return null;
  const ref = profileRef(user.uid);
  if (!ref) return null;
  try {
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    const profile = firestoreToPublicProfileDoc(
      snap.data() as Record<string, unknown>,
    );
    if (!profile) return null;
    return { id: snap.id, profile };
  } catch {
    return null;
  }
}

/**
 * Opt in/out of a public profile. When enabling, seeds consistency from
 * the owner's completed sessions.
 */
export async function setProfilePublic(enabled: boolean): Promise<boolean> {
  const db = getFirestoreDb();
  const user = getFirebaseAuth()?.currentUser;
  if (!db || !user) return false;

  const ref = profileRef(user.uid);
  if (!ref) return false;

  const displayName = displayNameFromAuth(user);
  const now = new Date();

  if (!enabled) {
    const existing = await getOwnPublicProfile();
    if (!existing) {
      await setDoc(
        ref,
        publicProfileDocToFirestore(emptyProfile(displayName, false, now)),
      );
      return true;
    }
    const docData: PublicProfileDoc = {
      ...existing.profile,
      displayName,
      profilePublic: false,
      updatedAt: now,
    };
    await setDoc(ref, publicProfileDocToFirestore(docData));
    return true;
  }

  const signals = await computeUserWorkoutSignals(user.uid);
  const docData: PublicProfileDoc = {
    displayName,
    profilePublic: true,
    currentStreak: signals.currentStreak,
    workoutsThisWeek: signals.workoutsThisWeek,
    lastWorkoutDateKey: signals.lastWorkoutDateKey,
    activityByDay: activityMapToRecord(signals.activityByDay),
    updatedAt: now,
  };
  await setDoc(ref, publicProfileDocToFirestore(docData));
  return true;
}

/**
 * Best-effort: recompute the public profile's consistency signals from the
 * owner's sessions and write them. No-op when the profile is missing or not
 * public. Always recomputes from source so drift (deleted/moved/backdated
 * sessions) self-heals instead of accumulating.
 */
export async function syncPublicProfileConsistency(): Promise<void> {
  const user = getFirebaseAuth()?.currentUser;
  if (!user) return;

  const ref = profileRef(user.uid);
  if (!ref) return;

  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const existing = firestoreToPublicProfileDoc(
    snap.data() as Record<string, unknown>,
  );
  if (!existing || !existing.profilePublic) return;

  const signals = await computeUserWorkoutSignals(user.uid);
  const docData: PublicProfileDoc = {
    displayName: displayNameFromAuth(user),
    profilePublic: true,
    currentStreak: signals.currentStreak,
    workoutsThisWeek: signals.workoutsThisWeek,
    lastWorkoutDateKey: signals.lastWorkoutDateKey,
    activityByDay: activityMapToRecord(signals.activityByDay),
    updatedAt: new Date(),
  };
  await setDoc(ref, publicProfileDocToFirestore(docData));
}

export { effectiveWorkoutsThisWeek } from "@/lib/public-profile-mapper";

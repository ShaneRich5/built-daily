import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  setDoc,
  where,
} from "firebase/firestore";
import { getFirebaseAuth, getFirestoreDb } from "@/lib/firebase";
import {
  displayNameFromAuth,
  nextStreakAfterWorkout,
} from "@/lib/group-mapper";
import {
  currentWorkoutStreak,
  activityByDayFromSessions,
} from "@/lib/workout-activity";
import {
  weekStartMondayKey,
  workoutsInWeek,
} from "@/lib/progress-insights";
import {
  activityMapToRecord,
  firestoreToPublicProfileDoc,
  pruneActivityByDay,
  publicProfileDocToFirestore,
} from "@/lib/public-profile-mapper";
import type {
  PublicActivityByDay,
  PublicProfileDoc,
} from "@/lib/public-profile-types";
import { localDateKeyFromMs } from "@/lib/workout-date";
import { firestoreToWorkoutSessionDoc } from "@/lib/workout-session-mapper";

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

async function computeConsistencyFromSessions(uid: string): Promise<{
  currentStreak: number;
  workoutsThisWeek: number;
  lastWorkoutDateKey: string | null;
  activityByDay: PublicActivityByDay;
}> {
  const db = getFirestoreDb();
  const empty = {
    currentStreak: 0,
    workoutsThisWeek: 0,
    lastWorkoutDateKey: null as string | null,
    activityByDay: {} as PublicActivityByDay,
  };
  if (!db) return empty;

  const q = query(
    collection(db, "users", uid, "sessions"),
    where("status", "==", "completed"),
    orderBy("endedAt", "desc"),
    limit(400),
  );
  const snap = await getDocs(q);
  const sessions = [];
  for (const d of snap.docs) {
    const session = firestoreToWorkoutSessionDoc(
      d.data() as Record<string, unknown>,
    );
    if (session && session.status === "completed") sessions.push(session);
  }

  const todayKey = localDateKeyFromMs(Date.now());
  const activity = activityByDayFromSessions(sessions);
  const currentStreak = currentWorkoutStreak(activity, todayKey);
  const workoutsThisWeek = workoutsInWeek(
    activity,
    weekStartMondayKey(todayKey),
  );

  let lastWorkoutDateKey: string | null = null;
  for (const s of sessions) {
    const key =
      s.workoutDate ??
      localDateKeyFromMs((s.endedAt ?? s.startedAt).getTime());
    if (!lastWorkoutDateKey || key > lastWorkoutDateKey) {
      lastWorkoutDateKey = key;
    }
  }

  return {
    currentStreak,
    workoutsThisWeek,
    lastWorkoutDateKey,
    activityByDay: activityMapToRecord(activity),
  };
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

  const consistency = await computeConsistencyFromSessions(user.uid);
  const docData: PublicProfileDoc = {
    displayName,
    profilePublic: true,
    currentStreak: consistency.currentStreak,
    workoutsThisWeek: consistency.workoutsThisWeek,
    lastWorkoutDateKey: consistency.lastWorkoutDateKey,
    activityByDay: consistency.activityByDay,
    updatedAt: now,
  };
  await setDoc(ref, publicProfileDocToFirestore(docData));
  return true;
}

/**
 * Best-effort update after a completed workout. No-op when profile is
 * missing or not public.
 */
export async function syncPublicProfileConsistency(options: {
  workoutDateKey: string;
  workoutAtMs: number;
}): Promise<void> {
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

  const dateKey = options.workoutDateKey;
  const todayKey = localDateKeyFromMs(options.workoutAtMs);

  // Backfill chart history if an older public profile lacked activityByDay.
  let activityByDay = existing.activityByDay;
  if (Object.keys(activityByDay).length === 0) {
    const seeded = await computeConsistencyFromSessions(user.uid);
    activityByDay = seeded.activityByDay;
  } else {
    activityByDay = pruneActivityByDay(
      {
        ...activityByDay,
        [dateKey]: (activityByDay[dateKey] ?? 0) + 1,
      },
      todayKey,
    );
  }

  const currentStreak = nextStreakAfterWorkout(
    existing.lastWorkoutDateKey,
    existing.currentStreak,
    dateKey,
  );

  const thisWeekStart = weekStartMondayKey(dateKey);
  const prevWeekStart = existing.lastWorkoutDateKey
    ? weekStartMondayKey(existing.lastWorkoutDateKey)
    : null;
  const workoutsThisWeek =
    prevWeekStart === thisWeekStart ? existing.workoutsThisWeek + 1 : 1;

  const docData: PublicProfileDoc = {
    displayName: displayNameFromAuth(user),
    profilePublic: true,
    currentStreak,
    workoutsThisWeek,
    lastWorkoutDateKey: dateKey,
    activityByDay,
    updatedAt: new Date(options.workoutAtMs),
  };
  await setDoc(ref, publicProfileDocToFirestore(docData));
}

export { effectiveWorkoutsThisWeek } from "@/lib/public-profile-mapper";

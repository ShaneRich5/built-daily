import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  increment,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { getFirebaseAuth, getFirestoreDb } from "@/lib/firebase";
import {
  cheerDocId,
  cheerDocToFirestore,
  displayNameFromAuth,
  firestoreToCheerDoc,
  firestoreToGroupDoc,
  firestoreToInviteCodeDoc,
  firestoreToMemberDoc,
  firestoreToMembershipIndex,
  generateInviteCode,
  groupDocToFirestore,
  inviteCodeDocToFirestore,
  memberDocToFirestore,
  membershipIndexToFirestore,
  normalizeInviteCode,
} from "@/lib/group-mapper";
import {
  GROUP_LIMITS,
  type AccountabilityGroupDoc,
  type CheerDoc,
  type GroupKind,
  type GroupMemberDoc,
  type GroupMembershipIndexDoc,
} from "@/lib/group-types";
import { syncUpcomingPlansToGroups } from "@/lib/group-plan-sync";
import { firestoreToProgressSettings } from "@/lib/progress-mapper";
import type { WeeklyGoalTarget } from "@/lib/progress-types";
import { goalWeekStreak } from "@/lib/progress-insights";
import { localDateKeyFromMs } from "@/lib/workout-date";
import { computeUserWorkoutSignals } from "@/lib/workout-signals-client";
import { trainedDaysThisAndLastWeek } from "@/lib/workout-signals";

export type SavedGroupMembership = {
  id: string;
  membership: GroupMembershipIndexDoc;
};

export type SavedGroup = {
  id: string;
  group: AccountabilityGroupDoc;
};

export type SavedGroupMember = {
  id: string;
  member: GroupMemberDoc;
};

function membershipsCollectionRef() {
  const db = getFirestoreDb();
  const uid = getFirebaseAuth()?.currentUser?.uid;
  if (!db || !uid) return null;
  return collection(db, "users", uid, "groupMemberships");
}

/** Member docs carry a copy of the owner's weekly goal so rosters can show progress. */
async function currentWeeklyGoal(uid: string): Promise<WeeklyGoalTarget> {
  const db = getFirestoreDb();
  if (!db) return firestoreToProgressSettings(undefined).weeklyGoal;
  const snap = await getDoc(doc(db, "users", uid, "settings", "progress"));
  return firestoreToProgressSettings(
    snap.exists() ? (snap.data() as Record<string, unknown>) : undefined,
  ).weeklyGoal;
}

async function allocateInviteCode(): Promise<string | null> {
  const db = getFirestoreDb();
  if (!db) return null;
  for (let attempt = 0; attempt < 8; attempt++) {
    const code = generateInviteCode();
    const ref = doc(db, "inviteCodes", code);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      return code;
    }
  }
  return null;
}

/** One-shot read of the signed-in user's group memberships (no live updates). */
export async function getUserGroupMemberships(): Promise<SavedGroupMembership[]> {
  const col = membershipsCollectionRef();
  if (!col) return [];
  const snap = await getDocs(col);
  const out: SavedGroupMembership[] = [];
  for (const d of snap.docs) {
    const membership = firestoreToMembershipIndex(
      d.data() as Record<string, unknown>,
    );
    if (membership) out.push({ id: d.id, membership });
  }
  return out;
}

/** Live list of the signed-in user's group memberships. */
export function subscribeUserGroupMemberships(
  onMemberships: (rows: SavedGroupMembership[]) => void,
): () => void {
  const col = membershipsCollectionRef();
  if (!col) {
    onMemberships([]);
    return () => {};
  }

  const q = query(col, orderBy("joinedAt", "desc"));
  return onSnapshot(
    q,
    (snap) => {
      const out: SavedGroupMembership[] = [];
      for (const d of snap.docs) {
        const membership = firestoreToMembershipIndex(
          d.data() as Record<string, unknown>,
        );
        if (membership) out.push({ id: d.id, membership });
      }
      onMemberships(out);
    },
    () => onMemberships([]),
  );
}

export async function getAccountabilityGroup(
  groupId: string,
): Promise<SavedGroup | null> {
  const db = getFirestoreDb();
  if (!db || !groupId) return null;
  const snap = await getDoc(doc(db, "groups", groupId));
  if (!snap.exists()) return null;
  const group = firestoreToGroupDoc(snap.data() as Record<string, unknown>);
  if (!group) return null;
  return { id: snap.id, group };
}

/** Live member roster for a group (newest join first is fine; client sorts). */
export function subscribeGroupMembers(
  groupId: string,
  onMembers: (rows: SavedGroupMember[]) => void,
): () => void {
  const db = getFirestoreDb();
  if (!db || !groupId) {
    onMembers([]);
    return () => {};
  }

  const q = query(
    collection(db, "groups", groupId, "members"),
    orderBy("joinedAt", "asc"),
  );
  return onSnapshot(
    q,
    (snap) => {
      const out: SavedGroupMember[] = [];
      for (const d of snap.docs) {
        const member = firestoreToMemberDoc(
          d.data() as Record<string, unknown>,
        );
        if (member) out.push({ id: d.id, member });
      }
      onMembers(out);
    },
    () => onMembers([]),
  );
}

export type CreateGroupOptions = {
  /** `buddy` caps the group at two. Defaults to `group`. */
  kind?: GroupKind;
  /** Buddy only: private name for the other person until they join. */
  buddyNickname?: string | null;
};

/** A fresh member row: signals start empty and fill on the member's next sync. */
function newMemberDoc(
  user: { uid: string; displayName: string | null; email: string | null },
  role: "owner" | "member",
  joinedAt: Date,
  weeklyGoal: WeeklyGoalTarget,
): GroupMemberDoc {
  return {
    uid: user.uid,
    displayName: displayNameFromAuth(user),
    role,
    joinedAt,
    lastWorkoutDateKey: null,
    lastWorkoutAt: null,
    currentStreak: 0,
    workoutsThisWeek: 0,
    weeklyGoal,
    trainedDays: [],
    lastWorkoutLabel: null,
    upcomingPlans: [],
  };
}

/** Fill a just-written member row with real signals and plans (best-effort). */
async function syncNewMembership(): Promise<void> {
  try {
    await Promise.all([bumpGroupWorkoutSignals(), syncUpcomingPlansToGroups()]);
  } catch {
    /* best-effort */
  }
}

export async function createAccountabilityGroup(
  nameRaw: string,
  options: CreateGroupOptions = {},
): Promise<{ groupId: string; inviteCode: string } | null> {
  const db = getFirestoreDb();
  const user = getFirebaseAuth()?.currentUser;
  if (!db || !user) {
    throw new Error("Sign in to create a group.");
  }

  const name = nameRaw.trim().slice(0, GROUP_LIMITS.name);
  if (!name) {
    throw new Error("Enter a group name.");
  }

  try {
    const membershipsSnap = await getDocs(
      collection(db, "users", user.uid, "groupMemberships"),
    );
    if (membershipsSnap.size >= GROUP_LIMITS.maxGroupsPerUser) {
      throw new Error(
        `You can be in at most ${GROUP_LIMITS.maxGroupsPerUser} groups.`,
      );
    }
  } catch (err) {
    if (isPermissionDenied(err)) {
      throw new Error(
        "Groups aren’t enabled in Firestore yet. Deploy the updated firestore.rules, then try again.",
      );
    }
    throw err;
  }

  let inviteCode: string | null;
  try {
    inviteCode = await allocateInviteCode();
  } catch (err) {
    if (isPermissionDenied(err)) {
      throw new Error(
        "Groups aren’t enabled in Firestore yet. Deploy the updated firestore.rules, then try again.",
      );
    }
    throw err;
  }
  if (!inviteCode) {
    throw new Error("Couldn’t generate an invite code. Try again.");
  }

  const now = new Date();
  const groupRef = doc(collection(db, "groups"));
  const memberRef = doc(db, "groups", groupRef.id, "members", user.uid);
  const inviteRef = doc(db, "inviteCodes", inviteCode);
  const indexRef = doc(
    db,
    "users",
    user.uid,
    "groupMemberships",
    groupRef.id,
  );

  const kind: GroupKind = options.kind === "buddy" ? "buddy" : "group";
  const group: AccountabilityGroupDoc = {
    name,
    createdBy: user.uid,
    createdAt: now,
    inviteCode,
    memberCount: 1,
    kind,
    maxMembers: kind === "buddy" ? GROUP_LIMITS.buddyMembers : GROUP_LIMITS.maxMembers,
  };
  const member = newMemberDoc(user, "owner", now, await currentWeeklyGoal(user.uid));
  const buddyNickname =
    kind === "buddy" ? options.buddyNickname?.trim().slice(0, GROUP_LIMITS.displayName) || null : null;

  try {
    // Group + invite first so member create rules can get() the group doc.
    const setup = writeBatch(db);
    setup.set(groupRef, groupDocToFirestore(group));
    setup.set(
      inviteRef,
      inviteCodeDocToFirestore({
        groupId: groupRef.id,
        createdBy: user.uid,
        createdAt: now,
        active: true,
      }),
    );
    await setup.commit();

    const membership = writeBatch(db);
    membership.set(memberRef, memberDocToFirestore(member));
    membership.set(
      indexRef,
      membershipIndexToFirestore({
        groupId: groupRef.id,
        nameSnapshot: name,
        role: "owner",
        joinedAt: now,
        buddyNickname,
      }),
    );
    await membership.commit();
  } catch (err) {
    if (isPermissionDenied(err)) {
      throw new Error(
        "Groups aren’t enabled in Firestore yet. Deploy the updated firestore.rules, then try again.",
      );
    }
    throw err;
  }

  void syncNewMembership();
  return { groupId: groupRef.id, inviteCode };
}

function isPermissionDenied(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const code = "code" in err ? String((err as { code: unknown }).code) : "";
  return code === "permission-denied" || code.includes("permission-denied");
}

/**
 * Joins by code without ever reading `groups/{groupId}` first — a prospective
 * joiner isn't a member yet, so `firestore.rules` denies that read (member-
 * only). Uses `increment()` so the security rule (`groupCoreUnchanged`'s
 * `memberCount <= 12`) enforces the capacity cap atomically instead of us
 * needing to read the current count to check it client-side. The group name
 * on the membership index is best-effort backfilled right after, once the
 * new member doc makes `isGroupMember` (and so the read) true.
 */
export async function joinAccountabilityGroupByCode(
  codeRaw: string,
): Promise<{ groupId: string } | null> {
  const db = getFirestoreDb();
  const user = getFirebaseAuth()?.currentUser;
  if (!db || !user) return null;

  const code = normalizeInviteCode(codeRaw);
  if (code.length < 6) return null;

  const membershipsSnap = await getDocs(
    collection(db, "users", user.uid, "groupMemberships"),
  );
  if (membershipsSnap.size >= GROUP_LIMITS.maxGroupsPerUser) return null;

  const inviteSnap = await getDoc(doc(db, "inviteCodes", code));
  if (!inviteSnap.exists()) return null;
  const invite = firestoreToInviteCodeDoc(
    inviteSnap.data() as Record<string, unknown>,
  );
  if (!invite || !invite.active) return null;

  const groupId = invite.groupId;
  const memberRef = doc(db, "groups", groupId, "members", user.uid);
  const existingMember = await getDoc(memberRef);
  if (existingMember.exists()) return { groupId };

  const now = new Date();
  const member = newMemberDoc(user, "member", now, await currentWeeklyGoal(user.uid));

  const gRef = doc(db, "groups", groupId);
  const membershipRef = doc(db, "users", user.uid, "groupMemberships", groupId);

  try {
    await runTransaction(db, async (tx) => {
      tx.set(memberRef, memberDocToFirestore(member));
      tx.set(
        membershipRef,
        membershipIndexToFirestore({
          groupId,
          // Placeholder — firestore.rules requires a non-empty string here.
          // Backfilled with the real name right after (see below).
          nameSnapshot: "Group",
          role: "member",
          joinedAt: now,
          buddyNickname: null,
        }),
      );
      tx.update(gRef, { memberCount: increment(1) });
    });
  } catch {
    return null;
  }

  try {
    const groupSnap = await getDoc(gRef);
    const group = groupSnap.exists()
      ? firestoreToGroupDoc(groupSnap.data() as Record<string, unknown>)
      : null;
    if (group) {
      await updateDoc(membershipRef, { nameSnapshot: group.name });
    }
  } catch {
    /* best-effort — the group page itself always reads the live name */
  }

  await syncNewMembership();
  return { groupId };
}

export async function leaveAccountabilityGroup(
  groupId: string,
): Promise<boolean> {
  const db = getFirestoreDb();
  const user = getFirebaseAuth()?.currentUser;
  if (!db || !user || !groupId) return false;

  const memberRef = doc(db, "groups", groupId, "members", user.uid);
  const memberSnap = await getDoc(memberRef);
  if (!memberSnap.exists()) return false;
  const member = firestoreToMemberDoc(
    memberSnap.data() as Record<string, unknown>,
  );
  if (!member) return false;

  if (member.role === "owner") {
    const membersSnap = await getDocs(
      collection(db, "groups", groupId, "members"),
    );
    if (membersSnap.size > 1) {
      // Owner must delete the group (or transfer) when others remain.
      return false;
    }
    return deleteAccountabilityGroup(groupId);
  }

  await runTransaction(db, async (tx) => {
    const gRef = doc(db, "groups", groupId);
    const gSnap = await tx.get(gRef);
    if (!gSnap.exists()) throw new Error("Group missing");
    const g = firestoreToGroupDoc(gSnap.data() as Record<string, unknown>);
    if (!g) throw new Error("Invalid group");
    tx.delete(memberRef);
    tx.delete(doc(db, "users", user.uid, "groupMemberships", groupId));
    tx.update(gRef, {
      memberCount: Math.max(0, g.memberCount - 1),
    });
  });
  return true;
}

export async function rotateGroupInviteCode(
  groupId: string,
): Promise<string | null> {
  const db = getFirestoreDb();
  const user = getFirebaseAuth()?.currentUser;
  if (!db || !user || !groupId) return null;

  const groupSnap = await getDoc(doc(db, "groups", groupId));
  if (!groupSnap.exists()) return null;
  const group = firestoreToGroupDoc(
    groupSnap.data() as Record<string, unknown>,
  );
  if (!group || group.createdBy !== user.uid) return null;

  const newCode = await allocateInviteCode();
  if (!newCode) return null;

  const now = new Date();
  const batch = writeBatch(db);
  if (group.inviteCode) {
    batch.set(
      doc(db, "inviteCodes", group.inviteCode),
      { active: false },
      { merge: true },
    );
  }
  batch.set(
    doc(db, "inviteCodes", newCode),
    inviteCodeDocToFirestore({
      groupId,
      createdBy: user.uid,
      createdAt: now,
      active: true,
    }),
  );
  batch.update(doc(db, "groups", groupId), { inviteCode: newCode });
  // The old link should stop showing anything to signed-out visitors too.
  if (group.inviteCode) batch.delete(doc(db, "invitePreviews", group.inviteCode));
  await batch.commit();
  return newCode;
}

export async function deleteAccountabilityGroup(
  groupId: string,
): Promise<boolean> {
  const db = getFirestoreDb();
  const user = getFirebaseAuth()?.currentUser;
  if (!db || !user || !groupId) return false;

  const groupSnap = await getDoc(doc(db, "groups", groupId));
  if (!groupSnap.exists()) return false;
  const group = firestoreToGroupDoc(
    groupSnap.data() as Record<string, unknown>,
  );
  if (!group || group.createdBy !== user.uid) return false;

  const membersSnap = await getDocs(
    collection(db, "groups", groupId, "members"),
  );

  const batch = writeBatch(db);
  for (const m of membersSnap.docs) {
    batch.delete(m.ref);
    batch.delete(doc(db, "users", m.id, "groupMemberships", groupId));
  }
  if (group.inviteCode) {
    batch.set(
      doc(db, "inviteCodes", group.inviteCode),
      { active: false },
      { merge: true },
    );
    batch.delete(doc(db, "invitePreviews", group.inviteCode));
  }
  batch.delete(doc(db, "groups", groupId));
  await batch.commit();
  return true;
}

/**
 * Best-effort: recompute show-up signals from the user's sessions and push
 * them onto every group membership. Always recomputes from source (never
 * increments a stored value), so a deleted, moved, reopened, or backdated
 * session self-heals the roster instead of leaving stale drift behind.
 *
 * The roster streak counts consecutive **weeks** meeting the member's own
 * weekly goal, not consecutive days — someone who works out 3x/week on
 * schedule should show a real streak, not reset to 1 every time a day is
 * skipped. See `goalWeekStreak`.
 *
 * Failures are swallowed so workout save is never blocked.
 */
export async function bumpGroupWorkoutSignals(): Promise<void> {
  const db = getFirestoreDb();
  const user = getFirebaseAuth()?.currentUser;
  if (!db || !user) return;

  const membershipsSnap = await getDocs(
    collection(db, "users", user.uid, "groupMemberships"),
  );
  if (membershipsSnap.empty) return;

  const [signals, weeklyGoal] = await Promise.all([
    computeUserWorkoutSignals(user.uid),
    currentWeeklyGoal(user.uid),
  ]);
  const todayKey = localDateKeyFromMs(Date.now());
  const rosterStreak = goalWeekStreak(signals.activityByDay, weeklyGoal, todayKey).current;
  // Days and the workout name only — never sets, weights or notes.
  const trainedDays = trainedDaysThisAndLastWeek(signals.activityByDay, todayKey).slice(
    -GROUP_LIMITS.trainedDaysMax,
  );
  const lastWorkoutLabel = signals.lastWorkoutLabel?.slice(0, GROUP_LIMITS.workoutLabel) ?? null;

  await Promise.all(
    membershipsSnap.docs.map(async (membershipDoc) => {
      try {
        const memberRef = doc(db, "groups", membershipDoc.id, "members", user.uid);
        await updateDoc(memberRef, {
          lastWorkoutDateKey: signals.lastWorkoutDateKey,
          lastWorkoutAt: signals.lastWorkoutAt,
          currentStreak: rosterStreak,
          workoutsThisWeek: signals.workoutsThisWeek,
          displayName: displayNameFromAuth(user),
          weeklyGoal,
          trainedDays,
          lastWorkoutLabel,
        });
      } catch {
        /* best-effort per group */
      }
    }),
  );
}

/**
 * Push a changed weekly goal onto the user's member doc in every group, so
 * rosters show progress against the goal the user actually set.
 */
export async function syncWeeklyGoalToGroups(
  weeklyGoal: WeeklyGoalTarget,
): Promise<void> {
  const db = getFirestoreDb();
  const user = getFirebaseAuth()?.currentUser;
  if (!db || !user) return;

  const membershipsSnap = await getDocs(
    collection(db, "users", user.uid, "groupMemberships"),
  );

  await Promise.all(
    membershipsSnap.docs.map(async (membershipDoc) => {
      try {
        await updateDoc(
          doc(db, "groups", membershipDoc.id, "members", user.uid),
          { weeklyGoal },
        );
      } catch {
        /* best-effort per group */
      }
    }),
  );
}

export async function renameAccountabilityGroup(
  groupId: string,
  nameRaw: string,
): Promise<boolean> {
  const db = getFirestoreDb();
  const user = getFirebaseAuth()?.currentUser;
  if (!db || !user || !groupId) return false;
  const name = nameRaw.trim().slice(0, GROUP_LIMITS.name);
  if (!name) return false;

  const groupSnap = await getDoc(doc(db, "groups", groupId));
  if (!groupSnap.exists()) return false;
  const group = firestoreToGroupDoc(
    groupSnap.data() as Record<string, unknown>,
  );
  if (!group || group.createdBy !== user.uid) return false;

  await updateDoc(doc(db, "groups", groupId), { name });

  // Rename membership indexes best-effort (other users' docs may fail rules).
  const membersSnap = await getDocs(
    collection(db, "groups", groupId, "members"),
  );
  await Promise.all(
    membersSnap.docs.map(async (m) => {
      try {
        await updateDoc(doc(db, "users", m.id, "groupMemberships", groupId), {
          nameSnapshot: name,
        });
      } catch {
        /* other users' indexes stay stale until they open the group */
      }
    }),
  );
  return true;
}

export type SavedCheer = {
  id: string;
  cheer: CheerDoc;
};

/** Live cheers for a single local day, so the roster can show who's been cheered without a workout-detail read. */
export function subscribeGroupCheersForDay(
  groupId: string,
  dateKey: string,
  onCheers: (rows: SavedCheer[]) => void,
): () => void {
  const db = getFirestoreDb();
  if (!db || !groupId || !dateKey) {
    onCheers([]);
    return () => {};
  }

  const q = query(
    collection(db, "groups", groupId, "cheers"),
    where("dateKey", "==", dateKey),
  );
  return onSnapshot(
    q,
    (snap) => {
      const out: SavedCheer[] = [];
      for (const d of snap.docs) {
        const cheer = firestoreToCheerDoc(d.data() as Record<string, unknown>);
        if (cheer) out.push({ id: d.id, cheer });
      }
      onCheers(out);
    },
    () => onCheers([]),
  );
}

/** Toggles today's cheer from the signed-in user to a groupmate. */
export async function toggleGroupCheer(
  groupId: string,
  toUid: string,
  dateKey: string,
): Promise<boolean> {
  const db = getFirestoreDb();
  const user = getFirebaseAuth()?.currentUser;
  if (!db || !user || !groupId || !toUid || toUid === user.uid) return false;

  const id = cheerDocId({ dateKey, toUid, fromUid: user.uid });
  const ref = doc(db, "groups", groupId, "cheers", id);
  try {
    const existing = await getDoc(ref);
    if (existing.exists()) {
      await deleteDoc(ref);
      return false;
    }
    const cheer: CheerDoc = {
      groupId,
      toUid,
      fromUid: user.uid,
      dateKey,
      createdAt: new Date(),
    };
    await setDoc(ref, cheerDocToFirestore(cheer));
    return true;
  } catch {
    return false;
  }
}

/**
 * "Turn this into a group": raises a buddy's cap to 12. Owner only (rules
 * check it). Nothing else changes, so the week and plans carry over.
 */
export async function convertBuddyToGroup(groupId: string, nameRaw: string): Promise<boolean> {
  const db = getFirestoreDb();
  const user = getFirebaseAuth()?.currentUser;
  if (!db || !user || !groupId) return false;
  const name = nameRaw.trim().slice(0, GROUP_LIMITS.name);
  if (!name) return false;
  try {
    await updateDoc(doc(db, "groups", groupId), {
      kind: "group",
      maxMembers: GROUP_LIMITS.maxMembers,
      name,
    });
    await updateDoc(doc(db, "users", user.uid, "groupMemberships", groupId), {
      nameSnapshot: name,
      buddyNickname: null,
    });
    return true;
  } catch {
    return false;
  }
}

/** Live group doc (name, count, code), so renames and joins show up without a reload. */
export function subscribeAccountabilityGroup(
  groupId: string,
  onGroup: (row: SavedGroup | null) => void,
): () => void {
  const db = getFirestoreDb();
  if (!db || !groupId) {
    onGroup(null);
    return () => {};
  }
  return onSnapshot(
    doc(db, "groups", groupId),
    (snap) => {
      const group = snap.exists() ? firestoreToGroupDoc(snap.data() as Record<string, unknown>) : null;
      onGroup(group ? { id: snap.id, group } : null);
    },
    () => onGroup(null),
  );
}

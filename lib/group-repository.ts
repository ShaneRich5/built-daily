import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import { getFirebaseAuth, getFirestoreDb } from "@/lib/firebase";
import {
  displayNameFromAuth,
  firestoreToGroupDoc,
  firestoreToInviteCodeDoc,
  firestoreToMemberDoc,
  firestoreToMembershipIndex,
  generateInviteCode,
  groupDocToFirestore,
  inviteCodeDocToFirestore,
  memberDocToFirestore,
  membershipIndexToFirestore,
  nextStreakAfterWorkout,
  normalizeInviteCode,
} from "@/lib/group-mapper";
import {
  GROUP_LIMITS,
  type AccountabilityGroupDoc,
  type GroupMemberDoc,
  type GroupMembershipIndexDoc,
} from "@/lib/group-types";
import { localDateKeyFromMs } from "@/lib/workout-date";

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

export async function createAccountabilityGroup(
  nameRaw: string,
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

  const group: AccountabilityGroupDoc = {
    name,
    createdBy: user.uid,
    createdAt: now,
    inviteCode,
    memberCount: 1,
  };
  const member: GroupMemberDoc = {
    uid: user.uid,
    displayName: displayNameFromAuth(user),
    role: "owner",
    joinedAt: now,
    lastWorkoutDateKey: null,
    lastWorkoutAt: null,
    currentStreak: 0,
  };

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

  return { groupId: groupRef.id, inviteCode };
}

function isPermissionDenied(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const code = "code" in err ? String((err as { code: unknown }).code) : "";
  return code === "permission-denied" || code.includes("permission-denied");
}

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
  const existingMember = await getDoc(
    doc(db, "groups", groupId, "members", user.uid),
  );
  if (existingMember.exists()) return { groupId };

  const groupSnap = await getDoc(doc(db, "groups", groupId));
  if (!groupSnap.exists()) return null;
  const group = firestoreToGroupDoc(
    groupSnap.data() as Record<string, unknown>,
  );
  if (!group) return null;
  if (group.memberCount >= GROUP_LIMITS.maxMembers) return null;

  const now = new Date();
  const member: GroupMemberDoc = {
    uid: user.uid,
    displayName: displayNameFromAuth(user),
    role: "member",
    joinedAt: now,
    lastWorkoutDateKey: null,
    lastWorkoutAt: null,
    currentStreak: 0,
  };

  await runTransaction(db, async (tx) => {
    const gRef = doc(db, "groups", groupId);
    const gSnap = await tx.get(gRef);
    if (!gSnap.exists()) throw new Error("Group missing");
    const g = firestoreToGroupDoc(gSnap.data() as Record<string, unknown>);
    if (!g) throw new Error("Invalid group");
    if (g.memberCount >= GROUP_LIMITS.maxMembers) {
      throw new Error("Group full");
    }
    const inviteFresh = await tx.get(doc(db, "inviteCodes", code));
    if (!inviteFresh.exists()) throw new Error("Invite missing");
    const inviteDoc = firestoreToInviteCodeDoc(
      inviteFresh.data() as Record<string, unknown>,
    );
    if (!inviteDoc?.active) throw new Error("Invite inactive");

    tx.set(
      doc(db, "groups", groupId, "members", user.uid),
      memberDocToFirestore(member),
    );
    tx.set(
      doc(db, "users", user.uid, "groupMemberships", groupId),
      membershipIndexToFirestore({
        groupId,
        nameSnapshot: g.name,
        role: "member",
        joinedAt: now,
      }),
    );
    tx.update(gRef, { memberCount: g.memberCount + 1 });
  });

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
  }
  batch.delete(doc(db, "groups", groupId));
  await batch.commit();
  return true;
}

/**
 * Best-effort: bump last-workout + streak on every group membership after a finish.
 * Failures are swallowed so workout save is never blocked.
 */
export async function bumpGroupWorkoutSignals(options: {
  workoutDateKey: string;
  workoutAtMs: number;
}): Promise<void> {
  const db = getFirestoreDb();
  const user = getFirebaseAuth()?.currentUser;
  if (!db || !user) return;

  const membershipsSnap = await getDocs(
    collection(db, "users", user.uid, "groupMemberships"),
  );
  if (membershipsSnap.empty) return;

  const workoutAt = new Date(options.workoutAtMs);
  const dateKey =
    options.workoutDateKey || localDateKeyFromMs(options.workoutAtMs);

  await Promise.all(
    membershipsSnap.docs.map(async (membershipDoc) => {
      try {
        const groupId = membershipDoc.id;
        const memberRef = doc(db, "groups", groupId, "members", user.uid);
        const memberSnap = await getDoc(memberRef);
        if (!memberSnap.exists()) return;
        const member = firestoreToMemberDoc(
          memberSnap.data() as Record<string, unknown>,
        );
        if (!member) return;

        const currentStreak = nextStreakAfterWorkout(
          member.lastWorkoutDateKey,
          member.currentStreak,
          dateKey,
        );

        await updateDoc(memberRef, {
          lastWorkoutDateKey: dateKey,
          lastWorkoutAt: workoutAt,
          currentStreak,
          displayName: displayNameFromAuth(user),
        });
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

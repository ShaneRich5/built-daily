/** Mock "Morning Crew" for stories: week of Sun Nov 8 – Sat Nov 14 2026, today Tue Nov 10. */
import type { GroupMemberDoc, SharedPlanDoc } from "@/lib/group-types";
import type { SharedSet, SharedWorkout } from "@/lib/shared-workouts";
import type {
  GroupMemberRow,
  GroupPlanRow,
} from "@/features/groups/groups-model";

export const TODAY = "2026-11-10";
export const ME = "u-sam";

function member(
  uid: string,
  displayName: string,
  trainedDays: string[],
  upcoming: [string, string][],
  extra: Partial<GroupMemberDoc> = {},
): GroupMemberRow {
  const last = trainedDays[trainedDays.length - 1] ?? null;
  return {
    id: uid,
    member: {
      uid,
      displayName,
      role: uid === ME ? "owner" : "member",
      joinedAt: new Date("2026-10-03T12:00:00"),
      lastWorkoutDateKey: last,
      lastWorkoutAt: last ? new Date(`${last}T07:30:00`) : null,
      currentStreak: 3,
      weeklyGoal: 3,
      workoutsThisWeek: trainedDays.filter((d) => d >= "2026-11-08").length,
      trainedDays,
      lastWorkoutLabel: null,
      upcomingPlans: upcoming.map(([dateKey, label]) => ({ dateKey, label })),
      sharesWorkouts: false,
      ...extra,
    },
  };
}

export const crew: GroupMemberRow[] = [
  member(
    ME,
    "Sam Rivera",
    ["2026-11-09"],
    [
      ["2026-11-12", "Leg day"],
      ["2026-11-14", "Pull day"],
    ],
  ),
  member(
    "u-maya",
    "Maya Chen",
    ["2026-11-08", "2026-11-10"],
    [["2026-11-13", "Pull day"]],
    { lastWorkoutLabel: "Push day", sharesWorkouts: true },
  ),
  member(
    "u-priya",
    "Priya Patel",
    ["2026-11-09", "2026-11-10"],
    [["2026-11-12", "Leg day"]],
    { lastWorkoutLabel: "Run" },
  ),
  member(
    "u-jordan",
    "Jordan Lee",
    ["2026-11-08"],
    [["2026-11-13", "Pull day"]],
  ),
  member(
    "u-dev",
    "Dev Kapoor",
    [],
    [
      ["2026-11-10", "Full body"],
      ["2026-11-12", "Run"],
    ],
    { weeklyGoal: 2 },
  ),
  member("u-alex", "Alex Kim", ["2026-11-09"], []),
];

function plan(
  id: string,
  p: Partial<SharedPlanDoc> &
    Pick<SharedPlanDoc, "dateKey" | "label" | "going" | "createdBy">,
): GroupPlanRow {
  return {
    id,
    plan: {
      groupId: "g-crew",
      time: null,
      where: null,
      exercises: [],
      note: null,
      createdByName:
        crew.find((m) => m.member.uid === p.createdBy)?.member.displayName ??
        "Member",
      goingAt: Object.fromEntries(
        p.going.map((uid) => [uid, new Date("2026-11-09T19:00:00")]),
      ),
      createdAt: new Date("2026-11-08T18:00:00"),
      ...p,
    },
  };
}

export const crewPlans: GroupPlanRow[] = [
  plan("p-legs", {
    dateKey: "2026-11-12",
    time: "06:30",
    where: "Iron Works Gym",
    label: "Leg day",
    note: "Meet by the squat racks, I’ll grab a bar.",
    createdBy: "u-priya",
    going: ["u-priya", ME],
    exercises: [
      { id: "squat", name: "Back squat", sets: 4 },
      { id: "rdl", name: "Romanian deadlift", sets: 3 },
      { id: "lunge", name: "Walking lunge", sets: 3 },
      { id: "plank", name: "Plank", sets: 3 },
    ],
  }),
  plan("p-pull", {
    dateKey: "2026-11-13",
    time: "18:00",
    label: "Pull day",
    createdBy: "u-maya",
    going: ["u-maya", "u-jordan"],
  }),
];

export const templates = [
  {
    id: "legs",
    name: "Leg day",
    exercises: [
      { id: "squat", name: "Back squat", sets: 4 },
      { id: "rdl", name: "Romanian deadlift", sets: 3 },
    ],
  },
  {
    id: "push",
    name: "Push day",
    exercises: [{ id: "bench", name: "Bench press", sets: 4 }],
  },
  {
    id: "pull",
    name: "Pull day",
    exercises: [{ id: "row", name: "Barbell row", sets: 4 }],
  },
];

/** Sam & Alex as gym buddies. */
export const buddyPair: GroupMemberRow[] = [
  member(ME, "Sam Rivera", ["2026-11-09"], [["2026-11-14", "Pull day"]], {
    currentStreak: 5,
  }),
  member(
    "u-alex",
    "Alex Kim",
    ["2026-11-08", "2026-11-09"],
    [["2026-11-14", "Pull day"]],
    { currentStreak: 6 },
  ),
];

function sets(n: number, weight: number | null, reps: number): SharedSet[] {
  return Array.from({ length: n }, () => ({
    weight,
    reps,
    durationSec: null,
    timedSetSec: null,
    paceMph: null,
    inclinePercent: null,
    resistanceLevel: null,
    distanceMiles: null,
  }));
}

/** What Maya shares with the crew (she opted in). */
export const mayaWorkouts: SharedWorkout[] = [
  {
    id: "s-push",
    kind: "workout",
    dateKey: "2026-11-10",
    title: "Push day",
    durationMin: 48,
    distanceMiles: null,
    atMs: new Date("2026-11-10T07:30:00").getTime(),
    exercises: [
      { name: "Bench press", metric: "weight_reps", sets: sets(3, 95, 8) },
      {
        name: "Incline dumbbell press",
        metric: "weight_reps",
        sets: [...sets(2, 30, 10), ...sets(1, 35, 8)],
      },
      { name: "Push-up", metric: "bodyweight_reps", sets: sets(2, null, 15) },
    ],
  },
  {
    id: "activity-run",
    kind: "activity",
    dateKey: "2026-11-08",
    title: "Run",
    durationMin: 25,
    distanceMiles: 2.4,
    atMs: new Date("2026-11-08T08:00:00").getTime(),
    exercises: [],
  },
  {
    id: "s-legs",
    kind: "workout",
    dateKey: "2026-11-05",
    title: "Leg day",
    durationMin: 55,
    distanceMiles: null,
    atMs: new Date("2026-11-05T18:10:00").getTime(),
    exercises: [
      { name: "Back squat", metric: "weight_reps", sets: sets(4, 115, 6) },
      {
        name: "Romanian deadlift",
        metric: "weight_reps",
        sets: sets(3, 95, 10),
      },
    ],
  },
];

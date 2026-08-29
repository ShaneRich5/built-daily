"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ActiveWorkoutView } from "@/components/active-workout-view";
import { useAuth } from "@/components/auth-provider";
import { FinishConfetti } from "@/components/finish-confetti";
import { WorkoutSavedExport } from "@/components/workout-saved-export";
import {
  resolveExercisesFromUrl,
  type CatalogExercise,
} from "@/lib/exercise-catalog";
import {
  buildWorkoutSessionDoc,
  createLineId,
  setLogToUiSetRow,
  type ActiveWorkoutFinishSnapshot,
  type UiSetRow,
} from "@/lib/workout-session-mapper";
import { getWorkoutPlan } from "@/lib/workout-plan-repository";
import {
  createInProgressWorkoutSession,
  deleteWorkoutSession,
  getWorkoutSession,
  saveCompletedWorkoutSession,
  upsertWorkoutSession,
} from "@/lib/workout-session-repository";
import type { WorkoutPlanDoc, WorkoutSessionDoc } from "@/lib/workout-types";
import {
  isDefaultWorkoutTitle,
  localDateKeyFromMs,
} from "@/lib/workout-date";

const QUERY_EXERCISES = "e";
const QUERY_TITLE = "t";
const QUERY_PLAN = "p";
const QUERY_SESSION = "s";

type ResumeBundle = {
  sessionId: string;
  title: string;
  titleIsCustom: boolean;
  workoutDate: string | null;
  workoutTime: string | null;
  planId: string | null;
  exercises: CatalogExercise[];
  lineIds: string[];
  setsByExercise: UiSetRow[][];
  workoutNote: string;
  exerciseNotesById: Record<string, string>;
  activeDurationMs: number;
  sessionStartedAtMs: number;
};

function emptyUiSet(): UiSetRow {
  return {
    weight: "",
    reps: "",
    seconds: "",
    timedSetSec: "",
    paceMph: "",
    inclinePercent: "",
    resistanceLevel: "",
    distanceMiles: "",
    note: "",
  };
}

function sessionToResumeBundle(
  sessionId: string,
  session: WorkoutSessionDoc,
): ResumeBundle {
  const exercises: CatalogExercise[] = session.lines.map((line) => ({
    id: line.exerciseId,
    name: line.nameSnapshot,
    metric: line.metric,
  }));
  const lineIds = session.lines.map((l) => l.lineId);
  const setsByExercise = session.lines.map((line) =>
    line.sets.length > 0 ? line.sets.map(setLogToUiSetRow) : [emptyUiSet()],
  );
  const exerciseNotesById: Record<string, string> = {};
  for (const line of session.lines) {
    const n = session.exerciseNotesByLineId?.[line.lineId];
    if (n) exerciseNotesById[line.exerciseId] = n;
  }
  return {
    sessionId,
    title: session.title,
    titleIsCustom: !isDefaultWorkoutTitle(
      session.title,
      session.workoutDate,
      session.startedAt.getTime(),
    ),
    workoutDate: session.workoutDate,
    workoutTime: session.workoutTime,
    planId: session.planId,
    exercises,
    lineIds,
    setsByExercise,
    workoutNote: session.workoutNote ?? "",
    exerciseNotesById,
    activeDurationMs:
      session.activeDurationSec != null && session.activeDurationSec > 0
        ? session.activeDurationSec * 1000
        : 0,
    sessionStartedAtMs: session.startedAt.getTime(),
  };
}

export function ActiveWorkoutFromUrl() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, firebaseReady } = useAuth();

  const sessionIdParam = searchParams.get(QUERY_SESSION)?.trim() || null;

  const { title, titleIsCustom, ids, planId } = useMemo(() => {
    const raw = searchParams.get(QUERY_EXERCISES);
    const titleParam = searchParams.get(QUERY_TITLE);
    const planParam = searchParams.get(QUERY_PLAN);
    const parsedIds = raw
      ? raw
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : [];
    const hasCustomTitle = Boolean(titleParam && titleParam.trim().length > 0);
    const titleResolved = hasCustomTitle ? titleParam!.trim() : "";
    const planResolved =
      planParam && planParam.trim().length > 0 ? planParam.trim() : null;
    return {
      title: titleResolved,
      titleIsCustom: hasCustomTitle,
      ids: parsedIds,
      planId: planResolved,
    };
  }, [searchParams]);

  // Always load a saved template. Catalog-only templates still contain useful
  // defaults such as target sets and exercise notes.
  const needsPlanFetch = Boolean(
    !sessionIdParam && planId && !planId.startsWith("starter-"),
  );

  const fetchKey =
    needsPlanFetch && planId ? `${planId}:${ids.join(",")}` : "";

  const [planLoad, setPlanLoad] = useState<{
    key: string;
    doc: WorkoutPlanDoc | null;
  } | null>(null);
  const [resumeLoad, setResumeLoad] = useState<{
    sessionId: string;
    resume: ResumeBundle | null;
  } | null>(null);
  const resume: ResumeBundle | null | "loading" = sessionIdParam
    ? resumeLoad?.sessionId === sessionIdParam
      ? resumeLoad.resume
      : "loading"
    : null;
  const [liveSessionId, setLiveSessionId] = useState<string | null>(
    sessionIdParam,
  );
  const [creating, setCreating] = useState(false);
  const [savedSession, setSavedSession] = useState<{
    session: WorkoutSessionDoc;
    persisted: boolean;
  } | null>(null);
  const [celebrateFinish, setCelebrateFinish] = useState(false);
  const createOnceRef = useRef(false);

  useEffect(() => {
    if (!fetchKey || !planId) return;
    let cancelled = false;
    void getWorkoutPlan(planId).then((res) => {
      if (!cancelled) {
        setPlanLoad({ key: fetchKey, doc: res?.plan ?? null });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [fetchKey, planId]);

  useEffect(() => {
    if (!sessionIdParam) return;
    if (!firebaseReady || !user) return;

    let cancelled = false;
    void getWorkoutSession(sessionIdParam).then(async (res) => {
      if (cancelled) return;
      if (!res) {
        setResumeLoad({ sessionId: sessionIdParam, resume: null });
        return;
      }
      let session = res.session;
      if (session.status === "completed") {
        const saved = await upsertWorkoutSession(res.id, {
          ...session,
          status: "in_progress",
          endedAt: null,
        });
        if (saved) session = saved;
      }
      if (cancelled) return;
      setResumeLoad({
        sessionId: sessionIdParam,
        resume: sessionToResumeBundle(res.id, session),
      });
      setLiveSessionId(res.id);
    });
    return () => {
      cancelled = true;
    };
  }, [sessionIdParam, user, firebaseReady]);

  const planReady = !needsPlanFetch || planLoad?.key === fetchKey;

  const urlExercises = useMemo(() => {
    if (sessionIdParam) return null;
    if (!planReady) return null;
    const lines = needsPlanFetch ? (planLoad?.doc?.lines ?? null) : null;
    return resolveExercisesFromUrl(ids, lines);
  }, [sessionIdParam, planReady, needsPlanFetch, planLoad, ids]);

  const planDefaults = useMemo(() => {
    const plan = needsPlanFetch ? planLoad?.doc : null;
    const notes: Record<string, string> = {};
    const setsByExercise = (urlExercises ?? []).map((exercise) => {
      const line = plan?.lines.find(
        (candidate) => candidate.exerciseId === exercise.id,
      );
      if (line?.notes) notes[exercise.id] = line.notes;
      const targetSets = Math.max(1, Math.min(99, line?.targetSets ?? 1));
      return Array.from({ length: targetSets }, emptyUiSet);
    });
    return { notes, setsByExercise };
  }, [needsPlanFetch, planLoad, urlExercises]);

  useEffect(() => {
    if (sessionIdParam) return;
    if (urlExercises === null) return;
    if (!firebaseReady || !user) return;
    if (createOnceRef.current) return;
    createOnceRef.current = true;
    setCreating(true);

    const lineIds = urlExercises.map(() => createLineId());
    const startedAtMs = Date.now();
    const snap: ActiveWorkoutFinishSnapshot = {
      title: titleIsCustom ? title : "",
      workoutDate: localDateKeyFromMs(startedAtMs),
      workoutTime: "",
      exercises: urlExercises,
      setsByExercise: planDefaults.setsByExercise,
      workoutNote: "",
      exerciseNotesByExerciseId: planDefaults.notes,
      activeDurationMs: 0,
      sessionStartedAtMs: startedAtMs,
      planId,
      lineIds,
    };

    void createInProgressWorkoutSession(snap)
      .then((created) => {
        if (!created) {
          setCreating(false);
          return;
        }
        setLiveSessionId(created.id);
        router.replace(
          `/workout?${QUERY_SESSION}=${encodeURIComponent(created.id)}`,
        );
      })
      .catch(() => {
        setCreating(false);
      });
  }, [
    sessionIdParam,
    urlExercises,
    firebaseReady,
    user,
    title,
    titleIsCustom,
    planId,
    planDefaults,
    router,
  ]);

  const handlePersist = useCallback(
    async (snapshot: ActiveWorkoutFinishSnapshot) => {
      if (!liveSessionId) return;
      const docData = buildWorkoutSessionDoc(snapshot, {
        status: "in_progress",
        endedAt: null,
      });
      await upsertWorkoutSession(liveSessionId, docData);
    },
    [liveSessionId],
  );

  const handleFinish = useCallback(
    async (snapshot: ActiveWorkoutFinishSnapshot) => {
      setCelebrateFinish(true);
      const resumePlanId =
        resume && resume !== "loading" ? resume.planId : null;
      const withPlan: ActiveWorkoutFinishSnapshot = {
        ...snapshot,
        planId: resumePlanId ?? planId ?? snapshot.planId,
      };
      try {
        const saved = await saveCompletedWorkoutSession(
          withPlan,
          liveSessionId,
        );
        if (saved) {
          setSavedSession({ session: saved.doc, persisted: true });
          return;
        }
      } catch {
        /* still offer journal export */
      }
      setSavedSession({
        session: buildWorkoutSessionDoc(withPlan, {
          status: "completed",
          endedAt: new Date(),
        }),
        persisted: false,
      });
    },
    [planId, liveSessionId, resume],
  );

  const handleExportDone = useCallback(() => {
    router.push("/");
  }, [router]);

  const handleDiscard = useCallback(async () => {
    if (liveSessionId) {
      try {
        await deleteWorkoutSession(liveSessionId);
      } catch {
        /* still leave the screen */
      }
    }
    router.push("/");
  }, [liveSessionId, router]);

  let main: ReactNode;

  if (savedSession) {
    main = (
      <WorkoutSavedExport
        session={savedSession.session}
        persisted={savedSession.persisted}
        onDone={handleExportDone}
      />
    );
  } else if (sessionIdParam) {
    if (!firebaseReady || !user || resume === "loading") {
      main = (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 py-12">
          <p className="text-sm text-muted-foreground">Loading workout…</p>
          {!user && firebaseReady ? (
            <Link
              href="/login"
              className="inline-flex h-11 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground"
            >
              Sign in
            </Link>
          ) : null}
        </div>
      );
    } else if (!resume) {
      main = (
        <div className="flex flex-1 flex-col gap-4 py-2">
          <p className="text-sm text-muted-foreground">
            Could not find this workout.
          </p>
          <Link
            href="/"
            className="inline-flex h-11 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground"
          >
            Back to home
          </Link>
        </div>
      );
    } else {
      main = (
        <ActiveWorkoutView
          key={resume.sessionId}
          title={resume.title}
          titleIsCustom={resume.titleIsCustom}
          initialWorkoutDate={resume.workoutDate}
          initialWorkoutTime={resume.workoutTime}
          exercises={resume.exercises}
          planId={resume.planId}
          initialLineIds={resume.lineIds}
          initialSetsByExercise={resume.setsByExercise}
          initialWorkoutNote={resume.workoutNote}
          initialExerciseNotesById={resume.exerciseNotesById}
          initialActiveDurationMs={resume.activeDurationMs}
          sessionStartedAtMs={resume.sessionStartedAtMs}
          onPersist={handlePersist}
          onFinish={handleFinish}
          onDiscard={liveSessionId ? handleDiscard : undefined}
        />
      );
    }
  } else if (needsPlanFetch && !planReady) {
    main = (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 py-12">
        <p className="text-sm text-muted-foreground">Loading workout…</p>
      </div>
    );
  } else if (urlExercises === null) {
    main = (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 py-12">
        <p className="text-sm text-muted-foreground">Loading workout…</p>
      </div>
    );
  } else if (ids.length > 0 && urlExercises.length === 0) {
    main = (
      <div className="flex flex-1 flex-col gap-4 py-2">
        <p className="text-sm text-muted-foreground">
          Could not resolve these exercises. If this template uses custom moves,
          sign in and try starting again from home.
        </p>
        <Link
          href="/"
          className="inline-flex h-11 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground"
        >
          Back to home
        </Link>
      </div>
    );
  } else if (user && firebaseReady && creating) {
    main = (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 py-12">
        <p className="text-sm text-muted-foreground">Starting workout…</p>
      </div>
    );
  } else {
    main = (
      <ActiveWorkoutView
        key={liveSessionId ?? `local:${ids.join(",") || "empty"}`}
        title={title}
        titleIsCustom={titleIsCustom}
        exercises={urlExercises}
        planId={planId}
        initialSetsByExercise={planDefaults.setsByExercise}
        initialExerciseNotesById={planDefaults.notes}
        onPersist={liveSessionId ? handlePersist : undefined}
        onFinish={handleFinish}
        onDiscard={liveSessionId ? handleDiscard : undefined}
      />
    );
  }

  return (
    <>
      {celebrateFinish ? <FinishConfetti /> : null}
      {main}
    </>
  );
}

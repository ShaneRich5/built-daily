"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import {
  addDaysToDateKey,
  endOfWeekDateKey,
  startOfWeekDateKey,
} from "@/lib/calendar-views";
import {
  markChallengeCompleted,
  subscribeChallengesEndingSince,
} from "@/lib/challenge-repository";
import type { SavedChallenge } from "@/lib/challenge-types";
import { subscribeDailyMetricsInRange } from "@/lib/daily-metric-repository";
import type { DailyMetricsDoc } from "@/lib/daily-metric-types";
import {
  ENDED_VISIBLE_DAYS,
  buildStepChallengeCardView,
  pickHomeChallenge,
} from "@/features/step-challenge/step-challenge-model";

type RawChallengeData = {
  challenges: SavedChallenge[];
  days: Record<string, DailyMetricsDoc>;
};

const EMPTY: RawChallengeData = { challenges: [], days: {} };

/**
 * The challenge Home shows and the step days behind it, live from Firestore.
 * Also records `completedAt` the first time the shown challenge is done.
 */
export function useStepChallenge(todayKey: string) {
  const { user, firebaseReady } = useAuth();
  const signedIn = Boolean(user) && firebaseReady;
  const [raw, setRaw] = useState<RawChallengeData>(EMPTY);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!signedIn) return;
    const patch = (next: Partial<RawChallengeData>) =>
      setRaw((prev) => ({ ...prev, ...next }));
    // Last week and this week: enough for the running challenge or one that just ended.
    const weekStart = startOfWeekDateKey(todayKey);
    const unsubs = [
      subscribeChallengesEndingSince(
        addDaysToDateKey(todayKey, -ENDED_VISIBLE_DAYS),
        (challenges) => {
          patch({ challenges });
          setLoaded(true);
        },
      ),
      subscribeDailyMetricsInRange(
        addDaysToDateKey(weekStart, -7),
        endOfWeekDateKey(todayKey),
        (days) => patch({ days }),
      ),
    ];
    return () => {
      for (const unsub of unsubs) unsub();
      setRaw(EMPTY);
      setLoaded(false);
    };
  }, [signedIn, todayKey]);

  const { shown, upcoming } = useMemo(
    () => pickHomeChallenge(raw.challenges, todayKey),
    [raw.challenges, todayKey],
  );
  const view = useMemo(
    () =>
      shown
        ? buildStepChallengeCardView(shown, raw.days, todayKey, upcoming)
        : null,
    [shown, raw.days, todayKey, upcoming],
  );

  // Write `completedAt` once per challenge version; derived progress stays the source of truth.
  const markedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!shown || view?.state !== "done" || shown.challenge.completedAt) return;
    const key = `${shown.id}:${shown.challenge.updatedAt.getTime()}`;
    if (markedRef.current === key) return;
    markedRef.current = key;
    markChallengeCompleted(shown.id).catch(() => {
      markedRef.current = null;
    });
  }, [shown, view?.state]);

  return { loaded, shown, upcoming, view, days: raw.days };
}

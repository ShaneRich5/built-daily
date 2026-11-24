"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import {
  addDaysToDateKey,
  endOfMonthDateKey,
  endOfWeekDateKey,
  startOfMonthDateKey,
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
    // Enough days for a running week or month, or one that ended in the last
    // few days: from last week or last month (whichever starts first)
    // through the end of this week or month (whichever ends last).
    const lastWeekStart = addDaysToDateKey(startOfWeekDateKey(todayKey), -7);
    const endedMonthStart = startOfMonthDateKey(
      addDaysToDateKey(todayKey, -ENDED_VISIBLE_DAYS),
    );
    const weekEnd = endOfWeekDateKey(todayKey);
    const monthEnd = endOfMonthDateKey(todayKey);
    const rangeStart =
      lastWeekStart < endedMonthStart ? lastWeekStart : endedMonthStart;
    const rangeEnd = weekEnd > monthEnd ? weekEnd : monthEnd;
    const unsubs = [
      subscribeChallengesEndingSince(
        addDaysToDateKey(todayKey, -ENDED_VISIBLE_DAYS),
        (challenges) => {
          patch({ challenges });
          setLoaded(true);
        },
      ),
      subscribeDailyMetricsInRange(rangeStart, rangeEnd, (days) =>
        patch({ days }),
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

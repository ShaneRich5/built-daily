"use client";

import { useCallback, useEffect, useState } from "react";

export type SessionTimerPhase = "idle" | "running" | "paused";

export type SessionTimer = {
  phase: SessionTimerPhase;
  elapsedMs: number;
  start: () => void;
  pause: () => void;
  reset: () => void;
};

/** Optional whole-workout stopwatch. Resumes paused when a session already has time. */
export function useSessionTimer(initialMs: number): SessionTimer {
  const [phase, setPhase] = useState<SessionTimerPhase>(
    initialMs > 0 ? "paused" : "idle",
  );
  const [accumulatedMs, setAccumulatedMs] = useState(initialMs);
  const [segmentStart, setSegmentStart] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (phase !== "running") return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [phase]);

  const elapsedMs =
    phase === "running" && segmentStart !== null
      ? accumulatedMs + Math.max(0, now - segmentStart)
      : accumulatedMs;

  const start = useCallback(() => {
    const t = Date.now();
    setNow(t);
    setSegmentStart(t);
    setPhase("running");
  }, []);

  const pause = useCallback(() => {
    if (segmentStart === null) return;
    setAccumulatedMs((ms) => ms + (Date.now() - segmentStart));
    setSegmentStart(null);
    setPhase("paused");
  }, [segmentStart]);

  const reset = useCallback(() => {
    setAccumulatedMs(0);
    setSegmentStart(null);
    setPhase("idle");
  }, []);

  return { phase, elapsedMs, start, pause, reset };
}

export function formatElapsed(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const ss = s.toString().padStart(2, "0");
  if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${ss}`;
  return `${m}:${ss}`;
}

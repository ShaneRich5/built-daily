"use client";

import { useCallback, useEffect, useState } from "react";

export type SetStopwatchTarget = { lineId: string; setIndex: number };

export type SetStopwatch = {
  active: SetStopwatchTarget | null;
  liveMs: number;
  start: (target: SetStopwatchTarget) => void;
  /** Stops and returns whole seconds (at least 1), or null if nothing was running. */
  stop: () => { target: SetStopwatchTarget; seconds: number } | null;
  cancel: () => void;
};

/** Times a single set (one at a time), e.g. a hold or a timed carry. */
export function useSetStopwatch(): SetStopwatch {
  const [active, setActive] = useState<
    (SetStopwatchTarget & { startedAt: number }) | null
  >(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!active) return;
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, [active]);

  const start = useCallback((target: SetStopwatchTarget) => {
    const t = Date.now();
    setNow(t);
    setActive({ ...target, startedAt: t });
  }, []);

  const stop = useCallback(() => {
    if (!active) return null;
    const seconds = Math.max(1, Math.round((Date.now() - active.startedAt) / 1000));
    setActive(null);
    return { target: { lineId: active.lineId, setIndex: active.setIndex }, seconds };
  }, [active]);

  const cancel = useCallback(() => setActive(null), []);

  return {
    active: active ? { lineId: active.lineId, setIndex: active.setIndex } : null,
    liveMs: active ? Math.max(0, now - active.startedAt) : 0,
    start,
    stop,
    cancel,
  };
}

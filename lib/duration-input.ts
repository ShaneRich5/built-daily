/** Split total seconds (stored value) into minutes + seconds for UI inputs. */
export function splitTotalSeconds(totalSecRaw: string): {
  minutes: string;
  seconds: string;
} {
  const t = totalSecRaw.trim();
  if (!t) return { minutes: "", seconds: "" };
  const n = parseInt(t, 10);
  if (!Number.isFinite(n) || n < 0) return { minutes: "", seconds: "" };
  const minutes = Math.floor(n / 60);
  const seconds = n % 60;
  return {
    minutes: minutes > 0 || seconds > 0 || n === 0 ? String(minutes) : "",
    seconds: String(seconds),
  };
}

/**
 * Combine minute + second fields into a total-seconds string for persistence.
 * Empty both fields → empty string. Partial input treats the other as 0.
 */
export function combineToTotalSeconds(
  minutesRaw: string,
  secondsRaw: string,
): string {
  const mTrim = minutesRaw.trim();
  const sTrim = secondsRaw.trim();
  if (!mTrim && !sTrim) return "";

  const m = mTrim === "" ? 0 : parseInt(mTrim, 10);
  const s = sTrim === "" ? 0 : parseInt(sTrim, 10);
  if (!Number.isFinite(m) || !Number.isFinite(s) || m < 0 || s < 0) {
    return "";
  }
  return String(m * 60 + s);
}

/** Format total seconds for display (e.g. 90 → "1:30"). */
export function formatMinutesSecondsLabel(totalSec: number): string {
  const n = Math.max(0, Math.floor(totalSec));
  const m = Math.floor(n / 60);
  const s = n % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

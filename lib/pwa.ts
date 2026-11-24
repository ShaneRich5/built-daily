/**
 * Installing Built Daily as an app (PWA), client only.
 *
 * Chrome and Edge fire `beforeinstallprompt` once, early, on whatever page you
 * land on. We keep that event here so Settings can show an Install button later.
 * iOS Safari has no prompt: you install with Share › Add to Home Screen.
 */

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

let deferredPrompt: InstallPromptEvent | null = null;
const listeners = new Set<() => void>();

function notify() {
  for (const listener of listeners) listener();
}

let setUp = false;

/** Register the service worker and start listening for the install prompt. Safe to call twice. */
export function setUpPwa(): void {
  if (typeof window === "undefined" || setUp) return;
  setUp = true;

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredPrompt = event as InstallPromptEvent;
    notify();
  });
  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    notify();
  });

  // Dev builds change on every save; a caching worker there only gets in the way.
  if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator))
    return;
  navigator.serviceWorker
    .register("/sw.js", { scope: "/", updateViaCache: "none" })
    .catch(() => {
      // Not fatal: the app works the same without it, just not offline.
    });
}

export function subscribeInstallPrompt(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function canPromptInstall(): boolean {
  return deferredPrompt !== null;
}

/** Shows the browser's install dialog. True when the person installed. */
export async function promptInstall(): Promise<boolean> {
  const event = deferredPrompt;
  if (!event) return false;
  deferredPrompt = null;
  notify();
  await event.prompt();
  const { outcome } = await event.userChoice;
  return outcome === "accepted";
}

/** Already running as the installed app (home screen / app window). */
export function isRunningStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const iosStandalone =
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return (
    iosStandalone || window.matchMedia("(display-mode: standalone)").matches
  );
}

/** iPhone or iPad (including iPadOS, which reports itself as a Mac with touch). */
export function isIos(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  return (
    /iPhone|iPad|iPod/.test(ua) ||
    (ua.includes("Macintosh") && navigator.maxTouchPoints > 1)
  );
}

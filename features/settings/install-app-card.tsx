"use client";

import { Download, Share } from "lucide-react";
import { useEffect, useState, useSyncExternalStore } from "react";
import {
  canPromptInstall,
  isIos,
  isRunningStandalone,
  promptInstall,
  subscribeInstallPrompt,
} from "@/lib/pwa";
import {
  primaryButton,
  SettingsSection,
} from "@/features/settings/settings-ui";

type Platform = "unknown" | "installed" | "ios" | "other";

/**
 * Install Built Daily to the home screen, no app store needed. Chrome / Edge /
 * Android get a one-tap Install button; iOS gets the Share › Add to Home Screen
 * steps. Hidden once you're in the installed app, or when the browser can't install.
 */
export function InstallAppCard() {
  const [platform, setPlatform] = useState<Platform>("unknown");
  const canPrompt = useSyncExternalStore(
    subscribeInstallPrompt,
    canPromptInstall,
    () => false,
  );

  // Browser-only checks, after mount so the server render matches.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one read of browser-only state after mount
    setPlatform(
      isRunningStandalone() ? "installed" : isIos() ? "ios" : "other",
    );
  }, []);

  if (platform === "unknown" || platform === "installed") return null;
  if (platform === "other" && !canPrompt) return null;

  return (
    <SettingsSection id="install-heading" title="Install the app">
      <div className="flex flex-col gap-3 px-4 py-3.5">
        <p className="text-sm text-zinc-600 dark:text-zinc-300">
          Put Built Daily on your home screen. It opens full screen like any
          other app, and pages you&rsquo;ve opened keep working offline.
        </p>
        {platform === "ios" ? (
          <ol className="flex flex-col gap-1.5 text-sm text-zinc-900 dark:text-zinc-50">
            <li className="flex items-center gap-2">
              <span className="font-mono text-xs text-zinc-500">1</span>
              In Safari, tap Share
              <Share
                className="size-4 text-zinc-500"
                aria-label="(the square with an arrow)"
              />
            </li>
            <li className="flex items-center gap-2">
              <span className="font-mono text-xs text-zinc-500">2</span>
              Choose <span className="font-medium">Add to Home Screen</span>
            </li>
          </ol>
        ) : (
          <button
            type="button"
            onClick={() => void promptInstall()}
            className={`${primaryButton} self-start`}
          >
            <Download className="size-4" aria-hidden />
            Install Built Daily
          </button>
        )}
      </div>
    </SettingsSection>
  );
}

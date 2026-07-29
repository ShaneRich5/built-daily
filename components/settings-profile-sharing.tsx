"use client";

import Link from "next/link";
import { Check, Copy } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  getOwnPublicProfile,
  setProfilePublic,
} from "@/lib/public-profile-repository";

async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through */
  }
  try {
    const el = document.createElement("textarea");
    el.value = text;
    el.setAttribute("readonly", "");
    el.style.position = "fixed";
    el.style.left = "-9999px";
    document.body.appendChild(el);
    el.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(el);
    return ok;
  } catch {
    return false;
  }
}

export function SettingsProfileSharing() {
  const { user, loading, firebaseReady } = useAuth();
  const [profilePublic, setProfilePublicState] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !firebaseReady) {
      setLoaded(false);
      setProfilePublicState(false);
      return;
    }
    let cancelled = false;
    void (async () => {
      const row = await getOwnPublicProfile();
      if (cancelled) return;
      const isPublic = row?.profile.profilePublic ?? false;
      // Re-seed chart history for profiles created before activityByDay existed.
      if (
        isPublic &&
        Object.keys(row?.profile.activityByDay ?? {}).length === 0
      ) {
        await setProfilePublic(true);
      }
      if (cancelled) return;
      setProfilePublicState(isPublic);
      setLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [user, firebaseReady]);

  const shareUrl =
    typeof window !== "undefined" && user
      ? `${window.location.origin}/u/${user.uid}`
      : user
        ? `/u/${user.uid}`
        : "";

  async function onToggle(next: boolean) {
    if (!user || busy) return;
    setBusy(true);
    setError(null);
    const prev = profilePublic;
    setProfilePublicState(next);
    try {
      const ok = await setProfilePublic(next);
      if (!ok) {
        setProfilePublicState(prev);
        setError("Couldn’t update profile visibility. Try again.");
      }
    } catch {
      setProfilePublicState(prev);
      setError("Couldn’t update profile visibility. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function onCopyLink() {
    if (!shareUrl) return;
    const ok = await copyText(shareUrl);
    if (!ok) {
      setError("Couldn’t copy the link.");
      return;
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex flex-1 flex-col gap-6">
      <header className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-medium text-zinc-500">Account</p>
          <Link
            href="/"
            className="text-sm font-semibold text-zinc-700 underline-offset-2 hover:underline dark:text-zinc-300"
          >
            Home
          </Link>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Settings
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Control what others can see when you share a link.
        </p>
      </header>

      {!firebaseReady ? (
        <p className="text-sm text-zinc-500">
          Add Firebase configuration to manage profile sharing.
        </p>
      ) : loading ? (
        <p className="text-sm text-zinc-500">Loading account…</p>
      ) : !user ? (
        <div className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50/80 px-4 py-6 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-950/40 dark:text-zinc-400">
          <p>Sign in to manage your public profile.</p>
          <Link
            href="/login"
            className="mt-3 inline-block text-sm font-semibold text-zinc-900 underline dark:text-zinc-100"
          >
            Sign in
          </Link>
        </div>
      ) : (
        <section className="space-y-4" aria-labelledby="public-profile-heading">
          <h2
            id="public-profile-heading"
            className="text-sm font-semibold uppercase tracking-wide text-zinc-500"
          >
            Public profile
          </h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            When on, anyone with your link can see your name, consistency chart,
            streak, and workouts this week—not workout details or body weight.
          </p>

          {!loaded ? (
            <p className="text-sm text-zinc-500">Loading…</p>
          ) : (
            <>
              <div className="flex items-center justify-between gap-4 py-1">
                <Label
                  htmlFor="public-profile-toggle"
                  className="text-sm font-medium text-zinc-900 dark:text-zinc-50"
                >
                  Make profile public
                </Label>
                <Switch
                  id="public-profile-toggle"
                  checked={profilePublic}
                  disabled={busy}
                  onCheckedChange={(checked) => void onToggle(Boolean(checked))}
                />
              </div>

              {profilePublic ? (
                <div className="space-y-3 border-t border-zinc-200 pt-4 dark:border-zinc-800">
                  <p className="break-all text-sm text-zinc-600 dark:text-zinc-400">
                    {shareUrl}
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => void onCopyLink()}
                  >
                    {copied ? (
                      <>
                        <Check />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy />
                        Copy link
                      </>
                    )}
                  </Button>
                </div>
              ) : null}
            </>
          )}

          {error ? (
            <p className="text-sm text-red-600 dark:text-red-400" role="alert">
              {error}
            </p>
          ) : null}
        </section>
      )}
    </div>
  );
}

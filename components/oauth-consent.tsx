"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import { getFirebaseAuth } from "@/lib/firebase";

type OAuthConsentProps = {
  clientName: string;
  clientId: string;
  /** Already validated server-side against the client's registered URIs. */
  redirectUri: string;
  codeChallenge: string;
  codeChallengeMethod: string;
  state: string;
  /** Same-origin path to return to after signing in. */
  returnTo: string;
};

export function OAuthConsent({
  clientName,
  clientId,
  redirectUri,
  codeChallenge,
  codeChallengeMethod,
  state,
  returnTo,
}: OAuthConsentProps) {
  const { user, loading, firebaseReady } = useAuth();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loginHref = `/login?next=${encodeURIComponent(returnTo)}`;

  useEffect(() => {
    if (firebaseReady && !loading && !user) {
      router.replace(loginHref);
    }
  }, [firebaseReady, loading, user, router, loginHref]);

  const submit = useCallback(
    async (approve: boolean) => {
      if (busy) return;
      setBusy(true);
      setError(null);
      try {
        const currentUser = getFirebaseAuth()?.currentUser;
        if (!currentUser) {
          setError("Your session expired. Sign in and try again.");
          return;
        }
        const idToken = await currentUser.getIdToken();
        const res = await fetch("/api/mcp/oauth/authorize", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${idToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            client_id: clientId,
            redirect_uri: redirectUri,
            code_challenge: codeChallenge,
            code_challenge_method: codeChallengeMethod,
            state,
            approve,
          }),
        });
        const data = (await res.json()) as { redirectTo?: string };
        if (!res.ok || typeof data.redirectTo !== "string") {
          setError("Couldn’t complete the connection. Try again.");
          return;
        }
        // An external callback URL, so a full navigation rather than a route push.
        window.location.assign(data.redirectTo);
      } catch {
        setError("Couldn’t complete the connection. Try again.");
      } finally {
        setBusy(false);
      }
    },
    [busy, clientId, redirectUri, codeChallenge, codeChallengeMethod, state],
  );

  if (!firebaseReady) {
    return (
      <p className="text-sm text-zinc-500">
        Sign-in isn’t configured on this deployment.
      </p>
    );
  }

  if (loading) {
    return <p className="text-sm text-zinc-500">Loading…</p>;
  }

  if (!user) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Sign in to connect {clientName}.
        </p>
        <Link
          href={loginHref}
          className="inline-flex h-11 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground"
        >
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-3 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
          {clientName} will be able to:
        </p>
        <ul className="space-y-1.5 text-sm text-zinc-600 dark:text-zinc-400">
          <li>Read your recent workouts and their details</li>
          <li>Search the exercise catalog</li>
          <li>Log new workouts and update existing ones</li>
        </ul>
        <p className="text-xs text-zinc-500">
          Signed in as {user.email ?? "your account"}. Access refreshes while
          you stay connected, and stops when you remove the connection in{" "}
          {clientName}.
        </p>
      </div>

      <div className="flex gap-2">
        <Button
          type="button"
          size="lg"
          className="h-12 flex-1 rounded-xl text-base font-semibold"
          disabled={busy}
          onClick={() => void submit(true)}
        >
          {busy ? "Connecting…" : "Allow access"}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="lg"
          className="h-12 flex-1 rounded-xl"
          disabled={busy}
          onClick={() => void submit(false)}
        >
          Deny
        </Button>
      </div>

      {error ? (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

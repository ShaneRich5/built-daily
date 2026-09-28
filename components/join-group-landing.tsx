"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import { normalizeInviteCode } from "@/lib/group-mapper";
import { joinAccountabilityGroupByCode } from "@/lib/group-repository";

type JoinGroupLandingProps = {
  code: string;
};

export function JoinGroupLanding({ code: rawCode }: JoinGroupLandingProps) {
  const code = normalizeInviteCode(rawCode);
  const router = useRouter();
  const { user, loading, firebaseReady } = useAuth();
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleJoin() {
    if (joining) return;
    setError(null);
    setJoining(true);
    try {
      const result = await joinAccountabilityGroupByCode(code);
      if (!result) {
        setError(
          "Couldn’t join. The code may be wrong, expired, or the group is full.",
        );
        return;
      }
      router.push(`/groups/${result.groupId}`);
    } catch {
      setError("Something went wrong joining the group.");
    } finally {
      setJoining(false);
    }
  }

  if (!firebaseReady || loading) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 py-12">
        <p className="text-sm text-zinc-500">Loading…</p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-6 py-8">
      <header className="space-y-1 text-center">
        <p className="text-sm font-medium text-zinc-500">Accountability</p>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          You’re invited
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Join with code{" "}
          <span className="font-mono font-semibold tracking-wider text-zinc-900 dark:text-zinc-50">
            {code}
          </span>
        </p>
      </header>

      {!user ? (
        <div className="flex flex-col items-center gap-3">
          <p className="text-center text-sm text-zinc-600 dark:text-zinc-400">
            Sign in or create an account to join.
          </p>
          <Link
            href={`/login?next=${encodeURIComponent(`/join/${code}`)}`}
            className="inline-flex h-11 items-center justify-center rounded-lg bg-zinc-900 px-5 text-sm font-semibold text-white dark:bg-zinc-50 dark:text-zinc-900"
          >
            Sign in
          </Link>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3">
          <Button
            type="button"
            size="lg"
            disabled={joining || code.length < 6}
            onClick={() => void handleJoin()}
          >
            {joining ? "Joining…" : "Join group"}
          </Button>
          {error ? (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          ) : null}
          <Link
            href="/groups"
            className="text-sm font-medium text-zinc-600 underline-offset-2 hover:underline dark:text-zinc-400"
          >
            Or browse your groups
          </Link>
        </div>
      )}
    </div>
  );
}

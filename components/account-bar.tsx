"use client";

/* eslint-disable react-hooks/set-state-in-effect -- client-only mount gate for hydration */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";

export function AccountBar() {
  const pathname = usePathname();
  const { user, loading, firebaseReady, signOutUser } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (pathname === "/login") {
    return null;
  }

  if (!mounted) {
    return <div className="mb-4 h-9 rounded-lg bg-zinc-100 dark:bg-zinc-900" />;
  }

  if (!firebaseReady) {
    return (
      <div className="mb-4 rounded-lg border border-dashed border-zinc-200 bg-zinc-50/80 px-3 py-2 text-xs text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950/40 dark:text-zinc-400">
        Add Firebase env vars to enable sign-in.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="mb-4 h-9 animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-900" />
    );
  }

  if (user) {
    return (
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950">
        <span className="truncate text-zinc-700 dark:text-zinc-200">
          {user.email}
        </span>
        <div className="flex shrink-0 items-center gap-2">
          <Link
            href="/settings"
            className="rounded-md border border-zinc-200 px-2.5 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-900"
          >
            Settings
          </Link>
          <button
            type="button"
            onClick={() => void signOutUser()}
            className="rounded-md border border-zinc-200 px-2.5 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-900"
          >
            Sign out
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-4 flex justify-end">
      <Link
        href="/login"
        className="rounded-lg bg-zinc-900 px-3 py-2 text-sm font-semibold text-white dark:bg-zinc-50 dark:text-zinc-900"
      >
        Sign in
      </Link>
    </div>
  );
}

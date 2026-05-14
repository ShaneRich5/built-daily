"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState, type FormEvent } from "react";
import { useAuth } from "@/components/auth-provider";
import { mapAuthError } from "@/lib/auth-errors";

type Mode = "signin" | "signup";

export function LoginForm() {
  const router = useRouter();
  const { signIn, signUp, signInWithGoogle, firebaseReady } = useAuth();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const onGoogle = useCallback(async () => {
    setError(null);
    if (!firebaseReady) {
      setError("Firebase is not configured.");
      return;
    }
    setPending(true);
    try {
      await signInWithGoogle();
      router.push("/");
      router.refresh();
    } catch (err) {
      setError(mapAuthError(err));
    } finally {
      setPending(false);
    }
  }, [firebaseReady, router, signInWithGoogle]);

  const onSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      setError(null);
      if (!firebaseReady) {
        setError("Firebase is not configured.");
        return;
      }
      setPending(true);
      try {
        if (mode === "signin") {
          await signIn(email, password);
        } else {
          await signUp(email, password);
        }
        router.push("/");
        router.refresh();
      } catch (err) {
        setError(mapAuthError(err));
      } finally {
        setPending(false);
      }
    },
    [email, password, mode, signIn, signUp, firebaseReady, router],
  );

  if (!firebaseReady) {
    return (
      <div className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50/80 p-6 text-center text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-950/40 dark:text-zinc-400">
        <p>Firebase is not configured.</p>
        <p className="mt-2 text-xs text-zinc-500">
          Set <code className="rounded bg-zinc-200 px-1 dark:bg-zinc-800">NEXT_PUBLIC_FIREBASE_*</code>{" "}
          in <code className="rounded bg-zinc-200 px-1 dark:bg-zinc-800">.env.local</code>.
        </p>
        <Link
          href="/"
          className="mt-4 inline-block text-sm font-medium text-zinc-900 underline dark:text-zinc-100"
        >
          Back home
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <button
          type="button"
          disabled={pending}
          onClick={() => void onGoogle()}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white text-base font-semibold text-zinc-900 transition enabled:active:scale-[0.99] disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
        >
          <GoogleMark />
          Continue with Google
        </button>
        <p className="text-center text-xs text-zinc-500">
          New accounts are created automatically the first time you use Google.
        </p>
      </div>

      <div className="relative">
        <div className="absolute inset-0 flex items-center" aria-hidden>
          <span className="w-full border-t border-zinc-200 dark:border-zinc-800" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-zinc-50 px-2 text-zinc-500 dark:bg-zinc-950">
            Or use email
          </span>
        </div>
      </div>

      <div className="flex rounded-lg border border-zinc-200 p-0.5 dark:border-zinc-800">
        <button
          type="button"
          onClick={() => {
            setMode("signin");
            setError(null);
          }}
          className={`flex-1 rounded-md py-2 text-sm font-semibold transition ${
            mode === "signin"
              ? "bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900"
              : "text-zinc-600 dark:text-zinc-400"
          }`}
        >
          Sign in
        </button>
        <button
          type="button"
          onClick={() => {
            setMode("signup");
            setError(null);
          }}
          className={`flex-1 rounded-md py-2 text-sm font-semibold transition ${
            mode === "signup"
              ? "bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900"
              : "text-zinc-600 dark:text-zinc-400"
          }`}
        >
          Register
        </button>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="auth-email"
            className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400"
          >
            Email
          </label>
          <input
            id="auth-email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-12 w-full rounded-xl border border-zinc-200 bg-white px-3 text-zinc-900 outline-none ring-zinc-900/10 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:ring-white/10"
          />
        </div>
        <div>
          <label
            htmlFor="auth-password"
            className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400"
          >
            Password
          </label>
          <input
            id="auth-password"
            type="password"
            autoComplete={
              mode === "signin" ? "current-password" : "new-password"
            }
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-12 w-full rounded-xl border border-zinc-200 bg-white px-3 text-zinc-900 outline-none ring-zinc-900/10 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:ring-white/10"
          />
          {mode === "signup" && (
            <p className="mt-1 text-xs text-zinc-500">
              At least 6 characters (Firebase minimum).
            </p>
          )}
        </div>

        {error && (
          <p
            role="alert"
            className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-950/50 dark:text-red-200"
          >
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="flex h-12 w-full items-center justify-center rounded-xl bg-zinc-900 text-base font-semibold text-white transition enabled:active:scale-[0.99] disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900"
        >
          {pending
            ? "Please wait…"
            : mode === "signin"
              ? "Sign in"
              : "Create account"}
        </button>
      </form>

      <p className="text-center text-sm text-zinc-500">
        <Link href="/" className="font-medium text-zinc-800 underline-offset-2 hover:underline dark:text-zinc-200">
          Back to home
        </Link>
      </p>
    </div>
  );
}

function GoogleMark() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 48 48"
      aria-hidden
      className="shrink-0"
    >
      <path
        fill="#FFC107"
        d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"
      />
      <path
        fill="#FF3D00"
        d="m6.306 14.691 6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"
      />
    </svg>
  );
}

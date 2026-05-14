import type { Metadata } from "next";
import { LoginForm } from "@/components/login-form";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in or create a Built Daily account.",
};

export default function LoginPage() {
  return (
    <div className="flex flex-1 flex-col gap-6">
      <header className="space-y-1">
        <p className="text-sm font-medium text-zinc-500">Account</p>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Built Daily
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Sign in with email or create a new account.
        </p>
      </header>
      <LoginForm />
    </div>
  );
}

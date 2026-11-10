import Link from "next/link";
import { ArrowLeft, LogOut } from "lucide-react";
import type { ReactNode } from "react";
import { ConnectClaudeCard, type ConnectClaudeCardProps } from "@/features/settings/connect-claude-card";
import { PublicProfileCard, type PublicProfileCardProps } from "@/features/settings/public-profile-card";
import { SettingsSection, secondaryButton } from "@/features/settings/settings-ui";

/** Back to home and the page title, the same header History uses. */
export function SettingsHeader() {
  return (
    <header className="flex items-center gap-2">
      <Link
        href="/"
        aria-label="Back to home"
        className="-ml-2.5 inline-flex size-11 items-center justify-center rounded-lg text-zinc-900 hover:bg-zinc-100 dark:text-zinc-100 dark:hover:bg-zinc-900"
      >
        <ArrowLeft className="size-5" aria-hidden />
      </Link>
      <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Settings</h1>
    </header>
  );
}

/** Who's signed in, with the round initial that Home's account button shows. */
export function AccountCard({ email, onSignOut }: { email: string | null; onSignOut: () => void }) {
  const initial = email?.trim().charAt(0).toUpperCase() || "?";
  return (
    <SettingsSection id="account-heading" title="Account">
      <div className="flex flex-wrap items-center gap-3 px-4 py-3.5">
        <span
          aria-hidden
          className="inline-flex size-10 shrink-0 items-center justify-center rounded-full border border-zinc-200 text-[15px] font-semibold text-zinc-700 dark:border-zinc-700 dark:text-zinc-200"
        >
          {initial}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-xs text-zinc-500 dark:text-zinc-400">Signed in as</span>
          <span className="block truncate text-sm font-medium text-zinc-900 dark:text-zinc-50">
            {email ?? "Unknown account"}
          </span>
        </span>
        <button type="button" onClick={onSignOut} className={secondaryButton}>
          <LogOut className="size-3.5" aria-hidden />
          Sign out
        </button>
      </div>
    </SettingsSection>
  );
}

/** Signed-out, loading and not-configured states share the header and one quiet box. */
export function SettingsNotice({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-1 flex-col gap-5">
      <SettingsHeader />
      <div className="rounded-2xl border border-dashed border-zinc-200 px-4 py-5 text-sm text-zinc-500 dark:border-zinc-800">
        {children}
      </div>
    </div>
  );
}

export type SettingsViewProps = {
  email: string | null;
  onSignOut: () => void;
  profile: PublicProfileCardProps;
  connect: ConnectClaudeCardProps;
};

/** Account, then sharing, then the Claude connector. */
export function SettingsView({ email, onSignOut, profile, connect }: SettingsViewProps) {
  return (
    <div className="flex flex-1 flex-col gap-5">
      <SettingsHeader />
      <AccountCard email={email} onSignOut={onSignOut} />
      <PublicProfileCard {...profile} />
      <ConnectClaudeCard {...connect} />
    </div>
  );
}

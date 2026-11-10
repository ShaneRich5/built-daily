"use client";

import Link from "next/link";
import { useAuth } from "@/components/auth-provider";
import { SettingsNotice, SettingsView } from "@/features/settings/settings-view";
import { useMcpTokens } from "@/features/settings/use-mcp-tokens";
import { usePublicProfile } from "@/features/settings/use-public-profile";

/** Settings wired to Firebase. One sign-in gate for the whole page instead of one per section. */
export function SettingsScreen() {
  const { user, loading, firebaseReady, signOutUser } = useAuth();
  const profile = usePublicProfile();
  const tokens = useMcpTokens();

  if (!firebaseReady) {
    return <SettingsNotice>Add Firebase configuration to manage settings.</SettingsNotice>;
  }
  if (loading) {
    return <SettingsNotice>Loading your account…</SettingsNotice>;
  }
  if (!user) {
    return (
      <SettingsNotice>
        <p>Sign in to manage your profile and connect Claude.</p>
        <Link
          href="/login"
          className="mt-3 inline-flex h-11 items-center rounded-lg bg-zinc-900 px-4 text-sm font-semibold text-white dark:bg-zinc-50 dark:text-zinc-900"
        >
          Sign in
        </Link>
      </SettingsNotice>
    );
  }

  return (
    <SettingsView
      email={user.email}
      onSignOut={() => void signOutUser()}
      profile={{
        loaded: profile.loaded,
        isPublic: profile.isPublic,
        busy: profile.busy,
        error: profile.error,
        shareUrl: profile.shareUrl,
        sharePath: profile.sharePath,
        onToggle: (next) => void profile.toggle(next),
      }}
      connect={{
        loaded: tokens.loaded,
        tokens: tokens.tokens,
        busy: tokens.busy,
        error: tokens.error,
        serverUrl: tokens.serverUrl,
        newToken: tokens.newToken,
        onGenerate: (label) => void tokens.generate(label),
        onRevoke: (id) => void tokens.revoke(id),
        onDismissNewToken: tokens.dismissNewToken,
      }}
    />
  );
}

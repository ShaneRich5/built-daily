"use client";

import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { CopyField, ErrorLine, SettingsSection, secondaryButton } from "@/features/settings/settings-ui";

export type PublicProfileCardProps = {
  loaded: boolean;
  isPublic: boolean;
  busy: boolean;
  error: string | null;
  /** Full share link, e.g. https://…/u/<uid>. */
  shareUrl: string;
  /** Same page as a path, for the in-app "View" link. */
  sharePath: string;
  onToggle: (next: boolean) => void;
};

/** One switch, and once it's on, the link to share and a way to see what others see. */
export function PublicProfileCard(props: PublicProfileCardProps) {
  return (
    <SettingsSection id="sharing-heading" title="Sharing">
      <div className="flex min-h-14 items-center gap-4 px-4 py-3">
        <label htmlFor="public-profile-toggle" className="min-w-0 flex-1 cursor-pointer">
          <span className="block text-[15px] font-medium text-zinc-900 dark:text-zinc-50">Public profile</span>
          <span className="mt-0.5 block text-[13px] text-zinc-500 dark:text-zinc-400">
            Your name, streak, this week and consistency chart. Never workout details or body weight.
          </span>
        </label>
        <Switch
          id="public-profile-toggle"
          checked={props.isPublic}
          disabled={!props.loaded || props.busy}
          onCheckedChange={(checked) => props.onToggle(Boolean(checked))}
        />
      </div>

      {props.loaded && props.isPublic ? (
        <div className="flex flex-col gap-3 border-t border-zinc-100 px-4 py-3.5 dark:border-zinc-800">
          <CopyField label="Your link" value={props.shareUrl} />
          <Link href={props.sharePath} className={`${secondaryButton} self-start`}>
            <ExternalLink className="size-3.5" aria-hidden />
            View as others see it
          </Link>
        </div>
      ) : null}

      {props.error ? (
        <div className="border-t border-zinc-100 px-4 py-3 dark:border-zinc-800">
          <ErrorLine message={props.error} />
        </div>
      ) : null}
    </SettingsSection>
  );
}

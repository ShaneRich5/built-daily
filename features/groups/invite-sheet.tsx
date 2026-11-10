"use client";

import { Check, Copy, Share2, X } from "lucide-react";
import { useState } from "react";
import { BottomSheet, BottomSheetClose } from "@/components/ui/bottom-sheet";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { DayTile, primaryGreen, sectionLabel } from "@/features/groups/group-ui";
import { copyText, inviteUrl, shareLink, spacedCode } from "@/features/groups/share";

export type InvitePlanOption = {
  id: string;
  weekday: string;
  dayOfMonth: number;
  label: string;
  /** "6:30 AM · Iron Works Gym" */
  meta: string;
};

export type InviteSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupName: string;
  memberCount: number;
  maxMembers: number;
  code: string;
  origin: string;
  plans: InvitePlanOption[];
  /** Start with this plan attached (from a plan's "Invite a friend to this"). */
  initialPlanId?: string | null;
  isOwner: boolean;
  onReset: () => Promise<void>;
};

/**
 * G5: one link does it all — the group, and optionally a plan. No QR code:
 * it would need a new dependency, and the link + spaced code cover in-person
 * invites well enough for now.
 */
export function InviteSheet(props: InviteSheetProps) {
  return (
    <BottomSheet open={props.open} onOpenChange={props.onOpenChange} title={`Invite to ${props.groupName}`} hideHeader>
      {props.open ? <InviteBody {...props} /> : null}
    </BottomSheet>
  );
}

function InviteBody({
  groupName,
  memberCount,
  maxMembers,
  code,
  origin,
  plans,
  initialPlanId = null,
  isOwner,
  onReset,
}: InviteSheetProps) {
  const [withPlan, setWithPlan] = useState(Boolean(initialPlanId));
  const [planId, setPlanId] = useState<string | null>(initialPlanId ?? plans[0]?.id ?? null);
  const [choosing, setChoosing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [shareNote, setShareNote] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);

  const plan = plans.find((p) => p.id === planId) ?? null;
  const url = inviteUrl(origin, code, withPlan && plan ? plan.id : null);
  const full = memberCount >= maxMembers;

  const onCopy = async () => {
    if (await copyText(url)) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    }
  };

  const onShare = async () => {
    const result = await shareLink({
      title: "Built Daily",
      text: withPlan && plan ? `Join me for ${plan.label} on Built Daily` : `Join ${groupName} on Built Daily`,
      url,
    });
    setShareNote(result === "copied" ? "Link copied. Paste it anywhere." : result === "failed" ? "Couldn’t share. Copy the link above." : null);
  };

  const onResetClick = async () => {
    if (!window.confirm("Reset the link? The old link and code stop working.")) return;
    setResetting(true);
    try {
      await onReset();
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 px-4 pt-1 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Invite to {groupName}</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {memberCount} of {maxMembers} spots taken
          </p>
        </div>
        <BottomSheetClose
          aria-label="Close"
          className="inline-flex size-11 items-center justify-center rounded-full text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-900"
        >
          <X className="size-5" aria-hidden />
        </BottomSheetClose>
      </div>

      {full ? (
        <p className="rounded-xl bg-zinc-50 px-3.5 py-3 text-sm text-zinc-600 dark:bg-zinc-900/60 dark:text-zinc-300">
          Every spot is taken right now, so the link won’t let anyone else in.
        </p>
      ) : null}

      <div className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
        <p className={sectionLabel}>Invite code</p>
        <p className="mt-1 font-mono text-3xl font-semibold tracking-widest text-zinc-900 dark:text-zinc-50">
          {spacedCode(code)}
        </p>
        <p className="mt-1.5 text-[13px] text-zinc-500 dark:text-zinc-400">
          Say it in person, or they can type it in Groups › Join.
        </p>
      </div>

      <div className="flex items-center gap-2">
        <label className="min-w-0 flex-1">
          <span className="sr-only">Invite link</span>
          <input
            readOnly
            value={url.replace(/^https?:\/\//, "")}
            onFocus={(e) => e.currentTarget.select()}
            className="h-11 w-full truncate rounded-lg border border-zinc-200 bg-zinc-50 px-3 font-mono text-[13px] text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
          />
        </label>
        <button
          type="button"
          onClick={() => void onCopy()}
          className="inline-flex h-11 items-center gap-1.5 rounded-lg border border-zinc-200 px-3.5 text-sm font-medium dark:border-zinc-700"
        >
          {copied ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>

      {plans.length > 0 ? (
        <div className="rounded-xl border border-zinc-200 p-3.5 dark:border-zinc-800">
          <label className="flex min-h-11 items-center justify-between gap-3">
            <span className="text-[15px] font-medium">Also invite them to a plan</span>
            <Switch checked={withPlan} onCheckedChange={setWithPlan} />
          </label>
          {withPlan && plan ? (
            <>
              {choosing ? (
                <ul className="mt-2 flex flex-col gap-1">
                  {plans.map((p) => (
                    <li key={p.id}>
                      <button
                        type="button"
                        onClick={() => {
                          setPlanId(p.id);
                          setChoosing(false);
                        }}
                        className={cn(
                          "flex min-h-12 w-full items-center gap-3 rounded-lg px-2 text-left hover:bg-zinc-50 dark:hover:bg-zinc-900",
                          p.id === planId && "bg-zinc-50 dark:bg-zinc-900",
                        )}
                      >
                        <DayTile weekday={p.weekday} day={p.dayOfMonth} />
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium">{p.label}</span>
                          <span className="block truncate text-xs text-zinc-500">{p.meta}</span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="mt-2 flex items-center gap-3">
                  <DayTile weekday={plan.weekday} day={plan.dayOfMonth} tone="green" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{plan.label}</span>
                    <span className="block truncate text-xs text-zinc-500 dark:text-zinc-400">{plan.meta}</span>
                  </span>
                  {plans.length > 1 ? (
                    <button
                      type="button"
                      onClick={() => setChoosing(true)}
                      className="min-h-11 px-2 text-sm font-medium text-emerald-700 dark:text-emerald-400"
                    >
                      Change
                    </button>
                  ) : null}
                </div>
              )}
              <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                The link opens the group with this plan ready to say “I’m in”.
              </p>
            </>
          ) : null}
        </div>
      ) : null}

      <button type="button" onClick={() => void onShare()} className={primaryGreen}>
        <Share2 className="size-[18px]" aria-hidden />
        Share invite
      </button>
      {shareNote ? <p className="text-center text-sm text-zinc-600 dark:text-zinc-300">{shareNote}</p> : null}

      <p className="text-center text-xs text-zinc-500 dark:text-zinc-400">
        Anyone with the link can join until you reset it.
        {isOwner ? (
          <>
            {" "}
            <button
              type="button"
              disabled={resetting}
              onClick={() => void onResetClick()}
              className="font-medium text-zinc-700 underline underline-offset-2 dark:text-zinc-200"
            >
              {resetting ? "Resetting…" : "Reset link"}
            </button>
          </>
        ) : null}
      </p>
    </div>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { joinAccountabilityGroupByCode } from "@/lib/group-repository";

type JoinGroupFormProps = {
  disabled?: boolean;
};

export function JoinGroupForm({ disabled }: JoinGroupFormProps) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy || disabled) return;
    setError(null);
    setBusy(true);
    try {
      const result = await joinAccountabilityGroupByCode(code);
      if (!result) {
        setError(
          "Couldn’t join. Check the invite code, or the group may be full.",
        );
        return;
      }
      router.push(`/groups/${result.groupId}`);
    } catch {
      setError("Something went wrong joining the group.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="invite-code">Invite code</Label>
        <Input
          id="invite-code"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="ABCD2345"
          autoCapitalize="characters"
          autoCorrect="off"
          spellCheck={false}
          disabled={busy || disabled}
          className="font-mono tracking-wider uppercase"
        />
      </div>
      {error ? <p className="text-sm text-red-600 dark:text-red-400">{error}</p> : null}
      <Button
        type="submit"
        variant="outline"
        disabled={busy || disabled || code.trim().length < 6}
        size="lg"
      >
        {busy ? "Joining…" : "Join group"}
      </Button>
    </form>
  );
}

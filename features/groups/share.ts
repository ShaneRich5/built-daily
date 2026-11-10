/** Clipboard with a textarea fallback for older mobile browsers. */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through */
  }
  try {
    const el = document.createElement("textarea");
    el.value = text;
    el.setAttribute("readonly", "");
    el.style.position = "fixed";
    el.style.left = "-9999px";
    document.body.appendChild(el);
    el.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(el);
    return ok;
  } catch {
    return false;
  }
}

/** Native share sheet when there is one, else copy. Resolves "copied" when it fell back. */
export async function shareLink(input: { title: string; text: string; url: string }): Promise<"shared" | "copied" | "failed"> {
  if (typeof navigator !== "undefined" && navigator.share) {
    try {
      await navigator.share(input);
      return "shared";
    } catch (err) {
      // The person closed the share sheet: that's a choice, not a failure.
      if (err instanceof DOMException && err.name === "AbortError") return "shared";
    }
  }
  return (await copyText(input.url)) ? "copied" : "failed";
}

/** `/join/CODE`, with `?plan=ID` when inviting to a plan too. */
export function inviteUrl(origin: string, code: string, planId: string | null): string {
  const base = `${origin}/join/${code}`;
  return planId ? `${base}?plan=${encodeURIComponent(planId)}` : base;
}

/** "K7Q2 MDXA" — easier to read aloud. */
export function spacedCode(code: string): string {
  return code.length === 8 ? `${code.slice(0, 4)} ${code.slice(4)}` : code;
}

import type { Metadata } from "next";
import Link from "next/link";
import { OAuthConsent } from "@/components/oauth-consent";
import { isFirebaseAdminConfigured } from "@/lib/firebase-admin";
import { getOAuthClient } from "@/mcp/oauth-clients";
import { AUTHORIZE_PATH } from "@/mcp/oauth-metadata";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Connect an app",
  description: "Approve access to your Built Daily workouts.",
};

type AuthorizeSearchParams = {
  client_id?: string;
  redirect_uri?: string;
  response_type?: string;
  code_challenge?: string;
  code_challenge_method?: string;
  state?: string;
};

/**
 * OAuth consent screen (RFC 6749 §4.1 authorization endpoint). Validates the
 * request server-side before anything is rendered.
 *
 * Invalid requests are shown as an error here rather than redirected: per
 * §4.1.2.1 a request whose client_id or redirect_uri can't be verified must
 * not be bounced back to the caller, and keeping every other malformed case
 * in-page means this endpoint never forwards to an unvalidated URL.
 *
 * See docs/MCP_CHATGPT_OAUTH.md.
 */
function InvalidRequest({ reason }: { reason: string }) {
  return (
    <div className="flex flex-1 flex-col gap-4">
      <header className="space-y-1">
        <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
          Connection request
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          This request isn’t valid
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">{reason}</p>
      </header>
      <Link
        href="/"
        className="inline-flex h-11 w-fit items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground"
      >
        Back to home
      </Link>
    </div>
  );
}

export default async function AuthorizePage({
  searchParams,
}: {
  searchParams: Promise<AuthorizeSearchParams>;
}) {
  const params = await searchParams;

  if (!isFirebaseAdminConfigured()) {
    return (
      <InvalidRequest reason="App connections aren’t configured on this deployment." />
    );
  }

  const clientId = params.client_id ?? "";
  const redirectUri = params.redirect_uri ?? "";
  const codeChallenge = params.code_challenge ?? "";
  const codeChallengeMethod = params.code_challenge_method ?? "";
  const state = params.state ?? "";

  const client = clientId ? await getOAuthClient(clientId) : null;
  if (!client) {
    return (
      <InvalidRequest reason="The app making this request isn’t registered. Try connecting again from the app." />
    );
  }
  if (!client.redirectUris.includes(redirectUri)) {
    return (
      <InvalidRequest reason="The app asked to return to an address it hasn’t registered." />
    );
  }
  if ((params.response_type ?? "") !== "code") {
    return (
      <InvalidRequest reason="Only the authorization code flow is supported." />
    );
  }
  if (!codeChallenge || codeChallengeMethod !== "S256") {
    return (
      <InvalidRequest reason="This app didn’t send the proof-of-possession challenge (PKCE) required to connect." />
    );
  }

  // Rebuilt from validated values only, so sign-in returns here with exactly
  // the parameters we already checked.
  const query = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    code_challenge: codeChallenge,
    code_challenge_method: codeChallengeMethod,
  });
  if (state) query.set("state", state);

  return (
    <div className="flex flex-1 flex-col gap-6">
      <header className="space-y-1">
        <p className="text-sm font-medium text-zinc-500">Connect an app</p>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Allow {client.clientName} to use Built Daily?
        </h1>
      </header>

      <OAuthConsent
        clientName={client.clientName}
        clientId={client.clientId}
        redirectUri={redirectUri}
        codeChallenge={codeChallenge}
        codeChallengeMethod={codeChallengeMethod}
        state={state}
        returnTo={`${AUTHORIZE_PATH}?${query.toString()}`}
      />
    </div>
  );
}

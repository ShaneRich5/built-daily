import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";
import type { McpTokenSummary } from "@/lib/mcp-token-repository";
import { SettingsNotice, SettingsView } from "@/features/settings/settings-view";

const ORIGIN = "https://built-daily-two.vercel.app";

const TOKENS: McpTokenSummary[] = [
  { id: "t1", label: "Claude on my phone", createdAt: "2026-10-02T12:00:00Z", lastUsedAt: "2026-11-09T18:20:00Z" },
  { id: "t2", label: "Claude Desktop", createdAt: "2026-09-14T12:00:00Z", lastUsedAt: null },
];

type Seed = { isPublic: boolean; tokens: McpTokenSummary[]; newToken?: string | null; loaded?: boolean };

/** The view with in-memory state, so the switch, generate and revoke all respond. */
function Interactive({ isPublic, tokens, newToken = null, loaded = true }: Seed) {
  const [pub, setPub] = useState(isPublic);
  const [list, setList] = useState(tokens);
  const [fresh, setFresh] = useState<string | null>(newToken);
  return (
    <SettingsView
      email="sam@example.com"
      onSignOut={() => {}}
      profile={{
        loaded,
        isPublic: pub,
        busy: false,
        error: null,
        shareUrl: `${ORIGIN}/u/sam123`,
        sharePath: "/u/sam123",
        onToggle: setPub,
      }}
      connect={{
        loaded,
        tokens: list,
        busy: false,
        error: null,
        serverUrl: `${ORIGIN}/api/mcp`,
        newToken: fresh,
        onGenerate: (label) => {
          setFresh("bd_pat_7Qm2xR9vKc4LwT8nZp1sHy6aFe3uJd5b");
          setList([{ id: String(Date.now()), label, createdAt: new Date().toISOString(), lastUsedAt: null }, ...list]);
        },
        onRevoke: (id) => setList(list.filter((t) => t.id !== id)),
        onDismissNewToken: () => setFresh(null),
      }}
    />
  );
}

const meta = {
  title: "Settings/Screen",
  component: Interactive,
} satisfies Meta<typeof Interactive>;

export default meta;
type Story = StoryObj<typeof meta>;

/** First visit: profile private, no tokens yet. */
export const FirstVisit: Story = { args: { isPublic: false, tokens: [] } };

/** Profile shared and two tokens in use. */
export const PublicWithTokens: Story = { args: { isPublic: true, tokens: TOKENS } };

/** Right after Generate: the token is shown once, in full. */
export const NewToken: Story = {
  args: { isPublic: false, tokens: TOKENS, newToken: "bd_pat_7Qm2xR9vKc4LwT8nZp1sHy6aFe3uJd5b" },
};

/** Before the profile and tokens load. */
export const Loading: Story = { args: { isPublic: false, tokens: [], loaded: false } };

export const SignedOut: Story = {
  args: { isPublic: false, tokens: [] },
  render: () => (
    <SettingsNotice>
      <p>Sign in to manage your profile and connect Claude.</p>
    </SettingsNotice>
  ),
};

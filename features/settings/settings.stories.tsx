import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";
import type { McpTokenSummary } from "@/lib/mcp-token-repository";
import { SettingsNotice, SettingsView } from "@/features/settings/settings-view";

const ORIGIN = "https://built-daily-two.vercel.app";

const TOKENS: McpTokenSummary[] = [
  { id: "t1", label: "Claude on my phone", createdAt: "2026-10-02T12:00:00Z", lastUsedAt: "2026-11-09T18:20:00Z" },
  { id: "t2", label: "Claude Desktop", createdAt: "2026-09-14T12:00:00Z", lastUsedAt: null },
];

const FEED_URL = `${ORIGIN}/api/calendar/bd_cal_Vb3nQ8sLx2Tk9Rw4Hy7cJm1pZf6aDe5u.ics`;

type Seed = {
  isPublic: boolean;
  tokens: McpTokenSummary[];
  newToken?: string | null;
  loaded?: boolean;
  calendarUrl?: string | null;
};

/** The view with in-memory state, so the switch, generate and revoke all respond. */
function Interactive({ isPublic, tokens, newToken = null, loaded = true, calendarUrl = null }: Seed) {
  const [pub, setPub] = useState(isPublic);
  const [list, setList] = useState(tokens);
  const [fresh, setFresh] = useState<string | null>(newToken);
  const [feedUrl, setFeedUrl] = useState<string | null>(calendarUrl);
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
      calendar={{
        loaded,
        url: feedUrl,
        busy: false,
        error: null,
        onCreate: () => setFeedUrl(`${ORIGIN}/api/calendar/bd_cal_${Date.now().toString(36)}Kp4wXs9Lq2Nv7Rt3.ics`),
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

/** Profile shared, a calendar link made, and two tokens in use. */
export const PublicWithTokens: Story = { args: { isPublic: true, tokens: TOKENS, calendarUrl: FEED_URL } };

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

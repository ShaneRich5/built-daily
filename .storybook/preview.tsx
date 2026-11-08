import type { Preview } from "@storybook/nextjs-vite";
import { Geist, Geist_Mono } from "next/font/google";
import "../app/globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

const preview: Preview = {
  parameters: {
    layout: "fullscreen",
    controls: { expanded: true },
    a11y: {
      // Report accessibility issues in the panel without failing the story.
      test: "todo",
    },
  },
  globalTypes: {
    theme: {
      description: "Light or dark mode",
      toolbar: {
        title: "Theme",
        icon: "mirror",
        items: [
          { value: "light", title: "Light" },
          { value: "dark", title: "Dark" },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: { theme: "light" },
  decorators: [
    (Story, context) => {
      const dark = context.globals.theme === "dark";
      // `frame: "none"` lets full-screen stories manage their own width.
      const framed = context.parameters.frame !== "none";
      return (
        <div
          className={`${geistSans.variable} ${geistMono.variable} ${dark ? "dark" : ""}`}
          style={{ minHeight: "100vh" }}
        >
          <div className="min-h-screen bg-background font-sans text-foreground">
            {framed ? (
              <div className="mx-auto w-full max-w-[390px] px-4 py-6">
                <Story />
              </div>
            ) : (
              <Story />
            )}
          </div>
        </div>
      );
    },
  ],
};

export default preview;

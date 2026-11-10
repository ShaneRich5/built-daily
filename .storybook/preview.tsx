import type { Preview } from "@storybook/nextjs-vite";
import { Geist, Geist_Mono } from "next/font/google";
import { useEffect } from "react";
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
    width: {
      description: "Content width: a phone, or the app's desktop column",
      toolbar: {
        title: "Width",
        icon: "mobile",
        items: [
          { value: "phone", title: "Phone (390px)" },
          { value: "desktop", title: "Desktop (672px)" },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: { theme: "light", width: "phone" },
  decorators: [
    function AppFrame(Story, context) {
      const dark = context.globals.theme === "dark";
      // `frame: "none"` lets full-screen stories manage their own width.
      const framed = context.parameters.frame !== "none";
      const fontClasses = `${geistSans.variable} ${geistMono.variable}`;
      // Sheets and menus render in a portal on <body>, outside the wrapper below, so the
      // fonts and dark mode go on <html> too (as the app's root layout does).
      useEffect(() => {
        const root = document.documentElement;
        root.classList.add(...fontClasses.split(" "));
        root.classList.toggle("dark", dark);
        document.body.classList.add(geistSans.className, "bg-background", "text-foreground");
      }, [dark, fontClasses]);
      const width = context.globals.width === "desktop" ? "max-w-[672px]" : "max-w-[390px]";
      return (
        <div
          className={`${geistSans.variable} ${geistMono.variable} ${dark ? "dark" : ""}`}
          style={{ minHeight: "100vh" }}
        >
          <div className="min-h-screen bg-background font-sans text-foreground">
            {framed ? (
              <div className={`mx-auto w-full ${width} px-4 py-6`}>
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

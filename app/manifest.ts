import type { MetadataRoute } from "next";

/**
 * Web app manifest (served at /manifest.webmanifest). With the service worker
 * in public/sw.js, this makes Built Daily installable from the browser:
 * "Add to Home Screen" on iOS, "Install app" on Android and desktop Chrome.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Built Daily",
    short_name: "Built Daily",
    description: "A simple workout journal focused on consistency and showing up.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#fafafa",
    theme_color: "#fafafa",
    categories: ["health", "fitness", "lifestyle"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Start a workout", short_name: "Start", url: "/workout" },
      { name: "Planner", url: "/planner" },
    ],
  };
}

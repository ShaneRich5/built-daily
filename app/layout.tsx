import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AccountBar } from "@/components/account-bar";
import { AuthProvider } from "@/components/auth-provider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
  adjustFontFallback: true,
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
  adjustFontFallback: true,
});

export const metadata: Metadata = {
  title: {
    default: "Built Daily",
    template: "%s · Built Daily",
  },
  description:
    "A simple workout journal focused on consistency and showing up.",
  applicationName: "Built Daily",
  appleWebApp: {
    capable: true,
    title: "Built Daily",
    statusBarStyle: "default",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafafa" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full`}
    >
      <body
        className={`${geistSans.className} min-h-full bg-background text-foreground text-base leading-normal subpixel-antialiased`}
        suppressHydrationWarning
      >
        <AuthProvider>
          <div className="mx-auto flex min-h-full w-full max-w-2xl flex-col px-4 py-6 sm:px-5 sm:py-8">
            <AccountBar />
            {children}
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}

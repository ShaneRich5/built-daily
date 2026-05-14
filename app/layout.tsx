import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AccountBar } from "@/components/account-bar";
import { AuthProvider } from "@/components/auth-provider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
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
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-background text-foreground font-sans text-base leading-normal">
        <AuthProvider>
          <div className="mx-auto flex min-h-full w-full max-w-lg flex-col px-4 py-6 sm:px-5 sm:py-8">
            <AccountBar />
            {children}
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}

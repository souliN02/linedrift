import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "LineDrift — Football Odds Tracker",
    template: "%s · LineDrift",
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    url: SITE_URL,
    title: "LineDrift — Football Odds Tracker",
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: "LineDrift — Football Odds Tracker",
    description: SITE_DESCRIPTION,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`dark ${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <header className="border-b border-border">
          <div className="mx-auto flex w-full max-w-3xl items-center justify-between px-6 py-4">
            <Link
              href="/"
              className="font-mono text-sm font-semibold tracking-tight transition-opacity hover:opacity-80"
            >
              Line<span className="text-primary">Drift</span>
            </Link>
            <nav
              aria-label="Primary"
              className="flex items-center gap-1 text-sm"
            >
              <Link
                href="/"
                className="rounded-md px-2.5 py-1 text-muted-foreground transition-colors hover:text-foreground"
              >
                Dashboard
              </Link>
              <Link
                href="/about"
                className="rounded-md px-2.5 py-1 text-muted-foreground transition-colors hover:text-foreground"
              >
                About
              </Link>
            </nav>
          </div>
        </header>

        {children}

        <footer className="border-t border-border px-6 py-8">
          <div className="mx-auto flex w-full max-w-3xl flex-col gap-1 px-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <p>Educational analytics project. Not betting advice.</p>
            <p className="font-mono">
              Data:{" "}
              <a
                href="https://the-odds-api.com"
                className="transition-colors hover:text-foreground"
                target="_blank"
                rel="noreferrer"
              >
                The Odds API
              </a>
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}

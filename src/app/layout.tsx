import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "OddsLens — Football Odds Tracker",
  description:
    "Educational analytics project that snapshots bookmaker odds over time, computes no-vig consensus probabilities, and flags value. Not betting advice.",
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
        {children}
        <footer className="border-t border-border px-6 py-6 text-center text-xs text-muted-foreground">
          Educational analytics project. Not betting advice.
        </footer>
      </body>
    </html>
  );
}

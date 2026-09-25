import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
// Default styles for BarVisualizer and other LiveKit components, loaded before ours.
import "@livekit/components-styles";
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
  title: "Voice Freight Negotiator",
  description:
    "Can you talk an AI into overpaying? Call Alex, a voice agent that hires trucks by phone, and try to push it past a limit that lives in code.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}

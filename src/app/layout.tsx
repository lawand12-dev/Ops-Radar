import type { Metadata } from "next";
import localFont from "next/font/local";
import { Analytics } from "@vercel/analytics/react";
import { SITE_URL } from "<npm>/lib/constants";
import "./globals.css";
import { FloatingAiAssistant } from "../components/ui/glowing-ai-chat-assistant";
import MobileDock from "<npm>/components/ui/mobile-dock";

const sansFont = localFont({
  src: [
    {
      path: "./fonts/NotoSansDisplay-Regular.ttf",
      weight: "400",
      style: "normal",
    },
    {
      path: "./fonts/NotoSansDisplay-Bold.ttf",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-sans-loaded",
  display: "swap",
});

const serifFont = localFont({
  src: [
    {
      path: "./fonts/NotoSerifDisplay-Regular.ttf",
      weight: "400",
      style: "normal",
    },
    {
      path: "./fonts/NotoSerifDisplay-Bold.ttf",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-serif-loaded",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? SITE_URL),
  title: {
    default: "OpsRadar — Done-For-You Automation for Agencies",
    template: "%s — OpsRadar",
  },
  description:
    "I build, host, and maintain custom n8n automations for agencies. You tell me what's broken. I fix it. You never touch a workflow.",
  openGraph: {
    type: "website",
    siteName: "OpsRadar",
    title: "OpsRadar — Done-For-You Automation for Agencies",
    description:
      "I build, host, and maintain custom n8n automations for agencies. You tell me what's broken. I fix it. You never touch a workflow.",
    url: SITE_URL,
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "OpsRadar — Done-For-You Automation for Agencies" }],
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "OpsRadar — Done-For-You Automation for Agencies",
    description:
      "I build, host, and maintain custom n8n automations for agencies. You tell me what's broken. I fix it. You never touch a workflow.",
    images: ["/og-image.png"],
    creator: "@ops_radar",
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-16x16.png", type: "image/png", sizes: "16x16" },
      { url: "/favicon-32x32.png", type: "image/png", sizes: "32x32" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180" },
    ],
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
      className={`dark h-full antialiased ${sansFont.variable} ${serifFont.variable}`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <FloatingAiAssistant />
        <MobileDock />
        <Analytics />
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import localFont from "next/font/local";
import { Analytics } from "@vercel/analytics/react";
import { SITE_URL } from "<npm>/lib/constants";
import "./globals.css";

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
    default: "OpsRadar — AI Operating System for Agencies",
    template: "%s — OpsRadar",
  },
  description:
    "OpsRadar builds the AI Operating System for your agency. Your brain. Your workflows. Your Claude interface. Getting smarter every week.",
  openGraph: {
    type: "website",
    siteName: "OpsRadar",
    title: "OpsRadar — AI Operating System for Agencies",
    description:
      "OpsRadar builds the AI Operating System for your agency. Your brain. Your workflows. Your Claude interface. Getting smarter every week.",
    url: SITE_URL,
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "OpsRadar — AI Operating System for Agencies" }],
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "OpsRadar — AI Operating System for Agencies",
    description:
      "OpsRadar builds the AI Operating System for your agency. Your brain. Your workflows. Your Claude interface. Getting smarter every week.",
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
  verification: {
    google: 'FxtvozygrT4QLklfJLaPSN_7XfrzvTem1BGCTOykSCU',
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
        <Analytics />
      </body>
    </html>
  );
}

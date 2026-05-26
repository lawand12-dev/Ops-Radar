import type { Metadata } from "next";
import { Inter_Tight, Instrument_Serif, JetBrains_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import { headers } from "next/headers";
import { SITE_URL } from "<npm>/lib/constants";
import { Toaster } from "<npm>/components/ui/toast";
import { ThemeSync } from "<npm>/components/theme-sync";
import { StatsigAnalyticsProvider } from "<npm>/components/analytics/statsig-provider";
import "./globals.css";

const interTight = Inter_Tight({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-sans-loaded",
  display: "swap",
});

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-serif-loaded",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono-loaded",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? SITE_URL),
  title: {
    default: "OpsRadar — The AI COO for Marketing Agencies",
    template: "%s · OpsRadar",
  },
  description:
    "OpsRadar is the AI COO for marketing agencies. Live on your stack in week one. Catches the unprofitable client in week 2, not month 3. From $750/month.",
  openGraph: {
    type: "website",
    siteName: "OpsRadar",
    title: "OpsRadar — The AI COO for Marketing Agencies",
    description:
      "Live on your stack in week one. Catches the unprofitable client in week 2, not month 3. From $750/month — one-tenth the cost of a fractional COO.",
    url: SITE_URL,
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "OpsRadar — The AI COO for Marketing Agencies" }],
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "OpsRadar — The AI COO for Marketing Agencies",
    description:
      "Live on your stack in week one. Catches the unprofitable client in week 2, not month 3. From $750/month.",
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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const headerList = await headers();
  const theme = headerList.get("x-theme") === "dark" ? "dark" : "light";
  return (
    <html
      lang="en"
      data-theme={theme}
      className={`h-full antialiased ${interTight.variable} ${instrumentSerif.variable} ${jetbrainsMono.variable}`}
    >
      <body className="min-h-full flex flex-col">
        <ThemeSync />
        <StatsigAnalyticsProvider>
          {children}
        </StatsigAnalyticsProvider>
        <Toaster />
        <Analytics />
      </body>
    </html>
  );
}

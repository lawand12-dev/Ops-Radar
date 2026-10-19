import type { Metadata } from "next";
import { Inter_Tight, Instrument_Serif, JetBrains_Mono } from "next/font/google";
import { SITE_URL } from "<npm>/lib/constants";
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
  metadataBase: new URL(SITE_URL),
  title: {
    default: "OpsRadar — Operations Intelligence",
    template: "%s · OpsRadar",
  },
  description:
    "The OpsRadar public website. Product access is currently unavailable.",
  openGraph: {
    type: "website",
    siteName: "OpsRadar",
    title: "OpsRadar — Operations Intelligence",
    description: "The OpsRadar public website. Product access is currently unavailable.",
    url: SITE_URL,
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "OpsRadar — The AI COO for Marketing Agencies" }],
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "OpsRadar — Operations Intelligence",
    description: "The OpsRadar public website. Product access is currently unavailable.",
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
      data-theme="light"
      className={`h-full antialiased ${interTight.variable} ${instrumentSerif.variable} ${jetbrainsMono.variable}`}
    >
      <body className="min-h-full flex flex-col">
        <aside className="border-b border-[var(--color-border)] bg-[var(--color-surface-sunken)] px-4 py-2 text-center text-caption text-[var(--color-fg-muted)]">
          OpsRadar product access is currently unavailable. This site is informational only.
        </aside>
        {children}
      </body>
    </html>
  );
}

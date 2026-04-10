import type { Metadata } from "next";
import localFont from "next/font/local";
import Script from "next/script";
import "./globals.css";
import ChatWidget from "./components/ChatWidget";
import ChatNotification from "./components/ChatNotification";
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

const themeInitScript = `
  (() => {
    try {
      const storageKey = 'opsradar-theme';
      const storedTheme = window.localStorage.getItem(storageKey);
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const theme = storedTheme === 'light' || storedTheme === 'dark'
        ? storedTheme
        : (prefersDark ? 'dark' : 'light');

      document.documentElement.classList.toggle('dark', theme === 'dark');
    } catch (_) {
      document.documentElement.classList.remove('dark');
    }
  })();
`;

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'https://opsradar.ai'),
  title: {
    default: "OpsRadar — Done-For-You Automation for Agencies",
    template: "%s — OpsRadar",
  },
  description:
    "We build, host, and maintain custom automation systems for agencies. Stop wasting hours on manual work — start your free operations audit today.",
  openGraph: {
    type: "website",
    siteName: "OpsRadar",
    title: "OpsRadar — Done-For-You Automation for Agencies",
    description:
      "We build, host, and maintain custom automation systems for agencies. Stop wasting hours on manual work — start your free operations audit today.",
    images: [{ url: "/logo.png", width: 1024, height: 1024, alt: "OpsRadar" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "OpsRadar — Done-For-You Automation for Agencies",
    description:
      "We build, host, and maintain custom automation systems for agencies. Stop wasting hours on manual work — start your free operations audit today.",
    images: ["/logo.png"],
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
      suppressHydrationWarning
      className={`h-full antialiased ${sansFont.variable} ${serifFont.variable}`}
    >
      <head>
        <Script id="theme-init" strategy="beforeInteractive">
          {themeInitScript}
        </Script>
      </head>
      <body className="min-h-full flex flex-col">
        {children}
        <ChatNotification />
        <ChatWidget />
        <MobileDock />
      </body>
    </html>
  );
}

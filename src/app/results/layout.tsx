import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: "Your Audit Results",
  description:
    "Your personalized automation roadmap is ready. See your readiness score, top opportunities, and estimated time and cost savings.",
  openGraph: {
    title: "Your Audit Results — OpsRadar",
    description:
      "Your personalized automation roadmap is ready. See your readiness score, top opportunities, and estimated time and cost savings.",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Your Audit Results — OpsRadar" }],
  },
  twitter: {
    title: "Your Audit Results — OpsRadar",
    description:
      "Your personalized automation roadmap is ready. See your readiness score, top opportunities, and estimated time and cost savings.",
    images: ["/og-image.png"],
  },
}

export default function ResultsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

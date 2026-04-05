import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: "Your Audit Results",
  description:
    "Your personalized automation roadmap is ready. See your readiness score, top opportunities, and estimated time and cost savings.",
  openGraph: {
    title: "Your Audit Results — OpsRadar",
    description:
      "Your personalized automation roadmap is ready. See your readiness score, top opportunities, and estimated time and cost savings.",
    images: [{ url: "/logo.png", width: 1024, height: 1024, alt: "OpsRadar" }],
  },
  twitter: {
    title: "Your Audit Results — OpsRadar",
    description:
      "Your personalized automation roadmap is ready. See your readiness score, top opportunities, and estimated time and cost savings.",
    images: ["/logo.png"],
  },
}

export default function ResultsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

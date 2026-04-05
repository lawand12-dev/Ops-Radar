import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: "Free Operations Audit",
  description:
    "Answer 12 questions about your agency. Get a custom AI audit showing what to automate, estimated time savings, and exact implementation blueprints. Free in under 60 seconds.",
  openGraph: {
    title: "Free Operations Audit — OpsRadar",
    description:
      "Answer 12 questions about your agency. Get a custom AI audit showing what to automate, estimated time savings, and exact implementation blueprints. Free in under 60 seconds.",
    images: [{ url: "/logo.png", width: 1024, height: 1024, alt: "OpsRadar" }],
  },
  twitter: {
    title: "Free Operations Audit — OpsRadar",
    description:
      "Answer 12 questions about your agency. Get a custom AI audit showing what to automate, estimated time savings, and exact implementation blueprints. Free in under 60 seconds.",
    images: ["/logo.png"],
  },
}

export default function AuditLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

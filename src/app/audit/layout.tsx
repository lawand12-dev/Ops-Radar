import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Free Automation Audit — OpsRadar',
  description:
    'Get a 3-minute AI audit that shows exactly where your agency is losing time and money on manual operations. Free, no signup before results.',
  openGraph: {
    title: 'Free Automation Audit — OpsRadar',
    description:
      'Get a 3-minute AI audit that shows exactly where your agency is losing time and money on manual operations.',
    url: 'https://www.opsradar.co/audit',
    siteName: 'OpsRadar',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'OpsRadar — Free Automation Audit',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Free Automation Audit — OpsRadar',
    description:
      'Get a 3-minute AI audit that shows exactly where your agency is losing time and money.',
    images: ['/og-image.png'],
  },
}

export default function AuditLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}

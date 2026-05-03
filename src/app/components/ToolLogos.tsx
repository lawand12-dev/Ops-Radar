'use client'

function SlackIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-label="Slack">
      {/* Slack hash-mark symbol — 4 rounded bars */}
      <rect x="6"  y="13" width="5" height="12" rx="2.5" fill="#E01E5A" />
      <rect x="6"  y="7"  width="5" height="5"  rx="2.5" fill="#E01E5A" />
      <rect x="13" y="7"  width="12" height="5" rx="2.5" fill="#ECB22E" />
      <rect x="21" y="7"  width="5" height="12" rx="2.5" fill="#ECB22E" />
      <rect x="21" y="20" width="5" height="5"  rx="2.5" fill="#2EB67D" />
      <rect x="13" y="20" width="12" height="5" rx="2.5" fill="#2EB67D" />
      <rect x="6"  y="20" width="5" height="5"  rx="2.5" fill="#36C5F0" />
      <rect x="13" y="13" width="12" height="5" rx="2.5" fill="#36C5F0" />
    </svg>
  )
}

function HubSpotIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-label="HubSpot">
      <circle cx="22" cy="10" r="5" fill="#FF7A59" />
      <circle cx="22" cy="10" r="2.5" fill="white" />
      <path d="M17.5 10h-7a4.5 4.5 0 0 0 0 9h7" stroke="#FF7A59" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="10.5" cy="22.5" r="3" fill="#FF7A59" />
    </svg>
  )
}

function GoogleWorkspaceIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-label="Google Workspace">
      <path d="M28 16.3c0-.9-.08-1.76-.23-2.6H16v4.9h6.7a5.74 5.74 0 0 1-2.48 3.77v3.13h4.02C26.6 23.4 28 20.1 28 16.3z" fill="#4285F4" />
      <path d="M16 28c3.36 0 6.18-1.12 8.24-3.02l-4.02-3.13c-1.11.75-2.54 1.19-4.22 1.19-3.24 0-5.99-2.19-6.97-5.13H4.9v3.23C6.94 25.64 11.18 28 16 28z" fill="#34A853" />
      <path d="M9.03 17.91A7.16 7.16 0 0 1 8.66 16c0-.66.11-1.3.37-1.91V10.86H4.9A12 12 0 0 0 4 16c0 1.93.46 3.76 1.28 5.14l4.75-3.23z" fill="#FBBC05" />
      <path d="M16 8.96c1.83 0 3.47.63 4.76 1.86l3.57-3.57C22.17 5.12 19.36 4 16 4 11.18 4 6.94 6.36 4.9 10.86l4.13 3.23C10.01 11.15 12.76 8.96 16 8.96z" fill="#EA4335" />
    </svg>
  )
}

function NotionIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-label="Notion">
      <rect x="5" y="4" width="22" height="24" rx="3" fill="#fff" />
      <path d="M10 8h8l6 7v9a2 2 0 0 1-2 2H10a2 2 0 0 1-2-2V10a2 2 0 0 1 2-2z" fill="#F7F6F3" stroke="#E8E8E6" strokeWidth="1" />
      <path d="M18 8v7h6" fill="#E8E8E6" stroke="#E8E8E6" strokeWidth="1" />
      <line x1="10" y1="16" x2="22" y2="16" stroke="#C4C4C0" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="10" y1="19.5" x2="20" y2="19.5" stroke="#C4C4C0" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="10" y1="23" x2="18" y2="23" stroke="#C4C4C0" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function AirtableIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-label="Airtable">
      <rect x="4"  y="4"  width="11" height="11" rx="2" fill="#FCB400" />
      <rect x="17" y="4"  width="11" height="11" rx="2" fill="#18BFFF" />
      <rect x="4"  y="17" width="11" height="11" rx="2" fill="#F82B60" />
      <rect x="17" y="17" width="11" height="11" rx="2" fill="#20C933" />
    </svg>
  )
}

function StripeIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-label="Stripe">
      <rect width="32" height="32" rx="6" fill="#635BFF" />
      <path
        d="M15.2 12.8c0-1.06.87-1.47 2.3-1.47 2.06 0 4.67.62 6.73 1.73V8.4a17.9 17.9 0 0 0-6.73-1.24c-5.5 0-9.2 2.88-9.2 7.68 0 7.49 10.32 6.29 10.32 9.52 0 1.25-1.09 1.65-2.6 1.65-2.25 0-5.13-.93-7.4-2.17v5.72c2.52 1.09 5.07 1.54 7.4 1.54 5.64 0 9.5-2.8 9.5-7.64-.03-8.09-10.32-6.65-10.32-9.66z"
        fill="white"
      />
    </svg>
  )
}

const logos = [
  { name: 'Slack',             Icon: SlackIcon },
  { name: 'HubSpot',           Icon: HubSpotIcon },
  { name: 'Google Workspace',  Icon: GoogleWorkspaceIcon },
  { name: 'Notion',            Icon: NotionIcon },
  { name: 'Airtable',         Icon: AirtableIcon },
  { name: 'Stripe',            Icon: StripeIcon },
]

export default function ToolLogos() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-10 sm:gap-14">
      {logos.map(({ name, Icon }) => (
        <div
          key={name}
          className="flex flex-col items-center gap-2 opacity-35 hover:opacity-80 grayscale hover:grayscale-0 transition-all duration-300 cursor-default"
          title={name}
        >
          <Icon />
          <span className="text-[10px] text-zinc-600 tracking-wide">{name}</span>
        </div>
      ))}
    </div>
  )
}

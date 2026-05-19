import { CALENDLY_STRATEGY_CALL_URL } from '<npm>/lib/constants'

export default function BookCallButton({
  label = 'Book a free 30-min call',
  className = '',
}: {
  label?: string
  className?: string
}) {
  return (
    <a
      href={CALENDLY_STRATEGY_CALL_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center justify-center gap-2 px-8 py-4 rounded-lg font-semibold text-sm text-white/80 border border-white/20 hover:border-white/40 hover:text-white transition-colors ${className}`}
    >
      {label} →
    </a>
  )
}

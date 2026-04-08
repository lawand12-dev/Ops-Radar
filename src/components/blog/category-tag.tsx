import { Badge } from '<npm>/components/ui/badge'
import { cn } from '<npm>/lib/utils'

const categoryStyles: Record<string, string> = {
  'Sales Ops': 'border-primary/20 bg-primary/10 text-primary',
  AI: 'border-secondary/20 bg-secondary/10 text-secondary',
  Reporting: 'border-emerald-300/20 bg-emerald-300/10 text-emerald-300',
  Automation: 'border-tertiary/20 bg-tertiary/10 text-tertiary',
}

export function CategoryTag({
  category,
  className,
}: {
  category: string
  className?: string
}) {
  return (
    <Badge
      variant="outline"
      className={cn(
        'h-auto rounded-full border px-3 py-1 text-[0.72rem] font-semibold uppercase tracking-[0.18em]',
        categoryStyles[category] ?? 'border-white/10 bg-white/[0.04] text-on-surface-variant',
        className
      )}
    >
      {category}
    </Badge>
  )
}

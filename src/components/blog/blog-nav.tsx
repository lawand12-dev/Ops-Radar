import Image from 'next/image'
import Link from 'next/link'

import { Button } from '<npm>/components/ui/button'

export function BlogNav() {
  return (
    <header className="sticky top-0 z-40 border-b border-white/8 bg-surface-container-lowest/80 backdrop-blur-2xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4 md:px-8">
        <Link href="/" className="flex min-w-0 items-center gap-3">
          <Image
            src="/logo.png"
            alt="OpsRadar"
            width={36}
            height={36}
            className="h-9 w-9 rounded-xl object-cover"
          />
          <div className="min-w-0">
            <p className="truncate font-headline text-lg font-semibold tracking-tight text-on-surface">
              OpsRadar
            </p>
            <p className="truncate text-xs uppercase tracking-[0.22em] text-on-surface-variant">
              Resource Library
            </p>
          </div>
        </Link>

        <div className="flex items-center gap-2 md:gap-3">
          <Link
            href="/blog"
            className="hidden rounded-full border border-white/10 px-4 py-2 text-sm font-medium text-on-surface-variant transition-colors hover:border-primary/25 hover:text-on-surface md:inline-flex"
          >
            Blog Index
          </Link>
          <Button
            asChild
            className="rounded-full bg-primary-container px-4 text-on-primary-container hover:bg-primary-container/80"
          >
            <Link href="/audit">Start Audit</Link>
          </Button>
        </div>
      </div>
    </header>
  )
}

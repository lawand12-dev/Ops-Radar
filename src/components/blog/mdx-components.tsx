import type { ComponentProps } from 'react'

import Link from 'next/link'

import { cn } from '<npm>/lib/utils'

function MdxLink({
  href = '',
  className,
  ...props
}: ComponentProps<'a'>) {
  const linkClassName = cn(
    'font-semibold text-primary underline decoration-primary/30 underline-offset-4 transition-colors hover:text-secondary hover:decoration-secondary/40',
    className
  )

  if (href.startsWith('/')) {
    return (
      <Link href={href} className={linkClassName}>
        {props.children}
      </Link>
    )
  }

  const isExternal = /^https?:\/\//.test(href)

  return (
    <a
      href={href}
      className={linkClassName}
      rel={isExternal ? 'noreferrer' : undefined}
      target={isExternal ? '_blank' : undefined}
      {...props}
    />
  )
}

export const blogMdxComponents = {
  a: MdxLink,
}

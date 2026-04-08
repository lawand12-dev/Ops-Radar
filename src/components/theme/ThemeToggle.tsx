'use client'

import { MoonStar, SunMedium } from 'lucide-react'
import { useEffect, useState } from 'react'

import { cn } from '<npm>/lib/utils'

const THEME_STORAGE_KEY = 'opsradar-theme'

type Theme = 'light' | 'dark'

function readTheme(): Theme {
  if (typeof document === 'undefined') {
    return 'light'
  }

  return document.documentElement.classList.contains('dark') ? 'dark' : 'light'
}

function applyTheme(nextTheme: Theme) {
  const root = document.documentElement

  root.classList.toggle('dark', nextTheme === 'dark')
  window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme)
}

export default function ThemeToggle({
  className,
  showLabel = false,
}: {
  className?: string
  showLabel?: boolean
}) {
  const [theme, setTheme] = useState<Theme>('light')

  useEffect(() => {
    setTheme(readTheme())
  }, [])

  const nextTheme = theme === 'dark' ? 'light' : 'dark'

  return (
    <button
      type="button"
      onClick={() => {
        applyTheme(nextTheme)
        setTheme(nextTheme)
      }}
      aria-label={`Switch to ${nextTheme} mode`}
      title={`Switch to ${nextTheme} mode`}
      className={cn('theme-toggle-header', className)}
    >
      {theme === 'dark' ? (
        <SunMedium className="h-4 w-4" />
      ) : (
        <MoonStar className="h-4 w-4" />
      )}
      {showLabel ? (
        <span className="hidden text-[12px] font-semibold sm:inline">
          {theme === 'dark' ? 'Light' : 'Dark'}
        </span>
      ) : null}
    </button>
  )
}

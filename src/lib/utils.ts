import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function stripWrappingQuotes(s: string): string {
  if (typeof s !== 'string') return s
  const trimmed = s.trim()
  if (trimmed.length >= 2) {
    const first = trimmed[0]
    const last = trimmed[trimmed.length - 1]
    const quoteChars = ['"', "'", '“', '”', '‘', '’']
    if (quoteChars.includes(first) && quoteChars.includes(last)) {
      return trimmed.slice(1, -1).trim()
    }
  }
  return trimmed
}

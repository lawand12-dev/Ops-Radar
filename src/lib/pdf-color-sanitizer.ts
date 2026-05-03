import { converter, formatRgb } from 'culori'

const toRgb = converter('rgb')

const COLOR_PROPS = [
  'color',
  'backgroundColor',
  'backgroundImage',
  'borderTopColor',
  'borderRightColor',
  'borderBottomColor',
  'borderLeftColor',
  'borderImageSource',
  'outlineColor',
  'fill',
  'stroke',
  'caretColor',
  'textDecorationColor',
] as const

/**
 * Replace every oklch(...), oklab(...), or color-mix(...) call inside a CSS
 * value string with its sRGB equivalent.  Works for standalone color values
 * *and* for colors embedded inside gradient functions.
 */
function convertColorValue(value: string): string | null {
  if (!value) return null
  if (!/oklch|oklab|color-mix/i.test(value)) return null

  try {
    const result = value.replace(
      /(oklch|oklab|color-mix)\s*\(([^()]*(?:\([^()]*\)[^()]*)*)\)/gi,
      (match) => {
        try {
          const rgb = toRgb(match)
          if (!rgb) return match
          return formatRgb(rgb)
        } catch {
          return match
        }
      },
    )

    // If unconverted oklch/oklab tokens remain the replacement was partial;
    // return null so we don't apply a half-broken inline style.
    if (/oklch|oklab|color-mix/i.test(result)) {
      return null
    }

    return result
  } catch {
    return null
  }
}

/**
 * Walks the DOM tree under `root` and converts any oklch/oklab/color-mix
 * color values to standard RGB inline styles so html2canvas can parse them.
 * Returns a restore function that reverts all changes.
 */
export function sanitizeColorsForPdf(root: HTMLElement): () => void {
  const originalStyles: Array<{ el: HTMLElement; prop: string; value: string }> = []

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT)
  let current: Node | null = walker.currentNode

  while (current) {
    if (current instanceof HTMLElement) {
      const computed = window.getComputedStyle(current)

      for (const prop of COLOR_PROPS) {
        const cssProp = prop.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase())
        const value = computed.getPropertyValue(cssProp)
        const converted = convertColorValue(value)

        if (converted) {
          originalStyles.push({
            el: current,
            prop,
            value: current.style.getPropertyValue(cssProp),
          })
          ;(current.style as any)[prop] = converted
        }
      }
    }
    current = walker.nextNode()
  }

  return () => {
    for (const { el, prop, value } of originalStyles) {
      const cssProp = prop.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase())
      if (value) {
        el.style.setProperty(cssProp, value)
      } else {
        el.style.removeProperty(cssProp)
      }
    }
  }
}

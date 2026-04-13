import { converter, formatRgb } from 'culori'

const toRgb = converter('rgb')

const COLOR_PROPS = [
  'color',
  'backgroundColor',
  'borderTopColor',
  'borderRightColor',
  'borderBottomColor',
  'borderLeftColor',
  'outlineColor',
  'fill',
  'stroke',
  'caretColor',
  'textDecorationColor',
] as const

function convertColorValue(value: string): string | null {
  if (!value) return null
  if (!/oklch|oklab|color-mix/i.test(value)) return null

  try {
    const rgb = toRgb(value)
    if (!rgb) return null
    return formatRgb(rgb)
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

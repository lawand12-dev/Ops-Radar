'use client'

import type html2pdfType from 'html2pdf.js'
import { sanitizeColorsForPdf } from './pdf-color-sanitizer'

export async function generateAuditPdf(
  elementId: string,
  filename: string
): Promise<void> {
  // Dynamically import html2pdf to avoid SSR issues
  const html2pdf = (await import('html2pdf.js')).default as typeof html2pdfType

  const element = document.getElementById(elementId)
  if (!element) {
    throw new Error(`Element #${elementId} not found`)
  }

  // Force all AnimatedNumber / CountUp instances to their final values
  // so the PDF capture doesn't snapshot mid-animation zeros.
  const animatedEls = element.querySelectorAll<HTMLElement>('[data-animated-number]')
  animatedEls.forEach((el) => {
    const target = el.getAttribute('data-target-value')
    if (target) {
      el.textContent = target
    }
  })

  // Force all scroll-reveal sections into their visible state.
  // RevealSection / FadeInOnScroll rely on IntersectionObserver to add
  // `.visible`, but html2canvas snapshots the DOM as-is — any section the
  // user hasn't scrolled to yet still has `opacity: 0` and would render
  // as blank pages in the PDF. We add `.visible` to every `.reveal` so
  // the screenshot captures them fully rendered.
  const revealEls = element.querySelectorAll<HTMLElement>('.reveal')
  revealEls.forEach((el) => {
    el.classList.add('visible')
  })

  // Let the DOM update settle before capture (two RAFs to be safe —
  // one for class additions, one for style recalc).
  await new Promise((resolve) => requestAnimationFrame(resolve))
  await new Promise((resolve) => requestAnimationFrame(resolve))

  // Convert oklch/oklab/color-mix values to RGB so html2canvas can parse them
  const restoreColors = sanitizeColorsForPdf(element)

  const opt = {
    margin: [0.5, 0.5, 0.5, 0.5] as [number, number, number, number],
    filename,
    image: { type: 'jpeg' as const, quality: 0.98 },
    html2canvas: {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#000000',
    },
    jsPDF: {
      unit: 'in',
      format: 'letter',
      orientation: 'portrait' as const,
      compress: true,
    },
    pagebreak: {
      mode: ['css', 'legacy'],
      avoid: ['img', 'tr', 'blockquote', '[data-pdf-avoid-break]'],
    },
  }

  try {
    await html2pdf().set(opt).from(element).save()
  } finally {
    restoreColors()

    // Remove any overlay/container divs html2pdf left behind.
    // html2pdf does not clean up on error, leaving a full-viewport
    // overlay that blocks all pointer events on the page.
    document.querySelectorAll('.html2pdf__overlay, .html2pdf__container').forEach((el) => el.remove())
  }
}

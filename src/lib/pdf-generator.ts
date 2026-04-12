'use client'

import type html2pdfType from 'html2pdf.js'

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

  // Let the DOM update settle before capture
  await new Promise((resolve) => requestAnimationFrame(resolve))

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
    pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
  }

  await html2pdf().set(opt).from(element).save()
}

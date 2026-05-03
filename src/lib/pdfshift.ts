// src/lib/pdfshift.ts

export interface PdfShiftFooter {
  source: string
  height?: string
}

export interface PdfShiftOptions {
  footer?: PdfShiftFooter
  header?: PdfShiftFooter
  format?: 'A4' | 'Letter'
  landscape?: boolean
}

export async function htmlToPdf(
  html: string,
  options: PdfShiftOptions = {},
): Promise<Buffer> {
  const apiKey = process.env.PDFSHIFT_API_KEY
  if (!apiKey) throw new Error('PDFSHIFT_API_KEY is not set')

  const credentials = Buffer.from(`api:${apiKey}`).toString('base64')

  const body: Record<string, unknown> = {
    source: html,
    landscape: options.landscape ?? false,
    format: options.format ?? 'A4',
  }
  if (options.footer) body.footer = options.footer
  if (options.header) body.header = options.header

  const res = await fetch('https://api.pdfshift.io/v3/convert/pdf', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`PDFShift error ${res.status}: ${text}`)
  }

  const arrayBuffer = await res.arrayBuffer()
  return Buffer.from(arrayBuffer)
}

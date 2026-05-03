import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin/', '/api/', '/results'],
      },
    ],
    sitemap: 'https://www.opsradar.co/sitemap.xml',
    host: 'https://www.opsradar.co',
  }
}

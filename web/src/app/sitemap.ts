import type { MetadataRoute } from 'next'
import { connection } from 'next/server'

import { siteConfig } from '@/config/site'
import { searchProducts } from '@/lib/data/catalog'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  await connection()
  const base = siteConfig.url
  const pages = ['', '/catalog', '/calculator', '/how-it-works', '/faq', '/apply', '/contacts', '/privacy']
  const products = await searchProducts()
  return [
    ...pages.map((p) => ({ url: `${base}${p}`, changeFrequency: 'weekly' as const, priority: p === '' ? 1 : 0.7 })),
    ...products
      .filter((p) => !p.demo)
      .map((p) => ({ url: `${base}/catalog/${p.slug}`, lastModified: p.updatedAt, priority: 0.6 })),
  ]
}

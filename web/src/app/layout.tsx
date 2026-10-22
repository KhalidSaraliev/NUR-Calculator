import type { Metadata, Viewport } from 'next'
import { Manrope } from 'next/font/google'

import { siteConfig } from '@/config/site'

import './globals.css'

const font = Manrope({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-sans',
  display: 'swap',
})

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: 'NUR Invest — покупка товаров с оплатой частями без процентов',
    template: '%s — NUR Invest',
  },
  description: siteConfig.description,
  applicationName: 'NUR Invest',
  openGraph: {
    type: 'website',
    locale: 'ru_RU',
    siteName: 'NUR Invest',
    title: 'NUR Invest — покупка товаров с оплатой частями без процентов',
    description: siteConfig.description,
    url: '/',
  },
  twitter: { card: 'summary' },
  alternates: { canonical: '/' },
  formatDetection: { telephone: false },
}

export const viewport: Viewport = {
  themeColor: '#1f5e4b',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" className={font.variable}>
      <body>{children}</body>
    </html>
  )
}

import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: { default: 'Админ-панель', template: '%s — админ-панель NUR Invest' },
  robots: { index: false, follow: false },
}

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return <div className="admin-root">{children}</div>
}

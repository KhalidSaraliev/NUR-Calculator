import Link from 'next/link'

import { Logo } from '@/components/Logo'
import { can } from '@/lib/auth/permissions'
import { requireAdminPage } from '@/lib/auth/session'
import { adminRoleLabels } from '@/lib/types'

import { logout } from '../login/actions'

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdminPage()
  const links = [
    { href: '/admin', label: 'Обзор', show: true },
    { href: '/admin/leads', label: 'Заявки', show: can(user.role, 'leads:read') },
    { href: '/admin/orders', label: 'Сделки', show: can(user.role, 'orders:read') },
    { href: '/admin/payments', label: 'Платежи', show: can(user.role, 'payments:read') },
    { href: '/admin/catalog', label: 'Каталог', show: can(user.role, 'catalog:write') },
    { href: '/admin/settings', label: 'Настройки', show: can(user.role, 'settings:write') },
  ]
  return (
    <div className="admin-shell">
      <a href="#admin-main" className="skip-link">
        Перейти к содержимому
      </a>
      <aside className="admin-sidebar">
        <Logo />
        <nav aria-label="Админ-панель">
          <ul>
            {links
              .filter((l) => l.show)
              .map((l) => (
                <li key={l.href}>
                  <Link href={l.href}>{l.label}</Link>
                </li>
              ))}
          </ul>
        </nav>
        <div className="admin-user">
          <div>
            <strong>{user.name}</strong>
            <div className="small">{adminRoleLabels[user.role]}</div>
          </div>
          <form action={logout}>
            <button type="submit" className="btn btn--secondary btn--sm">
              Выйти
            </button>
          </form>
        </div>
      </aside>
      <main id="admin-main" className="admin-main">
        {children}
      </main>
    </div>
  )
}

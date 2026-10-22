'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

import { CloseIcon, MenuIcon } from '@/components/icons'
import { Logo } from '@/components/Logo'

const nav = [
  { href: '/catalog', label: 'Каталог' },
  { href: '/calculator', label: 'Калькулятор' },
  { href: '/how-it-works', label: 'Как это работает' },
  { href: '/faq', label: 'Вопросы' },
  { href: '/contacts', label: 'Контакты' },
]

export function SiteHeader({ whatsappSlot }: { whatsappSlot: React.ReactNode }) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  return (
    <header className="site-header">
      <div className="container site-header__inner">
        <Logo />
        <button
          type="button"
          className="btn btn--secondary btn--sm menu-toggle"
          aria-expanded={open}
          aria-controls="main-nav"
          aria-label="Меню"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <CloseIcon size={20} /> : <MenuIcon size={20} />}
          <span>Меню</span>
        </button>
        <nav id="main-nav" className="main-nav" aria-label="Основное меню" data-open={open}>
          <ul>
            {nav.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={pathname.startsWith(item.href) ? 'page' : undefined}
                  onClick={() => setOpen(false)}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="header-actions">
          {whatsappSlot}
          <Link href="/apply" className="btn btn--primary btn--sm">
            Оставить заявку
          </Link>
        </div>
      </div>
    </header>
  )
}

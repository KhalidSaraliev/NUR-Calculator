import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { connection } from 'next/server'

import { Logo } from '@/components/Logo'
import { getCurrentAdmin } from '@/lib/auth/session'
import { getSessionSecret } from '@/lib/auth/session-token'
import { hasAnyAdmin } from '@/lib/data/users'

import { LoginForm } from './LoginForm'

export const metadata: Metadata = { title: 'Вход для сотрудников', robots: { index: false, follow: false } }

export default async function LoginPage() {
  await connection()
  if (await getCurrentAdmin()) redirect('/admin')
  const configured = Boolean(getSessionSecret())
  const hasUsers = await hasAnyAdmin()

  return (
    <main id="main" className="container" style={{ maxWidth: 440, padding: '72px 20px' }}>
      <div style={{ marginBottom: 24 }}>
        <Logo />
      </div>
      <h1 style={{ fontSize: '1.6rem' }}>Вход для сотрудников</h1>
      {!configured && (
        <div className="alert alert--warning" role="note">
          <p>
            Админ-панель не настроена: задайте переменную <code>SESSION_SECRET</code> (случайная строка не короче 32
            символов) и перезапустите сайт.
          </p>
        </div>
      )}
      {configured && !hasUsers && (
        <div className="alert alert--info" role="note">
          <p>
            Ещё нет ни одного сотрудника. Создайте администратора командой:
            <br />
            <code>npm run admin:create -- --email you@example.ru --name &quot;Имя&quot; --role admin</code>
          </p>
        </div>
      )}
      <LoginForm />
    </main>
  )
}

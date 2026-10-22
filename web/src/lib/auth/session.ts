import 'server-only'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

import { can, type Permission } from '@/lib/auth/permissions'
import {
  createSessionToken,
  getSessionSecret,
  SESSION_COOKIE,
  SESSION_TTL_SECONDS,
  verifySessionToken,
} from '@/lib/auth/session-token'
import { readDb } from '@/lib/db/store'
import type { AdminUser } from '@/lib/types'

export type SessionUser = Pick<AdminUser, 'id' | 'email' | 'name' | 'role'>

export async function startSession(user: AdminUser) {
  const secret = getSessionSecret()
  if (!secret) throw new Error('SESSION_SECRET не настроен')
  const token = createSessionToken({ sub: user.id, role: user.role, ver: user.sessionVersion }, secret)
  const store = await cookies()
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
  })
}

export async function endSession() {
  const store = await cookies()
  store.delete(SESSION_COOKIE)
}

/**
 * Текущий сотрудник. Подпись проверяется здесь (а не только в proxy.ts),
 * а пользователь заново читается из хранилища: отключённый сотрудник или
 * сменённый пароль сразу закрывают доступ.
 */
export async function getCurrentAdmin(): Promise<SessionUser | null> {
  // cookies() вызывается первым: страница всегда рендерится по запросу и не кешируется.
  const store = await cookies()
  const secret = getSessionSecret()
  if (!secret) return null
  const payload = verifySessionToken(store.get(SESSION_COOKIE)?.value, secret)
  if (!payload) return null
  const db = await readDb()
  const user = db.users.find((u) => u.id === payload.sub)
  if (!user || user.disabled || user.sessionVersion !== payload.ver) return null
  return { id: user.id, email: user.email, name: user.name, role: user.role }
}

/** Для страниц: без входа — на страницу входа, без прав — на главную админки. */
export async function requireAdminPage(permission?: Permission): Promise<SessionUser> {
  const user = await getCurrentAdmin()
  if (!user) redirect('/admin/login')
  if (permission && !can(user.role, permission)) redirect('/admin?denied=1')
  return user
}

export class AccessDeniedError extends Error {
  constructor() {
    super('Недостаточно прав')
    this.name = 'AccessDeniedError'
  }
}

/** Для серверных действий: проверка в каждом действии, а не только в интерфейсе. */
export async function requireAdminAction(permission: Permission): Promise<SessionUser> {
  const user = await getCurrentAdmin()
  if (!user || !can(user.role, permission)) throw new AccessDeniedError()
  return user
}

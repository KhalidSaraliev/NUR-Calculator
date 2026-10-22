'use server'

import { redirect } from 'next/navigation'

import { DUMMY_PASSWORD_HASH, verifyPassword } from '@/lib/auth/password'
import { endSession, startSession } from '@/lib/auth/session'
import { getSessionSecret } from '@/lib/auth/session-token'
import { findUserByEmail } from '@/lib/data/users'
import { rateLimit, resetRateLimit } from '@/lib/rate-limit'
import { clientIp } from '@/lib/request'

export interface LoginState {
  error?: string
}

const GENERIC_ERROR = 'Неверный email или пароль'

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  if (!getSessionSecret()) {
    return { error: 'Вход отключён: не задан SESSION_SECRET (не короче 32 символов).' }
  }
  const email = String(formData.get('email') ?? '').trim().toLowerCase().slice(0, 200)
  const password = String(formData.get('password') ?? '').slice(0, 200)
  if (!email || !password) return { error: 'Введите email и пароль' }

  const ip = await clientIp()
  const byAccount = rateLimit(`login:${ip}:${email}`, 5, 15 * 60 * 1000)
  const byIp = rateLimit(`login-ip:${ip}`, 30, 15 * 60 * 1000)
  if (!byAccount.allowed || !byIp.allowed) {
    return { error: 'Слишком много попыток входа. Подождите 15 минут.' }
  }

  const user = await findUserByEmail(email)
  // Проверяем пароль даже для несуществующего пользователя, чтобы время ответа не выдавало email.
  const valid = await verifyPassword(password, user?.passwordHash ?? DUMMY_PASSWORD_HASH)
  if (!user || !valid || user.disabled) return { error: GENERIC_ERROR }

  resetRateLimit(`login:${ip}:${email}`)
  await startSession(user)
  redirect('/admin')
}

export async function logout() {
  await endSession()
  redirect('/admin/login')
}

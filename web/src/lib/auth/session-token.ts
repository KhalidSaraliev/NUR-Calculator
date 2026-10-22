import { createHmac, timingSafeEqual } from 'node:crypto'

import { ADMIN_ROLES, type AdminRole } from '@/lib/types'

/**
 * Подписанный токен сессии сотрудника: base64url(JSON) + "." + HMAC-SHA256.
 * Секрет — SESSION_SECRET (не короче 32 символов). Токен хранится только
 * в httpOnly-cookie и не содержит персональных данных, кроме id и роли.
 */

export const SESSION_COOKIE = 'nur_admin_session'
export const SESSION_TTL_SECONDS = 8 * 60 * 60

export interface SessionPayload {
  sub: string
  role: AdminRole
  /** Версия сессий пользователя — при смене пароля старые токены недействительны. */
  ver: number
  iat: number
  exp: number
}

export function getSessionSecret(): string | null {
  const secret = process.env.SESSION_SECRET?.trim() ?? ''
  return secret.length >= 32 ? secret : null
}

function sign(data: string, secret: string): string {
  return createHmac('sha256', secret).update(data).digest('base64url')
}

export function createSessionToken(
  payload: Omit<SessionPayload, 'iat' | 'exp'>,
  secret: string,
  now: number = Date.now(),
): string {
  const iat = Math.floor(now / 1000)
  const full: SessionPayload = { ...payload, iat, exp: iat + SESSION_TTL_SECONDS }
  const body = Buffer.from(JSON.stringify(full)).toString('base64url')
  return `${body}.${sign(body, secret)}`
}

export function verifySessionToken(
  token: string | undefined,
  secret: string,
  now: number = Date.now(),
): SessionPayload | null {
  if (!token) return null
  const [body, signature, ...rest] = token.split('.')
  if (!body || !signature || rest.length > 0) return null
  const expected = Buffer.from(sign(body, secret))
  const actual = Buffer.from(signature)
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as SessionPayload
    if (typeof payload.sub !== 'string' || !ADMIN_ROLES.includes(payload.role)) return null
    if (typeof payload.exp !== 'number' || payload.exp <= Math.floor(now / 1000)) return null
    return payload
  } catch {
    return null
  }
}

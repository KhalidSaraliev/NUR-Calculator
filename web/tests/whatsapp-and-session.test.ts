import { describe, expect, it } from 'vitest'

import { hashPassword, verifyPassword } from '../scripts/password-hash.mjs'
import { can } from '@/lib/auth/permissions'
import { createSessionToken, verifySessionToken } from '@/lib/auth/session-token'
import { whatsappLink } from '@/lib/whatsapp'

describe('whatsappLink', () => {
  it('не создаёт ссылку без настроенного номера', () => {
    expect(whatsappLink('привет', '')).toBeNull()
    expect(whatsappLink('привет', '123')).toBeNull()
  })
  it('кодирует текст сообщения', () => {
    expect(whatsappLink('Цена 100 ₽?', '79000000000')).toBe(
      'https://wa.me/79000000000?text=%D0%A6%D0%B5%D0%BD%D0%B0%20100%20%E2%82%BD%3F',
    )
  })
})

describe('сессия сотрудника', () => {
  const secret = 'x'.repeat(32)
  it('проверяет подпись и срок действия', () => {
    const now = Date.UTC(2026, 9, 22)
    const token = createSessionToken({ sub: 'u1', role: 'manager', ver: 1 }, secret, now)
    expect(verifySessionToken(token, secret, now)?.sub).toBe('u1')
    expect(verifySessionToken(token, 'y'.repeat(32), now)).toBeNull()
    expect(verifySessionToken(token, secret, now + 9 * 3600 * 1000)).toBeNull()
  })
  it('отклоняет изменённую роль', () => {
    const token = createSessionToken({ sub: 'u1', role: 'manager', ver: 1 }, secret)
    const [body, sig] = token.split('.')
    const payload = JSON.parse(Buffer.from(body!, 'base64url').toString())
    const forged = Buffer.from(JSON.stringify({ ...payload, role: 'admin' })).toString('base64url')
    expect(verifySessionToken(`${forged}.${sig}`, secret)).toBeNull()
  })
  it('разграничивает права', () => {
    expect(can('manager', 'leads:update')).toBe(true)
    expect(can('manager', 'catalog:write')).toBe(false)
    expect(can('manager', 'payments:create')).toBe(false)
    expect(can('admin', 'payments:create')).toBe(true)
  })
})

describe('пароли', () => {
  it('хранятся только в виде хеша scrypt и проверяются', async () => {
    const hash = await hashPassword('correct horse battery')
    expect(hash).not.toContain('correct horse')
    expect(hash.startsWith('scrypt$')).toBe(true)
    expect(await verifyPassword('correct horse battery', hash)).toBe(true)
    expect(await verifyPassword('wrong password!!', hash)).toBe(false)
  })
  it('требует пароль не короче 12 символов', async () => {
    await expect(hashPassword('short')).rejects.toThrow()
  })
})

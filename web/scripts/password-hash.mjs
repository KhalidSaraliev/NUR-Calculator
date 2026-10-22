// Хеширование паролей сотрудников (scrypt). Формат строки:
//   scrypt$N$r$p$<соль base64url>$<хеш base64url>
// Используется и скриптом создания администратора, и сервером
// (src/lib/auth/password.ts), чтобы формат был один.
import { randomBytes, scrypt as scryptCb, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'

const scrypt = promisify(scryptCb)

export const SCRYPT_PARAMS = { N: 16384, r: 8, p: 1, keyLength: 64 }
export const MIN_PASSWORD_LENGTH = 12

export async function hashPassword(password) {
  if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(`Пароль должен быть не короче ${MIN_PASSWORD_LENGTH} символов`)
  }
  const { N, r, p, keyLength } = SCRYPT_PARAMS
  const salt = randomBytes(16)
  const hash = await scrypt(password, salt, keyLength, { N, r, p, maxmem: 64 * 1024 * 1024 })
  return ['scrypt', N, r, p, salt.toString('base64url'), Buffer.from(hash).toString('base64url')].join('$')
}

export async function verifyPassword(password, stored) {
  if (typeof password !== 'string' || typeof stored !== 'string') return false
  const parts = stored.split('$')
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false
  const [, nRaw, rRaw, pRaw, saltRaw, hashRaw] = parts
  const N = Number(nRaw)
  const r = Number(rRaw)
  const p = Number(pRaw)
  if (![N, r, p].every(Number.isInteger)) return false
  const expected = Buffer.from(hashRaw, 'base64url')
  const actual = await scrypt(password, Buffer.from(saltRaw, 'base64url'), expected.length, {
    N,
    r,
    p,
    maxmem: 64 * 1024 * 1024,
  })
  return expected.length === actual.length && timingSafeEqual(expected, Buffer.from(actual))
}

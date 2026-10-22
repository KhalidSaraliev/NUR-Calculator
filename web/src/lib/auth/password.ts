import 'server-only'

export { hashPassword, MIN_PASSWORD_LENGTH, verifyPassword } from '../../../scripts/password-hash.mjs'

/**
 * Хеш-заглушка для сравнения, когда пользователь не найден: проверка
 * пароля занимает одинаковое время, и по нему нельзя узнать,
 * существует ли такой email.
 */
export const DUMMY_PASSWORD_HASH =
  'scrypt$16384$8$1$AAAAAAAAAAAAAAAAAAAAAA$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'

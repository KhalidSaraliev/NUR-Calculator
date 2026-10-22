import type { AdminRole } from '@/lib/types'

/**
 * Права сотрудников. Менеджер работает с заявками и видит сделки и
 * платежи; администратор дополнительно управляет каталогом, настройками
 * и создаёт сделки и ссылки на оплату.
 */
export const PERMISSIONS = {
  'leads:read': ['admin', 'manager'],
  'leads:update': ['admin', 'manager'],
  'orders:read': ['admin', 'manager'],
  'orders:write': ['admin'],
  'payments:read': ['admin', 'manager'],
  'payments:create': ['admin'],
  'catalog:write': ['admin'],
  'settings:write': ['admin'],
} as const satisfies Record<string, readonly AdminRole[]>

export type Permission = keyof typeof PERMISSIONS

export function can(role: AdminRole, permission: Permission): boolean {
  return (PERMISSIONS[permission] as readonly AdminRole[]).includes(role)
}

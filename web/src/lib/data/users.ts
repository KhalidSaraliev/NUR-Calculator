import 'server-only'

import { readDb } from '@/lib/db/store'
import type { AdminUser } from '@/lib/types'

export async function findUserByEmail(email: string): Promise<AdminUser | undefined> {
  const normalized = email.trim().toLowerCase()
  return (await readDb()).users.find((u) => u.email === normalized)
}

export async function hasAnyAdmin(): Promise<boolean> {
  return (await readDb()).users.some((u) => !u.disabled)
}

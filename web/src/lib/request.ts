import 'server-only'

import { headers } from 'next/headers'

/**
 * IP клиента для ограничения частоты запросов. Заголовкам X-Forwarded-For /
 * X-Real-IP можно доверять только за собственным обратным прокси,
 * поэтому они учитываются лишь при TRUST_PROXY=true.
 */
export async function clientIp(): Promise<string> {
  if (process.env.TRUST_PROXY !== 'true') return 'local'
  const h = await headers()
  const forwarded = h.get('x-forwarded-for')?.split(',')[0]?.trim()
  return forwarded || h.get('x-real-ip')?.trim() || 'unknown'
}

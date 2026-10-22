import { getPaymentsConfig } from '@/lib/payments/config'

/** Проверка работоспособности для мониторинга. Секреты не раскрываются. */
export function GET() {
  const payments = getPaymentsConfig()
  return Response.json(
    { ok: true, payments: { provider: payments.provider, mode: payments.mode, enabled: payments.enabled } },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}

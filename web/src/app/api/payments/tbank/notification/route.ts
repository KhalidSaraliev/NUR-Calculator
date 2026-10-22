import { handleTbankNotification } from '@/lib/payments/service'

/**
 * Приём уведомлений T-Bank о статусе платежа (NotificationURL).
 * Подпись проверяется в handleTbankNotification; ответ «OK» — сигнал банку,
 * что уведомление принято и повторять его не нужно.
 */
export async function POST(request: Request) {
  const contentLength = Number(request.headers.get('content-length') ?? 0)
  if (contentLength > 64 * 1024) return new Response('payload too large', { status: 413 })

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return new Response('bad request', { status: 400 })
  }

  const result = await handleTbankNotification(body)
  if (result.httpStatus !== 200) {
    console.warn('[payments] уведомление отклонено:', result.outcome)
  }
  return new Response(result.body, {
    status: result.httpStatus,
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' },
  })
}

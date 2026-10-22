/**
 * Простое ограничение частоты запросов в памяти процесса.
 * Подходит для одного экземпляра приложения; при нескольких экземплярах
 * замените на Redis или ограничение на уровне обратного прокси.
 */
const buckets = new Map<string, { count: number; resetAt: number }>()

export function rateLimit(key: string, limit: number, windowMs: number, now: number = Date.now()) {
  const bucket = buckets.get(key)
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return { allowed: true, retryAfterMs: 0 }
  }
  if (bucket.count >= limit) {
    return { allowed: false, retryAfterMs: bucket.resetAt - now }
  }
  bucket.count += 1
  return { allowed: true, retryAfterMs: 0 }
}

export function resetRateLimit(key: string) {
  buckets.delete(key)
}

// Периодически убираем устаревшие записи, чтобы карта не росла бесконечно.
if (typeof setInterval === 'function') {
  const timer = setInterval(() => {
    const now = Date.now()
    for (const [key, bucket] of buckets) if (bucket.resetAt <= now) buckets.delete(key)
  }, 10 * 60 * 1000)
  timer.unref?.()
}

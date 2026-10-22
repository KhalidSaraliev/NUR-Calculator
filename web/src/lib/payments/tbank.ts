import { createHash, timingSafeEqual } from 'node:crypto'

/**
 * Клиент Интернет-эквайринга T-Bank (API v2).
 * Документация: https://developer.tbank.ru/eacq/api
 *
 * Карточные данные вводятся только на платёжной форме банка (PaymentURL),
 * сайт их не видит и не хранит. Каждый запрос и каждое уведомление
 * подписываются токеном SHA-256 (см. buildToken).
 */

type Scalar = string | number | boolean

/**
 * Токен T-Bank: берутся параметры корневого уровня (вложенные объекты
 * вроде Receipt и DATA не участвуют), добавляется Password, пары
 * сортируются по ключу, значения склеиваются и хешируются SHA-256.
 */
export function buildToken(params: Record<string, unknown>, password: string): string {
  const pairs: [string, string][] = []
  for (const [key, value] of Object.entries(params)) {
    if (key === 'Token' || value === undefined || value === null) continue
    if (typeof value === 'object') continue
    pairs.push([key, String(value as Scalar)])
  }
  pairs.push(['Password', password])
  pairs.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
  return createHash('sha256')
    .update(pairs.map(([, v]) => v).join(''), 'utf8')
    .digest('hex')
}

export function verifyToken(params: Record<string, unknown>, password: string): boolean {
  const received = params.Token
  if (typeof received !== 'string' || !/^[0-9a-f]{64}$/i.test(received)) return false
  const expected = Buffer.from(buildToken(params, password), 'utf8')
  const actual = Buffer.from(received.toLowerCase(), 'utf8')
  return expected.length === actual.length && timingSafeEqual(expected, actual)
}

export interface TbankInitRequest {
  Amount: number
  OrderId: string
  Description: string
  SuccessURL: string
  FailURL: string
  NotificationURL: string
  DATA?: Record<string, string>
  Receipt?: Record<string, unknown>
}

export interface TbankResponse {
  Success: boolean
  ErrorCode: string
  Message?: string
  Details?: string
  Status?: string
  PaymentId?: string | number
  OrderId?: string
  Amount?: number
  PaymentURL?: string
}

export class TbankApiError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
  ) {
    super(message)
    this.name = 'TbankApiError'
  }
}

export interface TbankClientOptions {
  apiUrl: string
  terminalKey: string
  password: string
  fetchImpl?: typeof fetch
  timeoutMs?: number
}

export function createTbankClient(options: TbankClientOptions) {
  const fetchImpl = options.fetchImpl ?? fetch

  async function call(method: string, body: Record<string, unknown>): Promise<TbankResponse> {
    const payload: Record<string, unknown> = { TerminalKey: options.terminalKey, ...body }
    payload.Token = buildToken(payload, options.password)
    let response: Response
    try {
      response = await fetchImpl(`${options.apiUrl}/${method}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(options.timeoutMs ?? 15_000),
        cache: 'no-store',
      })
    } catch (error) {
      throw new TbankApiError(`Банк недоступен: ${(error as Error).message}`)
    }
    if (!response.ok) throw new TbankApiError(`Банк ответил HTTP ${response.status}`)
    const data = (await response.json()) as TbankResponse
    if (!data.Success || data.ErrorCode !== '0') {
      throw new TbankApiError(
        `Банк отклонил запрос ${method}: ${data.Message ?? 'без описания'} ${data.Details ?? ''}`.trim(),
        data.ErrorCode,
      )
    }
    return data
  }

  return {
    /** Создаёт платёж и возвращает ссылку на платёжную форму банка. Одностадийная оплата. */
    init(request: TbankInitRequest) {
      return call('Init', { ...request, PayType: 'O', Language: 'ru' })
    },
    /** Актуальный статус платежа — источник истины при обработке уведомлений. */
    getState(paymentId: string) {
      return call('GetState', { PaymentId: paymentId })
    },
  }
}

export type TbankClient = ReturnType<typeof createTbankClient>

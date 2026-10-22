import { randomUUID } from 'node:crypto'

import { mutateDb, readDb } from '@/lib/db/store'
import { installmentState } from '@/lib/data/orders'
import { getPaymentsConfig, type PaymentsConfig } from '@/lib/payments/config'
import { ACTIVE_PAYMENT_STATUSES, canTransition, mapTbankStatus } from '@/lib/payments/status'
import { createTbankClient, TbankApiError, verifyToken, type TbankClient } from '@/lib/payments/tbank'
import type { Database, Order, OrderInstallment, Payment, PaymentEvent, PaymentStatus } from '@/lib/types'

/**
 * Платёжные сценарии. Ключевые правила:
 *  - оплата идёт только на платёжной форме банка, карты сайт не видит;
 *  - статус «оплачен» ставится только по подписанному уведомлению банка,
 *    дополнительно подтверждённому запросом GetState; возврат клиента
 *    на сайт (SuccessURL) статус не меняет;
 *  - повторные и запоздавшие уведомления не меняют результат;
 *  - один платёж графика — не больше одной активной ссылки на оплату.
 */

export class PaymentsUnavailableError extends Error {
  constructor(public readonly issues: string[]) {
    super(`Онлайн-оплата недоступна: ${issues.join('; ')}`)
    this.name = 'PaymentsUnavailableError'
  }
}

export class PaymentRequestError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'PaymentRequestError'
  }
}

export interface PaymentDeps {
  config: PaymentsConfig
  client: TbankClient
  now: () => Date
}

export function defaultPaymentDeps(): PaymentDeps {
  const config = getPaymentsConfig()
  return {
    config,
    client: createTbankClient({ apiUrl: config.apiUrl, terminalKey: config.terminalKey, password: config.password }),
    now: () => new Date(),
  }
}

/** Ссылка на оплату действительна столько же, сколько форма банка по умолчанию (24 часа). */
const ACTIVE_LINK_TTL_MS = 24 * 60 * 60 * 1000

function pushEvent(payment: Payment, event: PaymentEvent) {
  payment.events.push(event)
  payment.updatedAt = event.at
}

function findInstallment(order: Order, number: number): OrderInstallment {
  const item = order.schedule.find((i) => i.number === number)
  if (!item) throw new PaymentRequestError('Такого платежа нет в графике')
  return item
}

function buildReceipt(config: PaymentsConfig, order: Order, item: OrderInstallment, amountKopecks: number) {
  if (!config.receipt) return undefined
  const isDown = item.kind === 'down'
  return {
    Phone: order.customerPhone,
    Taxation: config.receipt.taxation,
    Items: [
      {
        Name: `${order.productName} — ${isDown ? 'первоначальный взнос' : `платёж ${item.number} по договору ${order.number}`}`.slice(0, 128),
        Price: amountKopecks,
        Quantity: 1,
        Amount: amountKopecks,
        Tax: config.receipt.tax,
        // Признаки по умолчанию для продажи с оплатой частями; подтвердите их с бухгалтером.
        PaymentMethod: config.receipt.paymentMethod || (isDown ? 'partial_prepayment' : 'credit_payment'),
        PaymentObject: config.receipt.paymentObject || (isDown ? 'commodity' : 'payment'),
      },
    ],
  }
}

/**
 * Создаёт (или возвращает уже созданную) ссылку на оплату платежа по графику.
 */
export async function createInstallmentPayment(
  orderId: string,
  installmentNumber: number,
  actor: string,
  deps: PaymentDeps = defaultPaymentDeps(),
): Promise<Payment> {
  const { config, client, now } = deps
  if (!config.enabled) throw new PaymentsUnavailableError(config.issues)

  // Шаг 1. Резервируем попытку оплаты атомарно: проверки и запись — в одной транзакции хранилища.
  const reservation = await mutateDb((db) => {
    const order = db.orders.find((o) => o.id === orderId)
    if (!order) throw new PaymentRequestError('Сделка не найдена')
    if (order.status === 'canceled' || order.status === 'completed') {
      throw new PaymentRequestError('Сделка закрыта — новые платежи не принимаются')
    }
    const item = findInstallment(order, installmentNumber)
    const related = db.payments.filter((p) => p.orderId === orderId && p.installmentNumber === installmentNumber)
    if (installmentState(db.payments, orderId, installmentNumber) === 'paid') {
      throw new PaymentRequestError('Этот платёж уже оплачен')
    }
    const active = related.find(
      (p) =>
        ACTIVE_PAYMENT_STATUSES.includes(p.status) &&
        now().getTime() - new Date(p.createdAt).getTime() < ACTIVE_LINK_TTL_MS,
    )
    if (active) return { existing: active, order, item, payment: null }

    const at = now().toISOString()
    const payment: Payment = {
      id: randomUUID(),
      orderId,
      installmentNumber,
      amountKopecks: item.amount * 100,
      provider: 'tbank',
      status: 'created',
      idempotencyKey: `${orderId}:${installmentNumber}:${related.length + 1}`,
      processedNotifications: [],
      events: [{ at, source: 'admin', status: 'created', note: `Создан сотрудником ${actor}` }],
      createdAt: at,
      updatedAt: at,
      createdBy: actor,
    }
    db.payments.push(payment)
    return { existing: null, order, item, payment }
  })

  if (reservation.existing) {
    if (reservation.existing.paymentUrl) return reservation.existing
    throw new PaymentRequestError('Ссылка на оплату уже создаётся — обновите страницу через минуту')
  }

  const { order, item, payment } = reservation
  if (!payment) throw new PaymentRequestError('Не удалось создать платёж')

  // Шаг 2. Запрос в банк. OrderId = id нашего платежа, по нему сопоставляются уведомления.
  try {
    const response = await client.init({
      Amount: payment.amountKopecks,
      OrderId: payment.id,
      Description: `${order.number}: ${item.kind === 'down' ? 'первоначальный взнос' : `платёж ${item.number} из ${order.termMonths}`}`,
      SuccessURL: `${config.siteUrl}/pay/${payment.id}`,
      FailURL: `${config.siteUrl}/pay/${payment.id}`,
      NotificationURL: `${config.siteUrl}/api/payments/tbank/notification`,
      DATA: { orderNumber: order.number },
      Receipt: buildReceipt(config, order, item, payment.amountKopecks),
    })
    if (!response.PaymentURL || response.PaymentId === undefined) {
      throw new TbankApiError('Банк не вернул ссылку на оплату')
    }
    if (response.Amount !== undefined && response.Amount !== payment.amountKopecks) {
      throw new TbankApiError('Банк вернул другую сумму платежа')
    }
    return await mutateDb((db) => {
      const stored = db.payments.find((p) => p.id === payment.id)!
      stored.providerPaymentId = String(response.PaymentId)
      stored.paymentUrl = response.PaymentURL
      stored.status = 'pending'
      pushEvent(stored, {
        at: now().toISOString(),
        source: 'init',
        providerStatus: response.Status,
        status: 'pending',
      })
      return stored
    })
  } catch (error) {
    await mutateDb((db) => {
      const stored = db.payments.find((p) => p.id === payment.id)!
      stored.status = 'error'
      pushEvent(stored, { at: now().toISOString(), source: 'init', status: 'error', note: (error as Error).message })
    })
    throw error
  }
}

export type NotificationResult =
  | { httpStatus: 200; body: 'OK'; outcome: string }
  | { httpStatus: 400 | 403 | 500 | 503; body: string; outcome: string }

function applyStatus(db: Database, payment: Payment, next: PaymentStatus, event: PaymentEvent): boolean {
  if (!canTransition(payment.status, next)) {
    pushEvent(payment, { ...event, status: payment.status, note: `Пропущен переход ${payment.status} → ${next}` })
    return false
  }
  payment.status = next
  pushEvent(payment, { ...event, status: next })

  if (next === 'confirmed') {
    const order = db.orders.find((o) => o.id === payment.orderId)
    if (order) {
      if (order.status === 'draft') order.status = 'active'
      const allPaid = order.schedule.every((i) => installmentState(db.payments, order.id, i.number) === 'paid')
      if (allPaid) order.status = 'completed'
    }
  }
  return true
}

/**
 * Обработка уведомления T-Bank. Возвращает HTTP-ответ: банк ждёт «OK»
 * и повторяет уведомление при любом другом ответе.
 */
export async function handleTbankNotification(
  body: unknown,
  deps: PaymentDeps = defaultPaymentDeps(),
): Promise<NotificationResult> {
  const { config, client, now } = deps
  if (config.provider !== 'tbank' || !config.password) {
    return { httpStatus: 503, body: 'payments disabled', outcome: 'disabled' }
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { httpStatus: 400, body: 'bad request', outcome: 'invalid_body' }
  }
  const params = body as Record<string, unknown>

  // 1. Подпись и терминал.
  if (params.TerminalKey !== config.terminalKey || !verifyToken(params, config.password)) {
    return { httpStatus: 403, body: 'forbidden', outcome: 'invalid_signature' }
  }

  const orderId = String(params.OrderId ?? '')
  const providerPaymentId = String(params.PaymentId ?? '')
  const providerStatus = String(params.Status ?? '')
  const amount = Number(params.Amount)
  const notificationKey = `${providerPaymentId}:${providerStatus}`

  // 2. Сопоставление с нашим платежом и проверка суммы.
  const db = await readDb()
  const payment = db.payments.find((p) => p.id === orderId)
  if (!payment) {
    // Подписанное уведомление о платеже, созданном не через сайт: принимаем, чтобы банк не повторял.
    console.warn('[payments] уведомление по неизвестному OrderId', { orderId, providerPaymentId })
    return { httpStatus: 200, body: 'OK', outcome: 'unknown_order' }
  }
  if (payment.processedNotifications.includes(notificationKey)) {
    return { httpStatus: 200, body: 'OK', outcome: 'duplicate' }
  }

  const mismatch =
    (payment.providerPaymentId && payment.providerPaymentId !== providerPaymentId) ||
    amount !== payment.amountKopecks
  if (mismatch) {
    await mutateDb((tx) => {
      const p = tx.payments.find((x) => x.id === payment.id)!
      p.processedNotifications.push(notificationKey)
      pushEvent(p, {
        at: now().toISOString(),
        source: 'notification',
        providerStatus,
        status: p.status,
        note: 'Сумма или идентификатор платежа не совпадают — требуется ручная проверка',
      })
    })
    return { httpStatus: 200, body: 'OK', outcome: 'mismatch' }
  }

  // 3. Для успешных статусов перепроверяем состояние напрямую у банка.
  let confirmedStatus = providerStatus
  const mapped = mapTbankStatus(providerStatus)
  if (mapped === 'confirmed' || mapped === 'authorized') {
    try {
      const state = await client.getState(providerPaymentId)
      confirmedStatus = String(state.Status ?? '')
      if (state.Amount !== undefined && Number(state.Amount) !== payment.amountKopecks) {
        return { httpStatus: 500, body: 'amount mismatch', outcome: 'state_amount_mismatch' }
      }
    } catch (error) {
      console.error('[payments] не удалось проверить статус в банке', error)
      // Не подтверждаем оплату без проверки; банк повторит уведомление.
      return { httpStatus: 500, body: 'retry', outcome: 'state_check_failed' }
    }
  }

  // 4. Применяем статус атомарно и идемпотентно.
  const outcome = await mutateDb((tx) => {
    const p = tx.payments.find((x) => x.id === payment.id)!
    if (p.processedNotifications.includes(notificationKey)) return 'duplicate'
    p.processedNotifications.push(notificationKey)
    if (!p.providerPaymentId) p.providerPaymentId = providerPaymentId
    const applied = applyStatus(tx, p, mapTbankStatus(confirmedStatus), {
      at: now().toISOString(),
      source: confirmedStatus === providerStatus ? 'notification' : 'get_state',
      providerStatus: confirmedStatus,
      status: p.status,
    })
    return applied ? `applied:${p.status}` : 'ignored'
  })
  return { httpStatus: 200, body: 'OK', outcome }
}

/** Ручное обновление статуса сотрудником — через GetState, без доверия к клиенту. */
export async function refreshPaymentStatus(paymentId: string, deps: PaymentDeps = defaultPaymentDeps()) {
  const { config, client, now } = deps
  if (config.provider !== 'tbank' || !config.password) throw new PaymentsUnavailableError(config.issues)
  const payment = (await readDb()).payments.find((p) => p.id === paymentId)
  if (!payment?.providerPaymentId) throw new PaymentRequestError('Платёж ещё не зарегистрирован в банке')
  const state = await client.getState(payment.providerPaymentId)
  if (state.Amount !== undefined && Number(state.Amount) !== payment.amountKopecks) {
    throw new PaymentRequestError('Сумма в банке не совпадает с суммой платежа — проверьте вручную')
  }
  return mutateDb((tx) => {
    const p = tx.payments.find((x) => x.id === paymentId)!
    applyStatus(tx, p, mapTbankStatus(state.Status), {
      at: now().toISOString(),
      source: 'get_state',
      providerStatus: state.Status,
      status: p.status,
    })
    return p
  })
}

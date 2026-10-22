import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createOrder } from '@/lib/data/orders'
import { readDb } from '@/lib/db/store'
import { getPaymentsConfig, LIVE_CONFIRMATION_PHRASE } from '@/lib/payments/config'
import {
  createInstallmentPayment,
  handleTbankNotification,
  PaymentsUnavailableError,
  type PaymentDeps,
} from '@/lib/payments/service'
import { canTransition, mapTbankStatus } from '@/lib/payments/status'
import { buildToken, createTbankClient, verifyToken } from '@/lib/payments/tbank'

const PASSWORD = 'test-password'
const TERMINAL = 'TestTerminalDEMO'

const testEnv = {
  PAYMENTS_PROVIDER: 'tbank',
  PAYMENTS_MODE: 'test',
  TBANK_TERMINAL_KEY: TERMINAL,
  TBANK_PASSWORD: PASSWORD,
  NEXT_PUBLIC_SITE_URL: 'https://example.test',
}

function signed(params: Record<string, unknown>) {
  return { ...params, Token: buildToken(params, PASSWORD) }
}

/** Фальшивый банк: запоминает запросы и отвечает заданным статусом GetState. */
function fakeBank(state: { status: string; amount?: number }) {
  const calls: { method: string; body: Record<string, unknown> }[] = []
  let nextPaymentId = 1000
  const fetchImpl = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
    const method = String(url).split('/').pop()!
    const body = JSON.parse(String(init?.body)) as Record<string, unknown>
    calls.push({ method, body })
    expect(verifyToken(body, PASSWORD)).toBe(true)
    if (method === 'Init') {
      nextPaymentId += 1
      return Response.json({
        Success: true,
        ErrorCode: '0',
        Status: 'NEW',
        PaymentId: String(nextPaymentId),
        OrderId: body.OrderId,
        Amount: body.Amount,
        PaymentURL: `https://securepay.example/${nextPaymentId}`,
      })
    }
    return Response.json({
      Success: true,
      ErrorCode: '0',
      Status: state.status,
      PaymentId: body.PaymentId,
      Amount: state.amount,
    })
  })
  return { calls, fetchImpl }
}

function deps(bank: ReturnType<typeof fakeBank>, env: Record<string, string> = testEnv): PaymentDeps {
  const config = getPaymentsConfig(env)
  return {
    config,
    client: createTbankClient({
      apiUrl: config.apiUrl,
      terminalKey: config.terminalKey,
      password: config.password,
      fetchImpl: bank.fetchImpl as unknown as typeof fetch,
    }),
    now: () => new Date('2026-10-22T12:00:00Z'),
  }
}

let dir: string
beforeEach(() => {
  dir = mkdtempSync(path.join(tmpdir(), 'nur-pay-'))
  process.env.DATA_DIR = dir
  process.env.SEED_DEMO_PRODUCTS = 'false'
})
afterEach(() => {
  rmSync(dir, { recursive: true, force: true })
  delete process.env.DATA_DIR
})

async function makeOrder() {
  return createOrder(
    {
      customerName: 'Тест',
      customerPhone: '+79280000000',
      productName: 'Холодильник',
      price: 100_000,
      termMonths: 6,
      downPayment: { mode: 'percent', percent: 25 },
      startDate: new Date(2026, 9, 22),
    },
    'admin@example.test',
  )
}

describe('токен T-Bank', () => {
  it('совпадает с примером из документации банка', () => {
    // Пример из документации T-Bank «Подпись запроса».
    const token = buildToken(
      {
        TerminalKey: 'MerchantTerminalKey',
        Amount: 19200,
        OrderId: '21090',
        Description: 'Подарочная карта на 1000 рублей',
        DATA: { Phone: '+71234567890', Email: 'a@test.com' },
        Receipt: { Email: 'a@test.ru' },
      },
      'usaf8fw8fsw21g',
    )
    expect(token).toBe('0024a00af7c350a3a67ca168ce06502aa72772456662e38696d48b56ee9c97d9')
  })

  it('учитывает булевы значения и отклоняет подделку', () => {
    const body = signed({ TerminalKey: TERMINAL, OrderId: 'x', Success: true, Status: 'CONFIRMED', Amount: 100 })
    expect(verifyToken(body, PASSWORD)).toBe(true)
    expect(verifyToken({ ...body, Amount: 1 }, PASSWORD)).toBe(false)
    expect(verifyToken({ ...body, Token: 'a'.repeat(64) }, PASSWORD)).toBe(false)
    expect(verifyToken({ ...body, Token: undefined }, PASSWORD)).toBe(false)
  })
})

describe('настройки оплаты', () => {
  it('по умолчанию выключены', () => {
    const c = getPaymentsConfig({})
    expect(c.enabled).toBe(false)
    expect(c.provider).toBe('disabled')
  })

  it('в тестовом режиме принимает только тестовый терминал', () => {
    expect(getPaymentsConfig(testEnv).enabled).toBe(true)
    expect(getPaymentsConfig({ ...testEnv, TBANK_TERMINAL_KEY: 'RealTerminal' }).enabled).toBe(false)
  })

  it('боевой режим требует явного подтверждения владельца и https', () => {
    const live = { ...testEnv, PAYMENTS_MODE: 'live', TBANK_TERMINAL_KEY: 'RealTerminal' }
    expect(getPaymentsConfig(live).enabled).toBe(false)
    expect(getPaymentsConfig({ ...live, PAYMENTS_LIVE_CONFIRMED: LIVE_CONFIRMATION_PHRASE }).enabled).toBe(true)
    expect(
      getPaymentsConfig({
        ...live,
        PAYMENTS_LIVE_CONFIRMED: LIVE_CONFIRMATION_PHRASE,
        NEXT_PUBLIC_SITE_URL: 'http://example.test',
      }).enabled,
    ).toBe(false)
  })
})

describe('создание платежа', () => {
  it('без настроек не создаёт платёж и не обращается к банку', async () => {
    const order = await makeOrder()
    const bank = fakeBank({ status: 'CONFIRMED' })
    await expect(createInstallmentPayment(order.id, 0, 'admin', deps(bank, {}))).rejects.toBeInstanceOf(
      PaymentsUnavailableError,
    )
    expect(bank.calls).toHaveLength(0)
    expect((await readDb()).payments).toHaveLength(0)
  })

  it('создаёт ссылку на платёжную форму банка с суммой в копейках и без данных карты', async () => {
    const order = await makeOrder()
    const bank = fakeBank({ status: 'CONFIRMED' })
    const payment = await createInstallmentPayment(order.id, 0, 'admin', deps(bank))
    expect(payment.status).toBe('pending')
    expect(payment.paymentUrl).toMatch(/^https:\/\/securepay\.example\//)
    const init = bank.calls[0]!
    expect(init.method).toBe('Init')
    expect(init.body.Amount).toBe(25_000 * 100)
    expect(init.body.OrderId).toBe(payment.id)
    expect(init.body.NotificationURL).toBe('https://example.test/api/payments/tbank/notification')
    expect(JSON.stringify(init.body)).not.toMatch(/Pan|CardData|cvv/i)
  })

  it('идемпотентен: повторный запрос возвращает ту же ссылку', async () => {
    const order = await makeOrder()
    const bank = fakeBank({ status: 'CONFIRMED' })
    const first = await createInstallmentPayment(order.id, 1, 'admin', deps(bank))
    const second = await createInstallmentPayment(order.id, 1, 'admin', deps(bank))
    expect(second.id).toBe(first.id)
    expect(bank.calls.filter((c) => c.method === 'Init')).toHaveLength(1)
  })
})

describe('уведомления банка', () => {
  async function pendingPayment(bankStatus = 'CONFIRMED', amount?: number) {
    const order = await makeOrder()
    const bank = fakeBank({ status: bankStatus, amount: amount ?? 25_000 * 100 })
    const d = deps(bank)
    const payment = await createInstallmentPayment(order.id, 0, 'admin', d)
    const notification = (status: string, extra: Record<string, unknown> = {}) =>
      signed({
        TerminalKey: TERMINAL,
        OrderId: payment.id,
        Success: true,
        Status: status,
        PaymentId: Number(payment.providerPaymentId),
        ErrorCode: '0',
        Amount: payment.amountKopecks,
        ...extra,
      })
    return { order, bank, d, payment, notification }
  }

  it('отклоняет уведомление с неверной подписью', async () => {
    const { d, notification } = await pendingPayment()
    const forged = { ...notification('CONFIRMED'), Token: 'f'.repeat(64) }
    const r = await handleTbankNotification(forged, d)
    expect(r.httpStatus).toBe(403)
    expect((await readDb()).payments[0]!.status).toBe('pending')
  })

  it('отклоняет уведомление от чужого терминала', async () => {
    const { d, payment } = await pendingPayment()
    const body = signed({ TerminalKey: 'OtherDEMO', OrderId: payment.id, Status: 'CONFIRMED', Amount: 1 })
    expect((await handleTbankNotification(body, d)).httpStatus).toBe(403)
  })

  it('подтверждает оплату только после проверки GetState и закрывает платёж графика', async () => {
    const { d, bank, notification } = await pendingPayment('CONFIRMED')
    const r = await handleTbankNotification(notification('CONFIRMED'), d)
    expect(r).toMatchObject({ httpStatus: 200, body: 'OK' })
    expect(bank.calls.map((c) => c.method)).toEqual(['Init', 'GetState'])
    const db = await readDb()
    expect(db.payments[0]!.status).toBe('confirmed')
    expect(db.orders[0]!.status).toBe('active')
  })

  it('не подтверждает оплату, если банк по GetState её не подтверждает', async () => {
    const { d, notification } = await pendingPayment('REJECTED')
    await handleTbankNotification(notification('CONFIRMED'), d)
    expect((await readDb()).payments[0]!.status).toBe('rejected')
  })

  it('не подтверждает оплату, если банк недоступен, и просит повторить', async () => {
    const { payment, notification } = await pendingPayment()
    const failing: PaymentDeps = {
      ...deps(fakeBank({ status: 'CONFIRMED' })),
      client: {
        init: vi.fn(),
        getState: vi.fn().mockRejectedValue(new Error('timeout')),
      } as unknown as PaymentDeps['client'],
    }
    const r = await handleTbankNotification(notification('CONFIRMED'), failing)
    expect(r.httpStatus).toBe(500)
    const stored = (await readDb()).payments.find((p) => p.id === payment.id)!
    expect(stored.status).toBe('pending')
  })

  it('не подтверждает платёж с другой суммой', async () => {
    const { d, notification, payment } = await pendingPayment()
    const r = await handleTbankNotification(notification('CONFIRMED', { Amount: payment.amountKopecks - 100 }), d)
    expect(r.outcome).toBe('mismatch')
    expect((await readDb()).payments[0]!.status).toBe('pending')
  })

  it('повторное уведомление обрабатывается один раз', async () => {
    const { d, bank, notification } = await pendingPayment()
    await handleTbankNotification(notification('CONFIRMED'), d)
    const again = await handleTbankNotification(notification('CONFIRMED'), d)
    expect(again).toMatchObject({ httpStatus: 200, outcome: 'duplicate' })
    expect(bank.calls.filter((c) => c.method === 'GetState')).toHaveLength(1)
    expect((await readDb()).payments[0]!.events.filter((e) => e.status === 'confirmed')).toHaveLength(1)
  })

  it('запоздавшее промежуточное уведомление не откатывает подтверждённый платёж', async () => {
    const { d, notification } = await pendingPayment()
    await handleTbankNotification(notification('CONFIRMED'), d)
    await handleTbankNotification(notification('FORM_SHOWED'), d)
    expect((await readDb()).payments[0]!.status).toBe('confirmed')
  })

  it('уже оплаченный платёж нельзя оплатить повторно', async () => {
    const { d, order, notification } = await pendingPayment()
    await handleTbankNotification(notification('CONFIRMED'), d)
    await expect(createInstallmentPayment(order.id, 0, 'admin', d)).rejects.toThrow(/уже оплачен/)
  })

  it('в выключенном режиме вебхук не принимает уведомления', async () => {
    const r = await handleTbankNotification({}, deps(fakeBank({ status: 'CONFIRMED' }), {}))
    expect(r.httpStatus).toBe(503)
  })
})

describe('статусы', () => {
  it('сопоставляет статусы банка', () => {
    expect(mapTbankStatus('CONFIRMED')).toBe('confirmed')
    expect(mapTbankStatus('AUTH_FAIL')).toBe('rejected')
    expect(mapTbankStatus('DEADLINE_EXPIRED')).toBe('canceled')
    expect(mapTbankStatus('SOMETHING_NEW')).toBe('pending')
  })
  it('не допускает отката финальных статусов', () => {
    expect(canTransition('confirmed', 'pending')).toBe(false)
    expect(canTransition('rejected', 'confirmed')).toBe(false)
    expect(canTransition('pending', 'confirmed')).toBe(true)
    expect(canTransition('confirmed', 'refunded')).toBe(true)
  })
})

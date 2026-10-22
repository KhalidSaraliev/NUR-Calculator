/**
 * Настройки онлайн-оплаты. По умолчанию оплата ВЫКЛЮЧЕНА.
 *
 * Режимы:
 *  - PAYMENTS_PROVIDER=disabled (по умолчанию) — ссылки на оплату не создаются,
 *    интерфейс прямо сообщает, что онлайн-оплата не подключена;
 *  - PAYMENTS_PROVIDER=tbank, PAYMENTS_MODE=test — только тестовый терминал
 *    T-Bank (ключ терминала оканчивается на DEMO), реальных списаний нет;
 *  - PAYMENTS_PROVIDER=tbank, PAYMENTS_MODE=live — боевой терминал. Включается
 *    только при PAYMENTS_LIVE_CONFIRMED=I_CONFIRM_LEGAL_REVIEW, то есть после
 *    того как владелец подтвердил юридическую и шариатскую проверку условий.
 */

export type PaymentsMode = 'test' | 'live'

export interface ReceiptConfig {
  taxation: string
  tax: string
  /** Пусто — признак выбирается автоматически по типу платежа (см. service.ts). */
  paymentMethod: string
  paymentObject: string
}

export interface PaymentsConfig {
  provider: 'disabled' | 'tbank'
  mode: PaymentsMode
  /** true, только если все проверки пройдены и ссылки на оплату можно создавать. */
  enabled: boolean
  /** Человекочитаемые причины, почему оплата недоступна. */
  issues: string[]
  terminalKey: string
  password: string
  apiUrl: string
  siteUrl: string
  receipt: ReceiptConfig | null
}

export const LIVE_CONFIRMATION_PHRASE = 'I_CONFIRM_LEGAL_REVIEW'

export function getPaymentsConfig(env: Record<string, string | undefined> = process.env): PaymentsConfig {
  const v = (key: string) => (env[key] ?? '').trim()
  const providerRaw = v('PAYMENTS_PROVIDER') || 'disabled'
  const mode: PaymentsMode = v('PAYMENTS_MODE') === 'live' ? 'live' : 'test'
  const siteUrl = v('NEXT_PUBLIC_SITE_URL').replace(/\/+$/, '')
  const taxation = v('TBANK_RECEIPT_TAXATION')

  const config: PaymentsConfig = {
    provider: providerRaw === 'tbank' ? 'tbank' : 'disabled',
    mode,
    enabled: false,
    issues: [],
    terminalKey: v('TBANK_TERMINAL_KEY'),
    password: v('TBANK_PASSWORD'),
    apiUrl: (v('TBANK_API_URL') || 'https://securepay.tinkoff.ru/v2').replace(/\/+$/, ''),
    siteUrl,
    receipt: taxation
      ? {
          taxation,
          tax: v('TBANK_RECEIPT_TAX') || 'none',
          paymentMethod: v('TBANK_RECEIPT_PAYMENT_METHOD'),
          paymentObject: v('TBANK_RECEIPT_PAYMENT_OBJECT'),
        }
      : null,
  }

  if (providerRaw !== 'tbank') {
    if (providerRaw !== 'disabled') config.issues.push(`Неизвестный платёжный провайдер «${providerRaw}»`)
    config.issues.push('Онлайн-оплата выключена (PAYMENTS_PROVIDER=disabled)')
    return config
  }

  if (!config.terminalKey) config.issues.push('Не задан TBANK_TERMINAL_KEY')
  if (!config.password) config.issues.push('Не задан TBANK_PASSWORD')
  if (!siteUrl) {
    config.issues.push('Не задан NEXT_PUBLIC_SITE_URL — нужен для адреса уведомлений и возврата клиента')
  } else if (!siteUrl.startsWith('https://') && mode === 'live') {
    config.issues.push('В боевом режиме NEXT_PUBLIC_SITE_URL должен начинаться с https://')
  }
  if (!config.apiUrl.startsWith('https://')) config.issues.push('TBANK_API_URL должен начинаться с https://')

  if (mode === 'test' && config.terminalKey && !config.terminalKey.toUpperCase().endsWith('DEMO')) {
    config.issues.push('В тестовом режиме используйте тестовый терминал T-Bank (ключ оканчивается на DEMO)')
  }
  if (mode === 'live' && v('PAYMENTS_LIVE_CONFIRMED') !== LIVE_CONFIRMATION_PHRASE) {
    config.issues.push(
      'Боевой режим заблокирован: подтвердите проверку оферты, договоров и условий юристом и ' +
        `шариатским экспертом и установите PAYMENTS_LIVE_CONFIRMED=${LIVE_CONFIRMATION_PHRASE}`,
    )
  }

  config.enabled = config.issues.length === 0
  return config
}

import { installmentTerms, type InstallmentTerms } from '@/config/terms'

/**
 * Расчёт покупки товара с оплатой частями.
 *
 * Модель: компания продаёт товар клиенту по цене продажи, которая
 * фиксируется заранее (стоимость товара + наценка продавца). Клиент вносит
 * первоначальный взнос, а остаток цены продажи делит на равные платежи.
 * Никакие суммы не начисляются со временем: если срок или взнос меняются,
 * меняется только цена продажи, согласованная до подписания договора.
 *
 * Все суммы — в целых рублях.
 */

export type DownPaymentInput =
  | { mode: 'none' }
  | { mode: 'percent'; percent: number }
  | { mode: 'amount'; amount: number }

export interface CalculationInput {
  /** Стоимость товара (цена, за которую компания приобретает товар), ₽. */
  price: number
  termMonths: number
  downPayment: DownPaymentInput
  /**
   * Цена продажи, если она уже согласована и отличается от расчётной
   * (например, задана для конкретного товара в каталоге). Если не задана —
   * цена продажи считается по таблице наценок.
   */
  salePriceOverride?: number
  /** Дата начала графика. По умолчанию — сегодня. */
  startDate?: Date
}

export interface ScheduleItem {
  /** 0 — первоначальный взнос, 1..N — платежи по графику. */
  number: number
  /** Дата в формате YYYY-MM-DD. */
  dueDate: string
  amount: number
  kind: 'down' | 'regular'
}

export interface CalculationResult {
  price: number
  termMonths: number
  markupPercent: number | null
  markupAmount: number
  salePrice: number
  downPayment: number
  downPaymentPercent: number
  minDownPayment: number
  remaining: number
  paymentsCount: number
  regularPayment: number
  lastPayment: number
  schedule: ScheduleItem[]
  /** Общая цена сделки = цена продажи = взнос + все платежи. */
  total: number
  warnings: string[]
}

export class CalculationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'CalculationError'
  }
}

export function markupPercentFor(
  termMonths: number,
  withDownPayment: boolean,
  terms: InstallmentTerms = installmentTerms,
): number {
  const table = withDownPayment ? terms.markupWithDown : terms.markupWithoutDown
  const value = table[termMonths]
  if (value === undefined) {
    throw new CalculationError(`Срок ${termMonths} мес. недоступен`)
  }
  return value
}

/** Прибавляет месяцы, не перескакивая через короткий месяц (31 янв → 28/29 фев). */
export function addMonths(date: Date, months: number): Date {
  const year = date.getFullYear()
  const month = date.getMonth() + months
  const day = date.getDate()
  const lastDay = new Date(year, month + 1, 0).getDate()
  return new Date(year, month, Math.min(day, lastDay))
}

export function toIsoDate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function assertPositiveInteger(value: number, label: string) {
  if (!Number.isFinite(value) || value <= 0) {
    throw new CalculationError(`${label}: укажите положительное число`)
  }
}

export function calculateInstallment(
  input: CalculationInput,
  terms: InstallmentTerms = installmentTerms,
): CalculationResult {
  const warnings: string[] = []
  const price = Math.round(input.price)
  assertPositiveInteger(price, 'Стоимость товара')
  if (price < terms.minPrice || price > terms.maxPrice) {
    throw new CalculationError(
      `Стоимость товара должна быть от ${terms.minPrice.toLocaleString('ru-RU')} до ${terms.maxPrice.toLocaleString('ru-RU')} ₽`,
    )
  }

  const termMonths = input.termMonths
  if (!terms.termOptions.includes(termMonths)) {
    throw new CalculationError(`Срок ${termMonths} мес. недоступен`)
  }

  const withDown = input.downPayment.mode !== 'none'
  if (!withDown && !terms.allowNoDownPayment) {
    throw new CalculationError('Покупка без первоначального взноса недоступна')
  }

  // Цена продажи: либо согласованная заранее, либо стоимость + наценка по таблице.
  let markupPercent: number | null = null
  let salePrice: number
  if (input.salePriceOverride !== undefined) {
    salePrice = Math.round(input.salePriceOverride)
    assertPositiveInteger(salePrice, 'Цена продажи')
    if (salePrice < price) {
      warnings.push('Цена продажи ниже стоимости товара — проверьте значения.')
    }
  } else {
    markupPercent = markupPercentFor(termMonths, withDown, terms)
    salePrice = Math.ceil((price * (100 + markupPercent)) / 100)
  }

  // Первоначальный взнос считается от стоимости товара (как в текущем калькуляторе).
  const minDownPayment = withDown ? Math.ceil((price * terms.minDownPercent) / 100) : 0
  let downPayment = 0
  if (input.downPayment.mode === 'percent') {
    const percent = input.downPayment.percent
    if (!Number.isFinite(percent) || percent < terms.minDownPercent) {
      throw new CalculationError(`Первоначальный взнос — не меньше ${terms.minDownPercent}%`)
    }
    downPayment = Math.ceil((price * percent) / 100)
  } else if (input.downPayment.mode === 'amount') {
    downPayment = Math.round(input.downPayment.amount)
    if (!Number.isFinite(downPayment) || downPayment < minDownPayment) {
      throw new CalculationError(
        `Первоначальный взнос — не меньше ${terms.minDownPercent}% (${minDownPayment.toLocaleString('ru-RU')} ₽)`,
      )
    }
  }

  const remaining = salePrice - downPayment
  if (remaining <= 0) {
    throw new CalculationError('Первоначальный взнос покрывает всю цену — оплата частями не нужна')
  }

  // Равные платежи, округлённые вверх; последний платёж — остаток,
  // чтобы сумма всех платежей была ровно равна цене продажи.
  const step = terms.paymentRoundingRub
  let regularPayment = Math.ceil(remaining / termMonths / step) * step
  let lastPayment = remaining - regularPayment * (termMonths - 1)
  if (lastPayment <= 0) {
    // Для очень маленьких сумм округление не подходит — делим без него.
    regularPayment = Math.ceil(remaining / termMonths)
    lastPayment = remaining - regularPayment * (termMonths - 1)
  }

  const start = input.startDate ?? new Date()
  const schedule: ScheduleItem[] = []
  if (downPayment > 0) {
    schedule.push({ number: 0, dueDate: toIsoDate(start), amount: downPayment, kind: 'down' })
  }
  for (let i = 1; i <= termMonths; i++) {
    schedule.push({
      number: i,
      dueDate: toIsoDate(addMonths(start, i)),
      amount: i === termMonths ? lastPayment : regularPayment,
      kind: 'regular',
    })
  }

  const total = schedule.reduce((sum, item) => sum + item.amount, 0)

  return {
    price,
    termMonths,
    markupPercent,
    markupAmount: salePrice - price,
    salePrice,
    downPayment,
    downPaymentPercent: Math.round((downPayment / price) * 1000) / 10,
    minDownPayment,
    remaining,
    paymentsCount: termMonths,
    regularPayment,
    lastPayment,
    schedule,
    total,
    warnings,
  }
}

export function formatRub(value: number): string {
  return `${Math.round(value).toLocaleString('ru-RU')} ₽`
}

export function formatDateRu(isoDate: string): string {
  const [y, m, d] = isoDate.split('-')
  return `${d}.${m}.${y}`
}

export function pluralMonths(n: number): string {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return `${n} месяц`
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${n} месяца`
  return `${n} месяцев`
}

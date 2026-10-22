import { describe, expect, it } from 'vitest'

import { installmentTerms } from '@/config/terms'
import { addMonths, calculateInstallment, CalculationError, toIsoDate } from '@/lib/calculator'

const start = new Date(2026, 0, 31) // 31 января 2026

describe('calculateInstallment', () => {
  it('считает пример с главной: 100 000 ₽, взнос 25%, 6 месяцев', () => {
    const r = calculateInstallment({
      price: 100_000,
      termMonths: 6,
      downPayment: { mode: 'percent', percent: 25 },
      startDate: start,
    })
    expect(r.markupPercent).toBe(21)
    expect(r.salePrice).toBe(121_000)
    expect(r.downPayment).toBe(25_000)
    expect(r.remaining).toBe(96_000)
    expect(r.paymentsCount).toBe(6)
    expect(r.regularPayment).toBe(16_000)
    expect(r.lastPayment).toBe(16_000)
    expect(r.total).toBe(121_000)
  })

  it('сумма всех платежей ровно равна цене продажи, последний платёж — остаток', () => {
    const r = calculateInstallment({
      price: 47_333,
      termMonths: 7,
      downPayment: { mode: 'percent', percent: 25 },
      startDate: start,
    })
    const sum = r.schedule.reduce((s, i) => s + i.amount, 0)
    expect(sum).toBe(r.salePrice)
    expect(r.total).toBe(r.salePrice)
    expect(r.regularPayment % installmentTerms.paymentRoundingRub).toBe(0)
    expect(r.lastPayment).toBeLessThanOrEqual(r.regularPayment)
    expect(r.lastPayment).toBeGreaterThan(0)
  })

  it('первоначальный взнос по умолчанию 25% от стоимости товара, округление вверх', () => {
    const r = calculateInstallment({ price: 10_001, termMonths: 6, downPayment: { mode: 'percent', percent: 25 } })
    expect(r.minDownPayment).toBe(2_501)
    expect(r.downPayment).toBe(2_501)
  })

  it('разрешает взнос больше минимума суммой', () => {
    const r = calculateInstallment({
      price: 100_000,
      termMonths: 7,
      downPayment: { mode: 'amount', amount: 40_000 },
    })
    expect(r.downPayment).toBe(40_000)
    expect(r.markupPercent).toBe(23)
    expect(r.remaining).toBe(123_000 - 40_000)
  })

  it('отклоняет взнос меньше 25%', () => {
    expect(() =>
      calculateInstallment({ price: 100_000, termMonths: 6, downPayment: { mode: 'amount', amount: 24_999 } }),
    ).toThrow(CalculationError)
    expect(() =>
      calculateInstallment({ price: 100_000, termMonths: 6, downPayment: { mode: 'percent', percent: 20 } }),
    ).toThrow(/не меньше 25%/)
  })

  it('без взноса использует отдельную таблицу наценок и не создаёт строку взноса', () => {
    const r = calculateInstallment({ price: 100_000, termMonths: 6, downPayment: { mode: 'none' }, startDate: start })
    expect(r.markupPercent).toBe(26)
    expect(r.downPayment).toBe(0)
    expect(r.schedule).toHaveLength(6)
    expect(r.schedule.every((i) => i.kind === 'regular')).toBe(true)
    expect(r.total).toBe(126_000)
  })

  it('использует согласованную цену продажи вместо таблицы', () => {
    const r = calculateInstallment({
      price: 100_000,
      salePriceOverride: 118_000,
      termMonths: 6,
      downPayment: { mode: 'percent', percent: 25 },
    })
    expect(r.markupPercent).toBeNull()
    expect(r.salePrice).toBe(118_000)
    expect(r.markupAmount).toBe(18_000)
    expect(r.total).toBe(118_000)
  })

  it('предупреждает, если цена продажи ниже стоимости', () => {
    const r = calculateInstallment({
      price: 100_000,
      salePriceOverride: 90_000,
      termMonths: 6,
      downPayment: { mode: 'percent', percent: 25 },
    })
    expect(r.warnings.length).toBeGreaterThan(0)
  })

  it('строит даты графика без перескока через короткий месяц', () => {
    const r = calculateInstallment({
      price: 100_000,
      termMonths: 3,
      downPayment: { mode: 'percent', percent: 25 },
      startDate: start,
    })
    expect(r.schedule.map((i) => i.dueDate)).toEqual(['2026-01-31', '2026-02-28', '2026-03-31', '2026-04-30'])
    expect(r.schedule[0]?.kind).toBe('down')
  })

  it('отклоняет недопустимые значения', () => {
    expect(() => calculateInstallment({ price: 0, termMonths: 6, downPayment: { mode: 'none' } })).toThrow()
    expect(() => calculateInstallment({ price: Number.NaN, termMonths: 6, downPayment: { mode: 'none' } })).toThrow()
    expect(() => calculateInstallment({ price: 100_000, termMonths: 13, downPayment: { mode: 'none' } })).toThrow(
      /недоступен/,
    )
    expect(() =>
      calculateInstallment({ price: 10_000_000, termMonths: 6, downPayment: { mode: 'none' } }),
    ).toThrow(/Стоимость/)
    expect(() =>
      calculateInstallment({ price: 100_000, termMonths: 6, downPayment: { mode: 'amount', amount: 200_000 } }),
    ).toThrow(/всю цену/)
  })
})

describe('addMonths', () => {
  it('учитывает високосный год', () => {
    expect(toIsoDate(addMonths(new Date(2028, 0, 31), 1))).toBe('2028-02-29')
    expect(toIsoDate(addMonths(new Date(2026, 10, 15), 2))).toBe('2027-01-15')
  })
})

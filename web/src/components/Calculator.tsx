'use client'

import Link from 'next/link'
import { useId, useMemo, useState } from 'react'

import { WhatsAppIcon } from '@/components/icons'
import { calculationDisclaimer, installmentTerms } from '@/config/terms'
import {
  calculateInstallment,
  CalculationError,
  formatDateRu,
  formatRub,
  pluralMonths,
  type CalculationResult,
} from '@/lib/calculator'
import { whatsappLink } from '@/lib/whatsapp'

interface Props {
  initialPrice?: number
  /** Цена продажи, зафиксированная для конкретного товара. */
  fixedSalePrice?: number
  productName?: string
  productSlug?: string
  compact?: boolean
}

function digitsOnly(value: string): number {
  const n = Number(value.replace(/\D/g, ''))
  return Number.isFinite(n) ? n : 0
}

function formatInput(value: number): string {
  return value ? value.toLocaleString('ru-RU') : ''
}

export function Calculator({ initialPrice, fixedSalePrice, productName, productSlug, compact = false }: Props) {
  const id = useId()
  const terms = installmentTerms
  const [priceText, setPriceText] = useState(formatInput(initialPrice ?? 100_000))
  const [termMonths, setTermMonths] = useState(terms.defaultTerm)
  const [withDown, setWithDown] = useState(true)
  const [downPercent, setDownPercent] = useState(terms.defaultDownPercent)
  const [customSale, setCustomSale] = useState(false)
  const [saleText, setSaleText] = useState('')

  const price = digitsOnly(priceText)
  const salePriceOverride = fixedSalePrice ?? (customSale && digitsOnly(saleText) > 0 ? digitsOnly(saleText) : undefined)

  const { result, error } = useMemo((): { result: CalculationResult | null; error: string | null } => {
    try {
      return {
        result: calculateInstallment({
          price,
          termMonths,
          downPayment: withDown ? { mode: 'percent', percent: downPercent } : { mode: 'none' },
          salePriceOverride,
        }),
        error: null,
      }
    } catch (e) {
      if (e instanceof CalculationError) return { result: null, error: e.message }
      throw e
    }
  }, [price, termMonths, withDown, downPercent, salePriceOverride])

  const applyParams = new URLSearchParams({ price: String(price), term: String(termMonths) })
  if (productSlug) applyParams.set('product', productSlug)
  if (!withDown) applyParams.set('down', '0')
  else applyParams.set('down', String(downPercent))

  const waText = result
    ? [
        'Здравствуйте! Я сделал(а) расчёт на сайте NUR Invest.',
        productName ? `Товар: ${productName}` : null,
        `Стоимость товара: ${formatRub(result.price)}`,
        `Срок оплаты: ${pluralMonths(result.termMonths)}`,
        `Первоначальный взнос: ${formatRub(result.downPayment)}`,
        `Ежемесячный платёж: ${formatRub(result.regularPayment)}`,
        `Общая цена сделки: ${formatRub(result.total)}`,
        'Хочу уточнить условия.',
      ]
        .filter(Boolean)
        .join('\n')
    : undefined
  const waHref = whatsappLink(waText)

  return (
    <div className={compact ? 'calc calc--compact' : 'calc'}>
      <form className={compact ? '' : 'card'} onSubmit={(e) => e.preventDefault()} aria-label="Параметры расчёта">
        <div className="field">
          <label htmlFor={`${id}-price`}>Стоимость товара, ₽</label>
          <input
            id={`${id}-price`}
            className="input"
            inputMode="numeric"
            autoComplete="off"
            value={priceText}
            onChange={(e) => setPriceText(formatInput(digitsOnly(e.target.value)))}
            aria-invalid={Boolean(error) && price <= 0}
            aria-describedby={`${id}-price-hint`}
            readOnly={Boolean(fixedSalePrice)}
          />
          <span id={`${id}-price-hint`} className="field__hint">
            От {formatRub(terms.minPrice)} до {formatRub(terms.maxPrice)}
          </span>
        </div>

        <fieldset className="field" style={{ border: 0, padding: 0, margin: '0 0 18px' }}>
          <legend className="label" style={{ fontWeight: 650, marginBottom: 6 }}>
            Срок оплаты
          </legend>
          <div className="term-options">
            {terms.termOptions.map((m) => (
              <label key={m} className="radio-card">
                <input
                  type="radio"
                  name={`${id}-term`}
                  value={m}
                  checked={termMonths === m}
                  onChange={() => setTermMonths(m)}
                />
                <span>
                  {m}
                  <span className="visually-hidden"> мес.</span>
                </span>
              </label>
            ))}
          </div>
          <span className="field__hint">Количество месяцев. Чаще всего выбирают 6–7 месяцев.</span>
        </fieldset>

        {terms.allowNoDownPayment && (
          <fieldset className="field" style={{ border: 0, padding: 0, margin: '0 0 18px' }}>
            <legend className="label" style={{ fontWeight: 650, marginBottom: 6 }}>
              Первоначальный взнос
            </legend>
            <div className="radio-group">
              <label className="radio-card">
                <input type="radio" name={`${id}-down`} checked={withDown} onChange={() => setWithDown(true)} />
                <span>С взносом от {terms.minDownPercent}%</span>
              </label>
              <label className="radio-card">
                <input type="radio" name={`${id}-down`} checked={!withDown} onChange={() => setWithDown(false)} />
                <span>Без взноса</span>
              </label>
            </div>
          </fieldset>
        )}

        {withDown && (
          <div className="field">
            <label htmlFor={`${id}-down-range`}>
              Размер взноса: {downPercent}% {result ? `(${formatRub(result.downPayment)})` : ''}
            </label>
            <input
              id={`${id}-down-range`}
              className="range"
              type="range"
              min={terms.minDownPercent}
              max={90}
              step={5}
              value={downPercent}
              onChange={(e) => setDownPercent(Number(e.target.value))}
              aria-valuetext={`${downPercent} процентов`}
            />
            <span className="field__hint">
              Минимум {terms.minDownPercent}% от стоимости товара. Чем больше взнос, тем меньше ежемесячный платёж.
            </span>
          </div>
        )}

        {fixedSalePrice === undefined && !compact && (
          <div className="field">
            <div className="checkbox">
              <input
                id={`${id}-custom-sale`}
                type="checkbox"
                checked={customSale}
                onChange={(e) => setCustomSale(e.target.checked)}
              />
              <label htmlFor={`${id}-custom-sale`}>У меня уже есть согласованная цена продажи</label>
            </div>
            {customSale && (
              <>
                <label htmlFor={`${id}-sale`} className="visually-hidden">
                  Цена продажи, ₽
                </label>
                <input
                  id={`${id}-sale`}
                  className="input"
                  inputMode="numeric"
                  placeholder="Цена продажи, ₽"
                  value={saleText}
                  onChange={(e) => setSaleText(formatInput(digitsOnly(e.target.value)))}
                />
                <span className="field__hint">
                  Если менеджер уже назвал цену продажи для вашего товара, укажите её — расчёт будет по ней.
                </span>
              </>
            )}
          </div>
        )}
      </form>

      <section className="result" aria-live="polite" aria-label="Результат расчёта">
        {error || !result ? (
          <div className="alert alert--warning" role="status">
            <p>{error ?? 'Укажите стоимость товара'}</p>
          </div>
        ) : (
          <>
            <div className="result__main">
              <span>Ежемесячный платёж</span>
              <strong>{formatRub(result.regularPayment)}</strong>
              <span>
                {result.paymentsCount} платежей
                {result.lastPayment !== result.regularPayment
                  ? `, последний — ${formatRub(result.lastPayment)}`
                  : ''}
              </span>
            </div>
            <dl className="result__rows">
              <div>
                <dt>Стоимость товара</dt>
                <dd>{formatRub(result.price)}</dd>
              </div>
              <div>
                <dt>Первоначальный взнос</dt>
                <dd>{formatRub(result.downPayment)}</dd>
              </div>
              <div>
                <dt>Остаток к оплате частями</dt>
                <dd>{formatRub(result.remaining)}</dd>
              </div>
              <div>
                <dt>Количество платежей</dt>
                <dd>{result.paymentsCount}</dd>
              </div>
              <div>
                <dt>
                  Наценка продавца
                  {result.markupPercent !== null ? ` (${result.markupPercent}% от стоимости)` : ''}
                </dt>
                <dd>{formatRub(result.markupAmount)}</dd>
              </div>
              <div className="is-total">
                <dt>Общая цена сделки</dt>
                <dd>{formatRub(result.total)}</dd>
              </div>
            </dl>
            {result.warnings.map((w) => (
              <p key={w} className="alert alert--warning small">
                {w}
              </p>
            ))}

            <details className="schedule" style={{ marginTop: 12 }}>
              <summary>Предварительный график платежей</summary>
              <div className="table-wrap" style={{ marginTop: 12 }}>
                <table className="table">
                  <caption className="visually-hidden">График платежей</caption>
                  <thead>
                    <tr>
                      <th scope="col">№</th>
                      <th scope="col">Дата</th>
                      <th scope="col" className="num">
                        Сумма
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.schedule.map((item) => (
                      <tr key={item.number}>
                        <td>{item.kind === 'down' ? 'Взнос' : item.number}</td>
                        <td>{formatDateRu(item.dueDate)}</td>
                        <td className="num">{formatRub(item.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <th scope="row" colSpan={2}>
                        Итого
                      </th>
                      <td className="num">
                        <strong>{formatRub(result.total)}</strong>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
              <p className="small muted" style={{ marginTop: 8 }}>
                Даты условные: график отсчитывается от дня подписания договора.
              </p>
            </details>

            <p className="notice">
              Это не кредит и не заём: цена продажи фиксируется в договоре и не растёт со временем.
              Штрафов и пеней за просрочку нет. {calculationDisclaimer}
            </p>

            <div className="btn-row">
              <Link href={`/apply?${applyParams.toString()}`} className="btn btn--primary">
                Оставить заявку
              </Link>
              {waHref ? (
                <a href={waHref} className="btn btn--whatsapp" target="_blank" rel="noopener noreferrer">
                  <WhatsAppIcon size={20} /> Обсудить в WhatsApp
                  <span className="visually-hidden"> (откроется в новом окне)</span>
                </a>
              ) : null}
            </div>
          </>
        )}
      </section>
    </div>
  )
}

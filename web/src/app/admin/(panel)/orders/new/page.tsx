import type { Metadata } from 'next'
import Link from 'next/link'

import { Flash } from '@/components/admin/Flash'
import { installmentTerms } from '@/config/terms'
import { requireAdminPage } from '@/lib/auth/session'
import { toIsoDate } from '@/lib/calculator'
import { getLead } from '@/lib/data/leads'

import { createOrderAction } from '../../actions'

export const metadata: Metadata = { title: 'Новая сделка' }

export default async function NewOrderPage({ searchParams }: PageProps<'/admin/orders/new'>) {
  await requireAdminPage('orders:write')
  const sp = await searchParams
  const lead = typeof sp.lead === 'string' ? await getLead(sp.lead) : undefined

  return (
    <>
      <p>
        <Link href="/admin/orders">← Сделки</Link>
      </p>
      <h1>Новая сделка</h1>
      <Flash error={sp.error} />
      <p className="muted">
        Заполняйте после того, как условия согласованы с клиентом и договор подготовлен. График рассчитается
        автоматически по тем же правилам, что и калькулятор на сайте.
      </p>
      <form action={createOrderAction} className="card" style={{ maxWidth: 760 }}>
        {lead && <input type="hidden" name="leadId" value={lead.id} />}
        <div className="form-row">
          <div className="field">
            <label htmlFor="customerName">Клиент (ФИО)</label>
            <input id="customerName" name="customerName" className="input" required defaultValue={lead?.name} />
          </div>
          <div className="field">
            <label htmlFor="customerPhone">Телефон клиента</label>
            <input id="customerPhone" name="customerPhone" className="input" required defaultValue={lead?.phone} />
          </div>
        </div>
        <div className="field">
          <label htmlFor="productName">Товар</label>
          <input id="productName" name="productName" className="input" required defaultValue={lead?.productInterest} />
        </div>
        <div className="form-row">
          <div className="field">
            <label htmlFor="price">Стоимость товара, ₽</label>
            <input id="price" name="price" className="input" inputMode="numeric" required defaultValue={lead?.estimatedPrice} />
          </div>
          <div className="field">
            <label htmlFor="salePrice">Цена продажи по договору, ₽</label>
            <input id="salePrice" name="salePrice" className="input" inputMode="numeric" aria-describedby="salePrice-hint" />
            <span id="salePrice-hint" className="field__hint">
              Если пусто — по таблице наценок
            </span>
          </div>
        </div>
        <div className="form-row">
          <div className="field">
            <label htmlFor="termMonths">Срок, месяцев</label>
            <select id="termMonths" name="termMonths" className="select" defaultValue={installmentTerms.defaultTerm}>
              {installmentTerms.termOptions.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="startDate">Дата договора</label>
            <input id="startDate" name="startDate" type="date" className="input" required defaultValue={toIsoDate(new Date())} />
          </div>
        </div>
        <div className="form-row">
          <div className="field">
            <label htmlFor="downMode">Первоначальный взнос</label>
            <select id="downMode" name="downMode" className="select" defaultValue="amount">
              <option value="amount">Есть взнос</option>
              <option value="none">Без взноса</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="downAmount">Сумма взноса, ₽</label>
            <input id="downAmount" name="downAmount" className="input" inputMode="numeric" aria-describedby="down-hint" />
            <span id="down-hint" className="field__hint">
              Не меньше {installmentTerms.minDownPercent}% стоимости товара
            </span>
          </div>
        </div>
        <button type="submit" className="btn btn--primary">
          Создать сделку
        </button>
      </form>
    </>
  )
}

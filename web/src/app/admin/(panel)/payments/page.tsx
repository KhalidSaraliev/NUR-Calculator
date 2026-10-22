import type { Metadata } from 'next'
import Link from 'next/link'

import { PaymentsModeBanner } from '@/components/admin/PaymentsModeBanner'
import { requireAdminPage } from '@/lib/auth/session'
import { formatRub } from '@/lib/calculator'
import { readDb } from '@/lib/db/store'
import { PAYMENT_STATUSES, paymentStatusLabels, type PaymentStatus } from '@/lib/types'

export const metadata: Metadata = { title: 'Платежи' }

export default async function PaymentsPage({ searchParams }: PageProps<'/admin/payments'>) {
  await requireAdminPage('payments:read')
  const sp = await searchParams
  const statusParam = typeof sp.status === 'string' ? sp.status : ''
  const status = (PAYMENT_STATUSES as readonly string[]).includes(statusParam) ? (statusParam as PaymentStatus) : undefined
  const db = await readDb()
  const orders = new Map(db.orders.map((o) => [o.id, o]))
  const payments = db.payments
    .filter((p) => !status || p.status === status)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  return (
    <>
      <h1>Платежи</h1>
      <PaymentsModeBanner />
      <form method="get" className="admin-toolbar">
        <div className="field">
          <label htmlFor="status">Статус</label>
          <select id="status" name="status" className="select" defaultValue={status ?? ''}>
            <option value="">Все</option>
            {PAYMENT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {paymentStatusLabels[s]}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" className="btn btn--primary btn--sm">
          Показать
        </button>
      </form>
      {payments.length === 0 ? (
        <p className="empty">Платежей пока нет.</p>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <caption className="visually-hidden">Платежи</caption>
            <thead>
              <tr>
                <th scope="col">Создан</th>
                <th scope="col">Сделка</th>
                <th scope="col">Платёж</th>
                <th scope="col" className="num">
                  Сумма
                </th>
                <th scope="col">Статус</th>
                <th scope="col">Последнее событие</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => {
                const order = orders.get(p.orderId)
                const last = p.events[p.events.length - 1]
                return (
                  <tr key={p.id}>
                    <td>{new Date(p.createdAt).toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' })}</td>
                    <td>{order ? <Link href={`/admin/orders/${order.id}`}>{order.number}</Link> : '—'}</td>
                    <td>{p.installmentNumber === 0 ? 'Взнос' : `№ ${p.installmentNumber}`}</td>
                    <td className="num">{formatRub(p.amountKopecks / 100)}</td>
                    <td>
                      <span className={`badge ${p.status === 'confirmed' ? 'badge--ok' : p.status === 'error' ? 'badge--danger' : ''}`}>
                        {paymentStatusLabels[p.status]}
                      </span>
                    </td>
                    <td className="small">
                      {last ? `${last.providerStatus ?? ''} ${last.note ?? ''}`.trim() || '—' : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}

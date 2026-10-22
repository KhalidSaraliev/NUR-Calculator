import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { Flash } from '@/components/admin/Flash'
import { PaymentsModeBanner } from '@/components/admin/PaymentsModeBanner'
import { siteConfig } from '@/config/site'
import { can } from '@/lib/auth/permissions'
import { requireAdminPage } from '@/lib/auth/session'
import { formatDateRu, formatRub } from '@/lib/calculator'
import { installmentState } from '@/lib/data/orders'
import { readDb } from '@/lib/db/store'
import { getPaymentsConfig } from '@/lib/payments/config'
import { ORDER_STATUSES, orderStatusLabels, paymentStatusLabels } from '@/lib/types'
import { formatRuPhone } from '@/lib/validation'

import { createPaymentLinkAction, refreshPaymentAction, setOrderStatusAction } from '../../actions'

export const metadata: Metadata = { title: 'Сделка' }

const stateLabels = { paid: 'Оплачен', in_progress: 'Ожидает оплаты', unpaid: 'Не оплачен' } as const

export default async function OrderPage({ params, searchParams }: PageProps<'/admin/orders/[id]'>) {
  const user = await requireAdminPage('orders:read')
  const { id } = await params
  const sp = await searchParams
  const db = await readDb()
  const order = db.orders.find((o) => o.id === id)
  if (!order) notFound()
  const payments = db.payments.filter((p) => p.orderId === order.id)
  const paymentsEnabled = getPaymentsConfig().enabled
  const canCreate = can(user.role, 'payments:create') && paymentsEnabled && order.status !== 'canceled' && order.status !== 'completed'
  const paid = order.schedule
    .filter((i) => installmentState(db.payments, order.id, i.number) === 'paid')
    .reduce((s, i) => s + i.amount, 0)

  return (
    <>
      <p>
        <Link href="/admin/orders">← Сделки</Link>
      </p>
      <h1>Сделка {order.number}</h1>
      <Flash ok={sp.ok} error={sp.error} />
      <PaymentsModeBanner />
      <div className="two-col">
        <section className="card">
          <dl className="result__rows">
            <div>
              <dt>Клиент</dt>
              <dd style={{ whiteSpace: 'normal' }}>
                {order.customerName}, {formatRuPhone(order.customerPhone)}
              </dd>
            </div>
            <div>
              <dt>Товар</dt>
              <dd style={{ whiteSpace: 'normal' }}>{order.productName}</dd>
            </div>
            <div>
              <dt>Стоимость товара</dt>
              <dd>{formatRub(order.price)}</dd>
            </div>
            <div className="is-total">
              <dt>Цена продажи</dt>
              <dd>{formatRub(order.salePrice)}</dd>
            </div>
            <div>
              <dt>Оплачено (подтверждено банком)</dt>
              <dd>{formatRub(paid)}</dd>
            </div>
            <div>
              <dt>Статус</dt>
              <dd>{orderStatusLabels[order.status]}</dd>
            </div>
          </dl>
          {order.leadId && (
            <p className="small" style={{ marginTop: 12 }}>
              <Link href={`/admin/leads/${order.leadId}`}>Исходная заявка</Link>
            </p>
          )}
        </section>
        {can(user.role, 'orders:write') && (
          <section className="card">
            <h2 style={{ fontSize: '1.05rem' }}>Статус сделки</h2>
            <form action={setOrderStatusAction}>
              <input type="hidden" name="id" value={order.id} />
              <div className="field">
                <label htmlFor="status" className="visually-hidden">
                  Статус
                </label>
                <select id="status" name="status" className="select" defaultValue={order.status}>
                  {ORDER_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {orderStatusLabels[s]}
                    </option>
                  ))}
                </select>
              </div>
              <button type="submit" className="btn btn--secondary btn--sm">
                Сохранить
              </button>
            </form>
            <p className="small muted" style={{ marginTop: 12 }}>
              «Оплачена полностью» выставляется автоматически, когда банк подтвердит все платежи.
            </p>
          </section>
        )}
      </div>

      <h2 style={{ fontSize: '1.25rem', marginTop: 32 }}>График и платежи</h2>
      <div className="table-wrap">
        <table className="table">
          <caption className="visually-hidden">График платежей</caption>
          <thead>
            <tr>
              <th scope="col">№</th>
              <th scope="col">Дата</th>
              <th scope="col" className="num">
                Сумма
              </th>
              <th scope="col">Статус</th>
              <th scope="col">Ссылка на оплату</th>
            </tr>
          </thead>
          <tbody>
            {order.schedule.map((item) => {
              const state = installmentState(db.payments, order.id, item.number)
              const latest = payments
                .filter((p) => p.installmentNumber === item.number)
                .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]
              return (
                <tr key={item.number}>
                  <td>{item.kind === 'down' ? 'Взнос' : item.number}</td>
                  <td>{formatDateRu(item.dueDate)}</td>
                  <td className="num">{formatRub(item.amount)}</td>
                  <td>
                    <span className={`badge ${state === 'paid' ? 'badge--ok' : state === 'in_progress' ? 'badge--info' : ''}`}>
                      {stateLabels[state]}
                    </span>
                    {latest && state !== 'paid' && (
                      <div className="small muted">Последняя попытка: {paymentStatusLabels[latest.status]}</div>
                    )}
                  </td>
                  <td>
                    {latest && state === 'in_progress' && (
                      <div className="small" style={{ wordBreak: 'break-all' }}>
                        <code>{`${siteConfig.url}/pay/${latest.id}`}</code>
                      </div>
                    )}
                    <div className="btn-row" style={{ marginTop: 6 }}>
                      {canCreate && state !== 'paid' && (
                        <form action={createPaymentLinkAction}>
                          <input type="hidden" name="orderId" value={order.id} />
                          <input type="hidden" name="installment" value={item.number} />
                          <button type="submit" className="btn btn--secondary btn--sm">
                            {state === 'in_progress' ? 'Показать ссылку' : 'Создать ссылку'}
                          </button>
                        </form>
                      )}
                      {latest?.providerPaymentId && state !== 'paid' && paymentsEnabled && (
                        <form action={refreshPaymentAction}>
                          <input type="hidden" name="orderId" value={order.id} />
                          <input type="hidden" name="paymentId" value={latest.id} />
                          <button type="submit" className="btn btn--ghost btn--sm">
                            Проверить в банке
                          </button>
                        </form>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <p className="small muted" style={{ marginTop: 10 }}>
        Отправьте клиенту ссылку вида /pay/… — на этой странице он перейдёт к оплате на странице банка и увидит
        подтверждённый статус. Оплата отмечается только после уведомления банка, проверенного по подписи.
      </p>
    </>
  )
}

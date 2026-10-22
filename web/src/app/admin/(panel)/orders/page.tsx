import type { Metadata } from 'next'
import Link from 'next/link'

import { can } from '@/lib/auth/permissions'
import { requireAdminPage } from '@/lib/auth/session'
import { formatRub } from '@/lib/calculator'
import { listOrders } from '@/lib/data/orders'
import { orderStatusLabels } from '@/lib/types'

export const metadata: Metadata = { title: 'Сделки' }

export default async function OrdersPage() {
  const user = await requireAdminPage('orders:read')
  const orders = await listOrders()
  return (
    <>
      <div className="admin-toolbar" style={{ justifyContent: 'space-between' }}>
        <h1 style={{ margin: 0 }}>Сделки</h1>
        {can(user.role, 'orders:write') && (
          <Link href="/admin/orders/new" className="btn btn--primary btn--sm">
            Новая сделка
          </Link>
        )}
      </div>
      {orders.length === 0 ? (
        <p className="empty">Сделок пока нет. Создайте сделку из заявки после согласования условий.</p>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <caption className="visually-hidden">Список сделок</caption>
            <thead>
              <tr>
                <th scope="col">Номер</th>
                <th scope="col">Клиент</th>
                <th scope="col">Товар</th>
                <th scope="col" className="num">
                  Цена продажи
                </th>
                <th scope="col">Срок</th>
                <th scope="col">Статус</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td>
                    <Link href={`/admin/orders/${o.id}`}>{o.number}</Link>
                  </td>
                  <td>{o.customerName}</td>
                  <td>{o.productName}</td>
                  <td className="num">{formatRub(o.salePrice)}</td>
                  <td>{o.termMonths} мес.</td>
                  <td>{orderStatusLabels[o.status]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}

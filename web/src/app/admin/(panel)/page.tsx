import Link from 'next/link'

import { PaymentsModeBanner } from '@/components/admin/PaymentsModeBanner'
import { requireAdminPage } from '@/lib/auth/session'
import { readDb } from '@/lib/db/store'

export default async function AdminDashboard({ searchParams }: PageProps<'/admin'>) {
  const user = await requireAdminPage()
  const sp = await searchParams
  const db = await readDb()
  const newLeads = db.leads.filter((l) => l.status === 'new').length
  const activeOrders = db.orders.filter((o) => o.status === 'active').length
  const confirmed = db.payments.filter((p) => p.status === 'confirmed')
  const needsReview = db.payments.filter((p) => p.status === 'error').length

  return (
    <>
      <h1>Здравствуйте, {user.name}</h1>
      {sp.denied && (
        <div className="alert alert--warning" role="alert">
          <p>Недостаточно прав для этого раздела.</p>
        </div>
      )}
      <PaymentsModeBanner />
      <div className="grid grid--4" style={{ marginBottom: 28 }}>
        <Link href="/admin/leads?status=new" className="card category-card">
          <span className="muted">Новые заявки</span>
          <span className="stat">{newLeads}</span>
        </Link>
        <Link href="/admin/orders" className="card category-card">
          <span className="muted">Действующие сделки</span>
          <span className="stat">{activeOrders}</span>
        </Link>
        <Link href="/admin/payments" className="card category-card">
          <span className="muted">Подтверждённых платежей</span>
          <span className="stat">{confirmed.length}</span>
        </Link>
        <Link href="/admin/payments?status=error" className="card category-card">
          <span className="muted">Требуют проверки</span>
          <span className="stat">{needsReview}</span>
        </Link>
      </div>
      <div className="card card--soft">
        <h2 style={{ fontSize: '1.1rem' }}>Порядок работы</h2>
        <ol style={{ paddingLeft: '1.2em', margin: 0 }}>
          <li>Менеджер обрабатывает новую заявку и меняет её статус.</li>
          <li>После согласования условий администратор создаёт сделку с графиком платежей.</li>
          <li>Для каждого платежа создаётся ссылка на оплату на странице банка и отправляется клиенту.</li>
          <li>Статус «Оплачен» появляется только после подтверждения от банка.</li>
        </ol>
      </div>
    </>
  )
}

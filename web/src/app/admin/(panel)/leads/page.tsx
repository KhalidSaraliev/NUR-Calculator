import type { Metadata } from 'next'
import Link from 'next/link'

import { requireAdminPage } from '@/lib/auth/session'
import { listLeads } from '@/lib/data/leads'
import { formatRub } from '@/lib/calculator'
import { contactMethodLabels, LEAD_STATUSES, leadStatusLabels, type LeadStatus } from '@/lib/types'
import { formatRuPhone } from '@/lib/validation'

export const metadata: Metadata = { title: 'Заявки' }

export default async function LeadsPage({ searchParams }: PageProps<'/admin/leads'>) {
  await requireAdminPage('leads:read')
  const sp = await searchParams
  const statusParam = typeof sp.status === 'string' ? sp.status : ''
  const status = (LEAD_STATUSES as readonly string[]).includes(statusParam) ? (statusParam as LeadStatus) : undefined
  const q = typeof sp.q === 'string' ? sp.q.slice(0, 100) : ''
  const leads = await listLeads({ status, q })

  return (
    <>
      <h1>Заявки</h1>
      <form method="get" className="admin-toolbar">
        <div className="field">
          <label htmlFor="q">Поиск</label>
          <input id="q" name="q" className="input" defaultValue={q} placeholder="Имя, телефон, город, товар" />
        </div>
        <div className="field">
          <label htmlFor="status">Статус</label>
          <select id="status" name="status" className="select" defaultValue={status ?? ''}>
            <option value="">Все</option>
            {LEAD_STATUSES.map((s) => (
              <option key={s} value={s}>
                {leadStatusLabels[s]}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" className="btn btn--primary btn--sm">
          Показать
        </button>
      </form>
      {leads.length === 0 ? (
        <p className="empty">Заявок пока нет.</p>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <caption className="visually-hidden">Список заявок</caption>
            <thead>
              <tr>
                <th scope="col">Дата</th>
                <th scope="col">Клиент</th>
                <th scope="col">Товар</th>
                <th scope="col" className="num">
                  Сумма
                </th>
                <th scope="col">Связь</th>
                <th scope="col">Статус</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((l) => (
                <tr key={l.id}>
                  <td>{new Date(l.createdAt).toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' })}</td>
                  <td>
                    <Link href={`/admin/leads/${l.id}`}>{l.name}</Link>
                    <div className="small muted">
                      {formatRuPhone(l.phone)}, {l.city}
                    </div>
                  </td>
                  <td>{l.productInterest}</td>
                  <td className="num">{l.estimatedPrice ? formatRub(l.estimatedPrice) : '—'}</td>
                  <td>{contactMethodLabels[l.contactMethod]}</td>
                  <td>
                    <span className={`badge ${l.status === 'new' ? 'badge--info' : ''}`}>{leadStatusLabels[l.status]}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}

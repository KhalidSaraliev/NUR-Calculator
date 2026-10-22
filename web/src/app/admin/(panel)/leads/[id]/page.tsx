import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { Flash } from '@/components/admin/Flash'
import { can } from '@/lib/auth/permissions'
import { requireAdminPage } from '@/lib/auth/session'
import { formatRub } from '@/lib/calculator'
import { getLead } from '@/lib/data/leads'
import { contactMethodLabels, LEAD_STATUSES, leadStatusLabels } from '@/lib/types'
import { formatRuPhone } from '@/lib/validation'
import { whatsappLink } from '@/lib/whatsapp'

import { changeLeadStatus } from '../../actions'

export const metadata: Metadata = { title: 'Заявка' }

export default async function LeadPage({ params, searchParams }: PageProps<'/admin/leads/[id]'>) {
  const user = await requireAdminPage('leads:read')
  const { id } = await params
  const sp = await searchParams
  const lead = await getLead(id)
  if (!lead) notFound()
  const wa = whatsappLink(`Здравствуйте, ${lead.name}! Это NUR Invest, по вашей заявке.`, lead.phone.replace(/\D/g, ''))
  const fmt = (iso: string) => new Date(iso).toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' })

  return (
    <>
      <p>
        <Link href="/admin/leads">← Все заявки</Link>
      </p>
      <h1>Заявка от {lead.name}</h1>
      <Flash ok={sp.ok} error={sp.error} />
      <div className="two-col">
        <section className="card">
          <dl className="result__rows">
            <div>
              <dt>Телефон</dt>
              <dd>
                <a href={`tel:${lead.phone}`}>{formatRuPhone(lead.phone)}</a>
              </dd>
            </div>
            <div>
              <dt>Город</dt>
              <dd>{lead.city}</dd>
            </div>
            <div>
              <dt>Товар</dt>
              <dd style={{ whiteSpace: 'normal' }}>{lead.productInterest}</dd>
            </div>
            <div>
              <dt>Ориентировочная стоимость</dt>
              <dd>{lead.estimatedPrice ? formatRub(lead.estimatedPrice) : '—'}</dd>
            </div>
            <div>
              <dt>Способ связи</dt>
              <dd>{contactMethodLabels[lead.contactMethod]}</dd>
            </div>
            <div>
              <dt>Создана</dt>
              <dd>{fmt(lead.createdAt)}</dd>
            </div>
            <div>
              <dt>Согласие на обработку ПДн</dt>
              <dd>
                {fmt(lead.consent.at)} (ред. {lead.consent.policyVersion})
              </dd>
            </div>
          </dl>
          {lead.comment && (
            <>
              <h2 style={{ fontSize: '1rem', marginTop: 16 }}>Комментарий</h2>
              <p style={{ whiteSpace: 'pre-wrap' }}>{lead.comment}</p>
            </>
          )}
          <div className="btn-row" style={{ marginTop: 16 }}>
            {wa && (
              <a href={wa} className="btn btn--whatsapp btn--sm" target="_blank" rel="noopener noreferrer">
                Написать клиенту в WhatsApp
              </a>
            )}
            {can(user.role, 'orders:write') && (
              <Link href={`/admin/orders/new?lead=${lead.id}`} className="btn btn--secondary btn--sm">
                Создать сделку
              </Link>
            )}
          </div>
        </section>
        <section className="card">
          <h2 style={{ fontSize: '1.1rem' }}>Статус: {leadStatusLabels[lead.status]}</h2>
          {can(user.role, 'leads:update') && (
            <form action={changeLeadStatus}>
              <input type="hidden" name="id" value={lead.id} />
              <div className="field">
                <label htmlFor="status">Новый статус</label>
                <select id="status" name="status" className="select" defaultValue={lead.status}>
                  {LEAD_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {leadStatusLabels[s]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="note">Заметка</label>
                <textarea id="note" name="note" className="textarea" maxLength={500} />
              </div>
              <button type="submit" className="btn btn--primary btn--sm">
                Сохранить
              </button>
            </form>
          )}
          <h3 style={{ fontSize: '1rem', marginTop: 20 }}>История</h3>
          <ul className="small" style={{ paddingLeft: '1.2em' }}>
            {[...lead.history].reverse().map((h, i) => (
              <li key={i}>
                {fmt(h.at)} — {leadStatusLabels[h.status]}
                {h.by ? ` (${h.by})` : ''}
                {h.note ? `: ${h.note}` : ''}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  )
}

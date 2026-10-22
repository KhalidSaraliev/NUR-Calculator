import 'server-only'

import { randomUUID } from 'node:crypto'

import { mutateDb, readDb } from '@/lib/db/store'
import type { Lead, LeadStatus } from '@/lib/types'
import { PRIVACY_POLICY_VERSION, type LeadData } from '@/lib/validation'

export async function createLead(data: LeadData, source: Lead['source'] = 'site'): Promise<Lead> {
  const now = new Date().toISOString()
  const lead: Lead = {
    id: randomUUID(),
    createdAt: now,
    name: data.name,
    phone: data.phone,
    city: data.city,
    productInterest: data.productInterest,
    productId: data.productId,
    estimatedPrice: data.estimatedPrice,
    contactMethod: data.contactMethod,
    comment: data.comment ?? '',
    consent: { given: true, at: now, policyVersion: PRIVACY_POLICY_VERSION },
    source,
    status: 'new',
    history: [{ at: now, status: 'new' }],
  }
  await mutateDb((db) => {
    db.leads.push(lead)
  })
  return lead
}

export async function listLeads(filter?: { status?: LeadStatus; q?: string }): Promise<Lead[]> {
  const db = await readDb()
  const q = filter?.q?.trim().toLowerCase()
  return db.leads
    .filter((l) => !filter?.status || l.status === filter.status)
    .filter(
      (l) =>
        !q ||
        [l.name, l.phone, l.city, l.productInterest].some((v) => v.toLowerCase().includes(q)),
    )
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export async function getLead(id: string): Promise<Lead | undefined> {
  const db = await readDb()
  return db.leads.find((l) => l.id === id)
}

export async function updateLeadStatus(id: string, status: LeadStatus, by: string, note?: string) {
  return mutateDb((db) => {
    const lead = db.leads.find((l) => l.id === id)
    if (!lead) throw new Error('Заявка не найдена')
    lead.status = status
    lead.history.push({ at: new Date().toISOString(), status, by, note: note || undefined })
    return lead
  })
}

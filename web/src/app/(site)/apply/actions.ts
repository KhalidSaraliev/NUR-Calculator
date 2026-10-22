'use server'

import { createLead } from '@/lib/data/leads'
import type { LeadFormState } from '@/lib/lead-form-state'
import { rateLimit } from '@/lib/rate-limit'
import { clientIp } from '@/lib/request'
import { leadFormDataToObject, validateLead } from '@/lib/validation'

const KEEP_FIELDS = ['name', 'phone', 'city', 'productInterest', 'productId', 'estimatedPrice', 'contactMethod', 'comment']

export async function submitLead(prev: LeadFormState, formData: FormData): Promise<LeadFormState> {
  const attempt = prev.attempt + 1
  const values: Record<string, string> = {}
  for (const key of KEEP_FIELDS) {
    const v = formData.get(key)
    if (typeof v === 'string') values[key] = v.slice(0, 1000)
  }

  // Ловушка для ботов: скрытое поле, которое человек не заполняет.
  if (typeof formData.get('website') === 'string' && formData.get('website') !== '') {
    return { status: 'success', attempt, leadNumber: '—' }
  }

  const limit = rateLimit(`lead:${await clientIp()}`, 5, 10 * 60 * 1000)
  if (!limit.allowed) {
    return {
      status: 'error',
      attempt,
      values,
      message: 'Слишком много заявок подряд. Попробуйте через несколько минут или напишите нам в WhatsApp.',
    }
  }

  const result = validateLead(leadFormDataToObject(formData))
  if (!result.ok) {
    return { status: 'error', attempt, values, errors: result.errors, message: 'Проверьте выделенные поля.' }
  }

  try {
    const lead = await createLead(result.data)
    return { status: 'success', attempt, leadNumber: lead.id.slice(0, 8).toUpperCase() }
  } catch (error) {
    console.error('[lead] не удалось сохранить заявку', error)
    return {
      status: 'error',
      attempt,
      values,
      message: 'Не удалось сохранить заявку. Попробуйте ещё раз или напишите нам в WhatsApp.',
    }
  }
}

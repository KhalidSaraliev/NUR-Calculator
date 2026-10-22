import { z } from 'zod'

import { installmentTerms } from '@/config/terms'
import { CONTACT_METHODS } from '@/lib/types'

/** Версия текста согласия на обработку ПДн — сохраняется вместе с заявкой. */
export const PRIVACY_POLICY_VERSION = '2026-10-draft'

/**
 * Приводит российский номер к виду +7XXXXXXXXXX.
 * Принимает 8XXXXXXXXXX, 7XXXXXXXXXX, +7 (XXX) XXX-XX-XX и 10 цифр без кода страны.
 * Возвращает null, если номер не похож на российский мобильный или городской.
 */
export function normalizeRuPhone(input: string): string | null {
  const digits = input.replace(/\D/g, '')
  let national: string
  if (digits.length === 11 && (digits.startsWith('7') || digits.startsWith('8'))) {
    national = digits.slice(1)
  } else if (digits.length === 10) {
    national = digits
  } else {
    return null
  }
  // Коды 3xx, 4xx, 8xx, 9xx — географические и мобильные номера РФ.
  if (!/^[3489]\d{9}$/.test(national)) return null
  return `+7${national}`
}

export function formatRuPhone(e164: string): string {
  const d = e164.replace(/\D/g, '').slice(1)
  if (d.length !== 10) return e164
  return `+7 (${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6, 8)}-${d.slice(8)}`
}

function parseRubles(value: unknown): unknown {
  if (typeof value !== 'string') return value
  const digits = value.replace(/[\s  ₽]/g, '').replace(',', '.')
  if (digits === '') return undefined
  const n = Number(digits)
  return Number.isFinite(n) ? n : value
}

const trimmed = (max: number) => z.string().trim().max(max, `Не длиннее ${max} символов`)

export const leadSchema = z.object({
  name: trimmed(80)
    .min(2, 'Укажите имя')
    .regex(/^[\p{L}\s'.-]+$/u, 'Имя может содержать только буквы, пробел и дефис'),
  phone: z
    .string()
    .trim()
    .min(1, 'Укажите телефон')
    .transform((value, ctx) => {
      const normalized = normalizeRuPhone(value)
      if (!normalized) {
        ctx.addIssue({ code: 'custom', message: 'Укажите российский номер, например +7 900 000-00-00' })
        return z.NEVER
      }
      return normalized
    }),
  city: trimmed(80).min(2, 'Укажите город'),
  productInterest: trimmed(200).min(2, 'Укажите товар или категорию'),
  productId: z.string().trim().max(64).optional(),
  estimatedPrice: z.preprocess(
    parseRubles,
    z
      .number({ error: 'Укажите сумму числом' })
      .int('Укажите сумму в рублях без копеек')
      .min(installmentTerms.minPrice, `Не меньше ${installmentTerms.minPrice.toLocaleString('ru-RU')} ₽`)
      .max(installmentTerms.maxPrice, `Не больше ${installmentTerms.maxPrice.toLocaleString('ru-RU')} ₽`)
      .optional(),
  ),
  contactMethod: z.enum(CONTACT_METHODS, { error: 'Выберите удобный способ связи' }),
  comment: trimmed(1000).optional().default(''),
  consent: z.literal(true, { error: 'Нужно согласие на обработку персональных данных' }),
})

export type LeadInput = z.input<typeof leadSchema>
export type LeadData = z.output<typeof leadSchema>

export type FieldErrors = Partial<Record<string, string>>

/** Преобразует FormData формы заявки в объект для схемы. */
export function leadFormDataToObject(formData: FormData): Record<string, unknown> {
  const get = (key: string) => {
    const value = formData.get(key)
    return typeof value === 'string' ? value : undefined
  }
  return {
    name: get('name') ?? '',
    phone: get('phone') ?? '',
    city: get('city') ?? '',
    productInterest: get('productInterest') ?? '',
    productId: get('productId') || undefined,
    estimatedPrice: get('estimatedPrice'),
    contactMethod: get('contactMethod'),
    comment: get('comment') ?? '',
    consent: formData.get('consent') === 'on' || formData.get('consent') === 'true',
  }
}

export function validateLead(
  raw: Record<string, unknown>,
): { ok: true; data: LeadData } | { ok: false; errors: FieldErrors } {
  const result = leadSchema.safeParse(raw)
  if (result.success) return { ok: true, data: result.data }
  const errors: FieldErrors = {}
  for (const issue of result.error.issues) {
    const key = String(issue.path[0] ?? 'form')
    if (!errors[key]) errors[key] = issue.message
  }
  return { ok: false, errors }
}

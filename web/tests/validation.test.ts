import { describe, expect, it } from 'vitest'

import { leadFormDataToObject, normalizeRuPhone, validateLead } from '@/lib/validation'

const valid = {
  name: 'Ахмед',
  phone: '8 (928) 000-00-00',
  city: 'Грозный',
  productInterest: 'Холодильник',
  estimatedPrice: '45 000',
  contactMethod: 'whatsapp',
  comment: '',
  consent: true,
}

describe('normalizeRuPhone', () => {
  it.each([
    ['+7 (928) 123-45-67', '+79281234567'],
    ['89281234567', '+79281234567'],
    ['9281234567', '+79281234567'],
    ['7 495 123 45 67', '+74951234567'],
  ])('%s → %s', (input, expected) => {
    expect(normalizeRuPhone(input)).toBe(expected)
  })

  it.each(['123', '+1 202 555 0100', '8 (128) 123-45-67', '', '++++'])('отклоняет %s', (input) => {
    expect(normalizeRuPhone(input)).toBeNull()
  })
})

describe('validateLead', () => {
  it('принимает корректную заявку и нормализует данные', () => {
    const r = validateLead(valid)
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.data.phone).toBe('+79280000000')
      expect(r.data.estimatedPrice).toBe(45_000)
      expect(r.data.consent).toBe(true)
    }
  })

  it('стоимость необязательна', () => {
    const r = validateLead({ ...valid, estimatedPrice: '' })
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.data.estimatedPrice).toBeUndefined()
  })

  it('требует согласие на обработку персональных данных', () => {
    const r = validateLead({ ...valid, consent: false })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.errors.consent).toMatch(/согласие/)
  })

  it('возвращает понятные ошибки по каждому полю', () => {
    const r = validateLead({
      name: '',
      phone: '123',
      city: '',
      productInterest: '',
      estimatedPrice: 'abc',
      contactMethod: 'fax',
      consent: false,
    })
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(Object.keys(r.errors).sort()).toEqual(
        ['city', 'consent', 'contactMethod', 'estimatedPrice', 'name', 'phone', 'productInterest'].sort(),
      )
      expect(r.errors.phone).toMatch(/российский номер/)
    }
  })

  it('отклоняет слишком длинный комментарий и HTML в имени', () => {
    const r = validateLead({ ...valid, name: '<script>', comment: 'x'.repeat(1001) })
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.errors.name).toBeDefined()
      expect(r.errors.comment).toBeDefined()
    }
  })

  it('разбирает FormData, включая чекбокс согласия', () => {
    const fd = new FormData()
    for (const [k, v] of Object.entries({ ...valid, consent: 'on' })) fd.set(k, String(v))
    const r = validateLead(leadFormDataToObject(fd))
    expect(r.ok).toBe(true)
  })
})

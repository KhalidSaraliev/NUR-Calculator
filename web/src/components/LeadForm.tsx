'use client'

import Link from 'next/link'
import { useActionState, useEffect, useRef, useState } from 'react'

import { submitLead } from '@/app/(site)/apply/actions'
import { CheckIcon } from '@/components/icons'
import { WhatsAppButton } from '@/components/WhatsAppButton'
import { initialLeadFormState } from '@/lib/lead-form-state'
import { CONTACT_METHODS, contactMethodLabels } from '@/lib/types'
import { leadFormDataToObject, validateLead, type FieldErrors } from '@/lib/validation'

export interface LeadFormDefaults {
  productInterest?: string
  productId?: string
  estimatedPrice?: number
  comment?: string
}

const fieldOrder = ['name', 'phone', 'city', 'productInterest', 'estimatedPrice', 'contactMethod', 'comment', 'consent']

function focusFirstError(form: HTMLFormElement | null, errs: FieldErrors) {
  const first = fieldOrder.find((f) => errs[f])
  if (!first) return
  form?.querySelector<HTMLElement>(`[name="${first}"]`)?.focus()
}

export function LeadForm({ defaults = {} }: { defaults?: LeadFormDefaults }) {
  const [state, formAction, pending] = useActionState(submitLead, initialLeadFormState)
  const [clientErrors, setClientErrors] = useState<FieldErrors | null>(null)
  const formRef = useRef<HTMLFormElement>(null)
  const successRef = useRef<HTMLDivElement>(null)

  const errors = clientErrors ?? state.errors ?? {}
  const values = state.values ?? {}

  // После ответа сервера переносим фокус на первое поле с ошибкой или на сообщение об успехе.
  useEffect(() => {
    if (state.status === 'success') successRef.current?.focus()
    if (state.status === 'error' && state.errors) focusFirstError(formRef.current, state.errors)
  }, [state])

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    const result = validateLead(leadFormDataToObject(new FormData(event.currentTarget)))
    if (!result.ok) {
      event.preventDefault()
      setClientErrors(result.errors)
      focusFirstError(event.currentTarget, result.errors)
    } else {
      setClientErrors(null)
    }
  }

  if (state.status === 'success') {
    return (
      <div className="card success-panel" ref={successRef} tabIndex={-1} role="status">
        <div className="card__icon">
          <CheckIcon size={26} />
        </div>
        <h2>Заявка отправлена</h2>
        <p>
          Спасибо! Номер заявки: <strong>{state.leadNumber}</strong>. Менеджер свяжется с вами удобным
          способом, чтобы уточнить товар и условия. Это ни к чему вас не обязывает.
        </p>
        <div className="btn-row" style={{ justifyContent: 'center' }}>
          <Link href="/catalog" className="btn btn--secondary">
            Вернуться в каталог
          </Link>
          <WhatsAppButton label="Написать в WhatsApp" />
        </div>
      </div>
    )
  }

  const err = (name: string) =>
    errors[name] ? (
      <span id={`${name}-error`} className="field__error">
        {errors[name]}
      </span>
    ) : null
  const describedBy = (name: string, hint?: boolean) =>
    [errors[name] ? `${name}-error` : null, hint ? `${name}-hint` : null].filter(Boolean).join(' ') || undefined

  return (
    <form
      key={state.attempt}
      ref={formRef}
      action={formAction}
      onSubmit={onSubmit}
      noValidate
      className="card"
      aria-describedby="lead-form-note"
    >
      {state.status === 'error' && state.message && (
        <div className="alert alert--danger" role="alert">
          <p>{state.message}</p>
        </div>
      )}

      <p id="lead-form-note" className="small muted">
        Поля со звёздочкой <span className="required">*</span> обязательны.
      </p>

      <div className="form-row">
        <div className="field">
          <label htmlFor="name">
            Имя <span className="required" aria-hidden="true">*</span>
          </label>
          <input
            id="name"
            name="name"
            className="input"
            autoComplete="given-name"
            required
            maxLength={80}
            defaultValue={values.name}
            aria-invalid={Boolean(errors.name)}
            aria-describedby={describedBy('name')}
          />
          {err('name')}
        </div>
        <div className="field">
          <label htmlFor="phone">
            Телефон <span className="required" aria-hidden="true">*</span>
          </label>
          <input
            id="phone"
            name="phone"
            type="tel"
            className="input"
            autoComplete="tel"
            inputMode="tel"
            placeholder="+7 900 000-00-00"
            required
            maxLength={20}
            defaultValue={values.phone}
            aria-invalid={Boolean(errors.phone)}
            aria-describedby={describedBy('phone')}
          />
          {err('phone')}
        </div>
      </div>

      <div className="form-row">
        <div className="field">
          <label htmlFor="city">
            Город <span className="required" aria-hidden="true">*</span>
          </label>
          <input
            id="city"
            name="city"
            className="input"
            autoComplete="address-level2"
            required
            maxLength={80}
            defaultValue={values.city}
            aria-invalid={Boolean(errors.city)}
            aria-describedby={describedBy('city')}
          />
          {err('city')}
        </div>
        <div className="field">
          <label htmlFor="estimatedPrice">Ориентировочная стоимость, ₽</label>
          <input
            id="estimatedPrice"
            name="estimatedPrice"
            className="input"
            inputMode="numeric"
            maxLength={12}
            defaultValue={values.estimatedPrice ?? (defaults.estimatedPrice ? String(defaults.estimatedPrice) : '')}
            aria-invalid={Boolean(errors.estimatedPrice)}
            aria-describedby={describedBy('estimatedPrice', true)}
          />
          <span id="estimatedPrice-hint" className="field__hint">
            Можно не указывать
          </span>
          {err('estimatedPrice')}
        </div>
      </div>

      <div className="field">
        <label htmlFor="productInterest">
          Какой товар или категория вас интересует <span className="required" aria-hidden="true">*</span>
        </label>
        <input
          id="productInterest"
          name="productInterest"
          className="input"
          required
          maxLength={200}
          placeholder="Например: холодильник, диван, смартфон"
          defaultValue={values.productInterest ?? defaults.productInterest}
          aria-invalid={Boolean(errors.productInterest)}
          aria-describedby={describedBy('productInterest')}
        />
        {err('productInterest')}
        <input type="hidden" name="productId" value={values.productId ?? defaults.productId ?? ''} />
      </div>

      <fieldset className="field" style={{ border: 0, padding: 0, margin: '0 0 18px' }} aria-describedby={describedBy('contactMethod')}>
        <legend className="label" style={{ fontWeight: 650, marginBottom: 6 }}>
          Удобный способ связи <span className="required" aria-hidden="true">*</span>
        </legend>
        <div className="radio-group">
          {CONTACT_METHODS.map((method) => (
            <label key={method} className="radio-card">
              <input
                type="radio"
                name="contactMethod"
                value={method}
                defaultChecked={(values.contactMethod ?? 'whatsapp') === method}
              />
              <span>{contactMethodLabels[method]}</span>
            </label>
          ))}
        </div>
        {err('contactMethod')}
      </fieldset>

      <div className="field">
        <label htmlFor="comment">Комментарий</label>
        <textarea
          id="comment"
          name="comment"
          className="textarea"
          maxLength={1000}
          placeholder="Модель, цвет, желаемый срок оплаты, удобное время для звонка"
          defaultValue={values.comment ?? defaults.comment}
          aria-invalid={Boolean(errors.comment)}
          aria-describedby={describedBy('comment')}
        />
        {err('comment')}
      </div>

      {/* Ловушка для ботов — скрыта от людей и программ чтения экрана. */}
      <div aria-hidden="true" style={{ position: 'absolute', left: '-10000px', width: 1, height: 1, overflow: 'hidden' }}>
        <label htmlFor="website">Не заполняйте это поле</label>
        <input id="website" name="website" tabIndex={-1} autoComplete="off" />
      </div>

      <div className="field">
        <div className="checkbox">
          <input
            id="consent"
            name="consent"
            type="checkbox"
            required
            aria-invalid={Boolean(errors.consent)}
            aria-describedby={describedBy('consent')}
          />
          <label htmlFor="consent">
            Я согласен(на) на обработку персональных данных в соответствии с{' '}
            <Link href="/privacy" target="_blank">
              политикой обработки персональных данных
            </Link>{' '}
            <span className="required" aria-hidden="true">*</span>
          </label>
        </div>
        {err('consent')}
      </div>

      <div className="btn-row">
        <button type="submit" className="btn btn--primary" disabled={pending} aria-disabled={pending}>
          {pending ? 'Отправляем…' : 'Отправить заявку'}
        </button>
        <WhatsAppButton label="Или написать в WhatsApp" />
      </div>
      <p className="small muted" style={{ marginTop: 14 }}>
        Заявка ни к чему не обязывает. Окончательные условия вы увидите в договоре до его подписания.
      </p>
    </form>
  )
}

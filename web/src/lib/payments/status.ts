import type { PaymentStatus } from '@/lib/types'

/** Статусы T-Bank → внутренние статусы. Неизвестные статусы считаются промежуточными. */
export function mapTbankStatus(status: string | undefined): PaymentStatus {
  switch (status) {
    case 'NEW':
      return 'created'
    case 'FORM_SHOWED':
    case 'AUTHORIZING':
    case '3DS_CHECKING':
    case '3DS_CHECKED':
    case 'CONFIRMING':
    case 'REVERSING':
    case 'REFUNDING':
      return 'pending'
    case 'AUTHORIZED':
      return 'authorized'
    case 'CONFIRMED':
      return 'confirmed'
    case 'REJECTED':
    case 'AUTH_FAIL':
      return 'rejected'
    case 'CANCELED':
    case 'DEADLINE_EXPIRED':
    case 'REVERSED':
      return 'canceled'
    case 'REFUNDED':
    case 'PARTIAL_REFUNDED':
      return 'refunded'
    default:
      return 'pending'
  }
}

const allowed: Record<PaymentStatus, PaymentStatus[]> = {
  created: ['pending', 'authorized', 'confirmed', 'rejected', 'canceled', 'error'],
  pending: ['authorized', 'confirmed', 'rejected', 'canceled', 'error'],
  authorized: ['confirmed', 'canceled', 'rejected', 'error'],
  confirmed: ['refunded'],
  rejected: [],
  canceled: [],
  refunded: [],
  error: ['pending', 'authorized', 'confirmed', 'rejected', 'canceled'],
}

/**
 * Можно ли перейти из одного статуса в другой. Уведомления могут прийти
 * не по порядку — запоздавшее «ожидает оплаты» не должно откатить
 * подтверждённый платёж.
 */
export function canTransition(from: PaymentStatus, to: PaymentStatus): boolean {
  return from === to || allowed[from].includes(to)
}

export const ACTIVE_PAYMENT_STATUSES: PaymentStatus[] = ['created', 'pending', 'authorized']

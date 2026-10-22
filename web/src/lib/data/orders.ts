import 'server-only'

import { randomUUID } from 'node:crypto'

import { calculateInstallment, type DownPaymentInput } from '@/lib/calculator'
import { mutateDb, readDb } from '@/lib/db/store'
import type { Order, OrderStatus, Payment } from '@/lib/types'

export interface CreateOrderInput {
  leadId?: string
  customerName: string
  customerPhone: string
  productName: string
  price: number
  salePrice?: number
  termMonths: number
  downPayment: DownPaymentInput
  startDate: Date
}

export async function createOrder(input: CreateOrderInput, createdBy: string): Promise<Order> {
  const calc = calculateInstallment({
    price: input.price,
    termMonths: input.termMonths,
    downPayment: input.downPayment,
    salePriceOverride: input.salePrice,
    startDate: input.startDate,
  })
  return mutateDb((db) => {
    db.counters.order += 1
    const year = input.startDate.getFullYear()
    const order: Order = {
      id: randomUUID(),
      number: `NUR-${year}-${String(db.counters.order).padStart(4, '0')}`,
      leadId: input.leadId,
      customerName: input.customerName,
      customerPhone: input.customerPhone,
      productName: input.productName,
      price: calc.price,
      salePrice: calc.salePrice,
      downPayment: calc.downPayment,
      termMonths: calc.termMonths,
      schedule: calc.schedule,
      status: 'draft',
      createdAt: new Date().toISOString(),
      createdBy,
    }
    db.orders.push(order)
    return order
  })
}

export async function listOrders(): Promise<Order[]> {
  const db = await readDb()
  return [...db.orders].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export async function getOrder(id: string): Promise<Order | undefined> {
  return (await readDb()).orders.find((o) => o.id === id)
}

export async function setOrderStatus(id: string, status: OrderStatus) {
  await mutateDb((db) => {
    const order = db.orders.find((o) => o.id === id)
    if (!order) throw new Error('Сделка не найдена')
    order.status = status
  })
}

export type InstallmentPaymentState = 'paid' | 'in_progress' | 'unpaid'

/**
 * Статус платежа по графику определяется только по платежам,
 * подтверждённым сервером на основании данных банка.
 */
export function installmentState(payments: Payment[], orderId: string, number: number): InstallmentPaymentState {
  const related = payments.filter((p) => p.orderId === orderId && p.installmentNumber === number)
  if (related.some((p) => p.status === 'confirmed')) return 'paid'
  if (related.some((p) => p.status === 'pending' || p.status === 'created' || p.status === 'authorized')) {
    return 'in_progress'
  }
  return 'unpaid'
}

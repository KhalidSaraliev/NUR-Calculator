'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'

import { requireAdminAction } from '@/lib/auth/session'
import {
  deleteCategory,
  deleteProduct,
  saveCategory,
  saveProduct,
  saveSettings,
  type ProductInput,
} from '@/lib/data/catalog'
import { updateLeadStatus } from '@/lib/data/leads'
import { createOrder, setOrderStatus } from '@/lib/data/orders'
import { createInstallmentPayment, refreshPaymentStatus } from '@/lib/payments/service'
import { LEAD_STATUSES, ORDER_STATUSES } from '@/lib/types'
import { normalizeRuPhone } from '@/lib/validation'

/**
 * Серверные действия админ-панели. В каждом действии права проверяются
 * заново (requireAdminAction): скрытая кнопка в интерфейсе — не защита.
 * Результат сообщается через параметр адреса ?ok= / ?error=.
 */

function back(path: string, params: { ok?: string; error?: string }): never {
  const qs = new URLSearchParams()
  if (params.ok) qs.set('ok', params.ok)
  if (params.error) qs.set('error', params.error.slice(0, 300))
  redirect(`${path}${qs.size ? `?${qs}` : ''}`)
}

function errorMessage(error: unknown): string {
  if (error instanceof z.ZodError) return error.issues.map((i) => i.message).join('; ')
  return error instanceof Error ? error.message : 'Неизвестная ошибка'
}

const slugSchema = z
  .string()
  .trim()
  .min(2, 'Адрес (slug) слишком короткий')
  .max(80)
  .regex(/^[a-z0-9-]+$/, 'Адрес (slug): только латиница в нижнем регистре, цифры и дефис')

const rub = (label: string) =>
  z.preprocess(
    (v) => (typeof v === 'string' ? Number(v.replace(/[\s ₽]/g, '')) : v),
    z.number({ error: `${label}: укажите число` }).int(`${label}: целое число рублей`).positive(`${label}: больше нуля`),
  )

// ---------- Заявки ----------

export async function changeLeadStatus(formData: FormData) {
  const user = await requireAdminAction('leads:update')
  const id = String(formData.get('id') ?? '')
  const path = `/admin/leads/${id}`
  const parsed = z
    .object({ status: z.enum(LEAD_STATUSES), note: z.string().trim().max(500).optional() })
    .safeParse({ status: formData.get('status'), note: formData.get('note') ?? undefined })
  if (!parsed.success) back(path, { error: 'Некорректный статус' })
  try {
    await updateLeadStatus(id, parsed.data.status, user.email, parsed.data.note)
  } catch (error) {
    back(path, { error: errorMessage(error) })
  }
  revalidatePath('/admin/leads')
  back(path, { ok: 'Статус обновлён' })
}

// ---------- Каталог ----------

const productSchema = z.object({
  name: z.string().trim().min(2, 'Укажите название').max(150),
  slug: slugSchema,
  categoryId: z.string().min(1, 'Выберите категорию'),
  price: rub('Стоимость'),
  salePrice: z.preprocess((v) => (v === '' ? undefined : v), rub('Цена продажи').optional()),
  description: z.string().trim().max(2000).default(''),
  specs: z.string().max(3000).default(''),
  image: z
    .string()
    .trim()
    .max(500)
    .refine((v) => v === '' || v.startsWith('/') || v.startsWith('https://'), 'Изображение: путь /... или https://...')
    .default(''),
  availability: z.enum(['in_stock', 'on_order']),
  visible: z.boolean(),
  sourceType: z.enum(['own', 'partner']),
  partnerName: z.string().trim().max(120).default(''),
  externalId: z.string().trim().max(120).default(''),
  externalUrl: z
    .string()
    .trim()
    .max(500)
    .refine((v) => v === '' || v.startsWith('https://'), 'Ссылка партнёра должна начинаться с https://')
    .default(''),
})

export async function saveProductAction(formData: FormData) {
  await requireAdminAction('catalog:write')
  const id = String(formData.get('id') ?? '') || null
  const path = `/admin/catalog/products/${id ?? 'new'}`
  const parsed = productSchema.safeParse({
    ...Object.fromEntries(formData),
    visible: formData.get('visible') === 'on',
  })
  if (!parsed.success) back(path, { error: errorMessage(parsed.error) })
  const d = parsed.data
  if (d.sourceType === 'partner' && !d.partnerName) back(path, { error: 'Укажите название партнёра' })

  const input: ProductInput = {
    name: d.name,
    slug: d.slug,
    categoryId: d.categoryId,
    price: d.price,
    salePrice: d.salePrice,
    description: d.description,
    specs: d.specs
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 20),
    image: d.image || undefined,
    availability: d.availability,
    visible: d.visible,
    source:
      d.sourceType === 'partner'
        ? {
            type: 'partner',
            partnerName: d.partnerName,
            externalId: d.externalId || undefined,
            externalUrl: d.externalUrl || undefined,
          }
        : { type: 'own' },
  }
  let saved
  try {
    saved = await saveProduct(id, input)
  } catch (error) {
    back(path, { error: errorMessage(error) })
  }
  revalidatePath('/catalog')
  back(`/admin/catalog/products/${saved.id}`, { ok: 'Товар сохранён' })
}

export async function deleteProductAction(formData: FormData) {
  await requireAdminAction('catalog:write')
  await deleteProduct(String(formData.get('id') ?? ''))
  revalidatePath('/catalog')
  back('/admin/catalog', { ok: 'Товар удалён' })
}

const categorySchema = z.object({
  name: z.string().trim().min(2, 'Укажите название').max(80),
  slug: slugSchema,
  description: z.string().trim().max(300).default(''),
  sortOrder: z.coerce.number().int().min(0).max(999),
  visible: z.boolean(),
})

export async function saveCategoryAction(formData: FormData) {
  await requireAdminAction('catalog:write')
  const id = String(formData.get('id') ?? '') || null
  const parsed = categorySchema.safeParse({ ...Object.fromEntries(formData), visible: formData.get('visible') === 'on' })
  if (!parsed.success) back('/admin/catalog/categories', { error: errorMessage(parsed.error) })
  try {
    await saveCategory(id, parsed.data)
  } catch (error) {
    back('/admin/catalog/categories', { error: errorMessage(error) })
  }
  revalidatePath('/catalog')
  back('/admin/catalog/categories', { ok: 'Категория сохранена' })
}

export async function deleteCategoryAction(formData: FormData) {
  await requireAdminAction('catalog:write')
  try {
    await deleteCategory(String(formData.get('id') ?? ''))
  } catch (error) {
    back('/admin/catalog/categories', { error: errorMessage(error) })
  }
  back('/admin/catalog/categories', { ok: 'Категория удалена' })
}

export async function saveSettingsAction(formData: FormData) {
  await requireAdminAction('settings:write')
  await saveSettings({
    showPrices: formData.get('showPrices') === 'on',
    catalogNotice: String(formData.get('catalogNotice') ?? '').trim().slice(0, 300),
  })
  revalidatePath('/catalog')
  back('/admin/settings', { ok: 'Настройки сохранены' })
}

// ---------- Сделки и платежи ----------

const orderSchema = z.object({
  leadId: z.string().max(64).optional(),
  customerName: z.string().trim().min(2, 'Укажите имя клиента').max(120),
  customerPhone: z.string().transform((v, ctx) => {
    const p = normalizeRuPhone(v)
    if (!p) {
      ctx.addIssue({ code: 'custom', message: 'Телефон клиента в формате +7…' })
      return z.NEVER
    }
    return p
  }),
  productName: z.string().trim().min(2, 'Укажите товар').max(200),
  price: rub('Стоимость товара'),
  salePrice: z.preprocess((v) => (v === '' ? undefined : v), rub('Цена продажи').optional()),
  termMonths: z.coerce.number().int(),
  downMode: z.enum(['amount', 'none']),
  downAmount: z.preprocess((v) => (v === '' ? undefined : v), rub('Взнос').optional()),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Укажите дату начала'),
})

export async function createOrderAction(formData: FormData) {
  const user = await requireAdminAction('orders:write')
  const parsed = orderSchema.safeParse({
    ...Object.fromEntries(formData),
    leadId: formData.get('leadId') || undefined,
  })
  const retry = `/admin/orders/new${formData.get('leadId') ? `?lead=${formData.get('leadId')}` : ''}`
  if (!parsed.success) back(retry, { error: errorMessage(parsed.error) })
  const d = parsed.data
  const [y, m, day] = d.startDate.split('-').map(Number)
  let order
  try {
    order = await createOrder(
      {
        leadId: d.leadId,
        customerName: d.customerName,
        customerPhone: d.customerPhone,
        productName: d.productName,
        price: d.price,
        salePrice: d.salePrice,
        termMonths: d.termMonths,
        downPayment: d.downMode === 'none' ? { mode: 'none' } : { mode: 'amount', amount: d.downAmount ?? 0 },
        startDate: new Date(y!, m! - 1, day!),
      },
      user.email,
    )
  } catch (error) {
    back(retry, { error: errorMessage(error) })
  }
  back(`/admin/orders/${order.id}`, { ok: `Сделка ${order.number} создана` })
}

export async function setOrderStatusAction(formData: FormData) {
  await requireAdminAction('orders:write')
  const id = String(formData.get('id') ?? '')
  const status = z.enum(ORDER_STATUSES).safeParse(formData.get('status'))
  if (!status.success) back(`/admin/orders/${id}`, { error: 'Некорректный статус' })
  await setOrderStatus(id, status.data)
  back(`/admin/orders/${id}`, { ok: 'Статус сделки обновлён' })
}

export async function createPaymentLinkAction(formData: FormData) {
  const user = await requireAdminAction('payments:create')
  const orderId = String(formData.get('orderId') ?? '')
  const number = Number(formData.get('installment'))
  const path = `/admin/orders/${orderId}`
  if (!Number.isInteger(number)) back(path, { error: 'Некорректный платёж' })
  try {
    await createInstallmentPayment(orderId, number, user.email)
  } catch (error) {
    back(path, { error: errorMessage(error) })
  }
  back(path, { ok: 'Ссылка на оплату готова — отправьте её клиенту' })
}

export async function refreshPaymentAction(formData: FormData) {
  await requireAdminAction('payments:read')
  const paymentId = String(formData.get('paymentId') ?? '')
  const orderId = String(formData.get('orderId') ?? '')
  try {
    await refreshPaymentStatus(paymentId)
  } catch (error) {
    back(`/admin/orders/${orderId}`, { error: errorMessage(error) })
  }
  back(`/admin/orders/${orderId}`, { ok: 'Статус запрошен у банка' })
}

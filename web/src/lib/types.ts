/**
 * Модель данных сайта. Хранилище для разработки — JSON-файл
 * (см. src/lib/db/store.ts); для production модель переносится в
 * PostgreSQL один к одному (таблица на каждую коллекцию).
 */

export interface Category {
  id: string
  slug: string
  name: string
  description: string
  sortOrder: number
  visible: boolean
}

export type ProductSource =
  | { type: 'own' }
  /** Товар партнёрского магазина. externalId — артикул у партнёра, для будущей синхронизации. */
  | { type: 'partner'; partnerName: string; externalId?: string; externalUrl?: string }

export interface Product {
  id: string
  slug: string
  name: string
  categoryId: string
  /** Стоимость товара, ₽. */
  price: number
  /** Согласованная цена продажи, если отличается от расчётной по таблице наценок, ₽. */
  salePrice?: number
  description: string
  specs: string[]
  /** Путь к изображению в /public или https-адрес. */
  image?: string
  availability: 'in_stock' | 'on_order'
  visible: boolean
  /** Демонстрационный товар из стартового набора — показывается с пометкой. */
  demo?: boolean
  source: ProductSource
  updatedAt: string
}

export const LEAD_STATUSES = ['new', 'in_progress', 'approved', 'rejected', 'closed'] as const
export type LeadStatus = (typeof LEAD_STATUSES)[number]

export const leadStatusLabels: Record<LeadStatus, string> = {
  new: 'Новая',
  in_progress: 'В работе',
  approved: 'Согласована',
  rejected: 'Отказ',
  closed: 'Закрыта',
}

export const CONTACT_METHODS = ['phone', 'whatsapp'] as const
export type ContactMethod = (typeof CONTACT_METHODS)[number]
export const contactMethodLabels: Record<ContactMethod, string> = {
  phone: 'Звонок по телефону',
  whatsapp: 'WhatsApp',
}

export interface Lead {
  id: string
  createdAt: string
  name: string
  /** Телефон в формате +7XXXXXXXXXX. */
  phone: string
  city: string
  productInterest: string
  productId?: string
  estimatedPrice?: number
  contactMethod: ContactMethod
  comment: string
  consent: { given: true; at: string; policyVersion: string }
  source: 'site' | 'whatsapp' | 'partner' | 'manual'
  status: LeadStatus
  history: { at: string; status: LeadStatus; by?: string; note?: string }[]
}

export const ORDER_STATUSES = ['draft', 'active', 'completed', 'canceled'] as const
export type OrderStatus = (typeof ORDER_STATUSES)[number]
export const orderStatusLabels: Record<OrderStatus, string> = {
  draft: 'Черновик',
  active: 'Действует',
  completed: 'Оплачена полностью',
  canceled: 'Отменена',
}

export interface OrderInstallment {
  number: number
  dueDate: string
  amount: number
  kind: 'down' | 'regular'
}

/** Сделка: договор купли-продажи товара с графиком оплаты. */
export interface Order {
  id: string
  /** Человекочитаемый номер, например NUR-2026-0001. */
  number: string
  leadId?: string
  customerName: string
  customerPhone: string
  productName: string
  price: number
  salePrice: number
  downPayment: number
  termMonths: number
  schedule: OrderInstallment[]
  status: OrderStatus
  createdAt: string
  createdBy: string
}

export const PAYMENT_STATUSES = [
  'created',
  'pending',
  'authorized',
  'confirmed',
  'rejected',
  'canceled',
  'refunded',
  'error',
] as const
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number]

export const paymentStatusLabels: Record<PaymentStatus, string> = {
  created: 'Создан',
  pending: 'Ожидает оплаты',
  authorized: 'Средства заблокированы банком',
  confirmed: 'Оплачен (подтверждено банком)',
  rejected: 'Отклонён',
  canceled: 'Отменён',
  refunded: 'Возвращён',
  error: 'Ошибка',
}

export interface PaymentEvent {
  at: string
  source: 'init' | 'notification' | 'get_state' | 'admin'
  providerStatus?: string
  status: PaymentStatus
  note?: string
}

export interface Payment {
  id: string
  orderId: string
  /** Номер платежа по графику (0 — первоначальный взнос). */
  installmentNumber: number
  /** Сумма в копейках — так её принимает банк. */
  amountKopecks: number
  provider: 'tbank'
  status: PaymentStatus
  providerPaymentId?: string
  paymentUrl?: string
  /** Ключ идемпотентности: одна попытка оплаты одного платежа графика. */
  idempotencyKey: string
  /** Обработанные уведомления банка (для защиты от повторов). */
  processedNotifications: string[]
  events: PaymentEvent[]
  createdAt: string
  updatedAt: string
  createdBy: string
}

export const ADMIN_ROLES = ['admin', 'manager'] as const
export type AdminRole = (typeof ADMIN_ROLES)[number]
export const adminRoleLabels: Record<AdminRole, string> = {
  admin: 'Администратор',
  manager: 'Менеджер',
}

export interface AdminUser {
  id: string
  email: string
  name: string
  role: AdminRole
  /** Хеш scrypt, пароль в открытом виде нигде не хранится. */
  passwordHash: string
  /** Увеличивается при смене пароля — старые сессии перестают действовать. */
  sessionVersion: number
  disabled: boolean
  createdAt: string
}

export interface SiteSettings {
  /** Показывать цены в каталоге. */
  showPrices: boolean
  /** Короткое объявление над каталогом (необязательно). */
  catalogNotice: string
}

export interface Database {
  version: 1
  categories: Category[]
  products: Product[]
  leads: Lead[]
  orders: Order[]
  payments: Payment[]
  users: AdminUser[]
  settings: SiteSettings
  counters: { order: number }
}

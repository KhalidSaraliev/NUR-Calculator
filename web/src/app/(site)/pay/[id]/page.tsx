import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { connection } from 'next/server'

import { WhatsAppButton } from '@/components/WhatsAppButton'
import { formatRub } from '@/lib/calculator'
import { readDb } from '@/lib/db/store'
import { ACTIVE_PAYMENT_STATUSES } from '@/lib/payments/status'

export const metadata: Metadata = {
  title: 'Статус оплаты',
  robots: { index: false, follow: false },
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Страница платежа. Сюда же банк возвращает клиента после оплаты.
 * Статус берётся только из нашей базы, куда он попадает из подписанного
 * уведомления банка, — параметры адреса и сам факт возврата ничего не меняют.
 */
export default async function PaymentPage({ params }: PageProps<'/pay/[id]'>) {
  await connection()
  const { id } = await params
  if (!UUID.test(id)) notFound()
  const db = await readDb()
  const payment = db.payments.find((p) => p.id === id)
  const order = payment && db.orders.find((o) => o.id === payment.orderId)
  if (!payment || !order) notFound()

  const amount = formatRub(payment.amountKopecks / 100)
  const purpose =
    payment.installmentNumber === 0
      ? 'первоначальный взнос'
      : `платёж ${payment.installmentNumber} из ${order.termMonths}`
  const isActive = ACTIVE_PAYMENT_STATUSES.includes(payment.status)

  return (
    <div className="container" style={{ padding: '48px 20px 72px', maxWidth: 680 }}>
      <h1 style={{ fontSize: '1.9rem' }}>Оплата по договору {order.number}</h1>
      <div className="card">
        <dl className="result__rows">
          <div>
            <dt>Назначение</dt>
            <dd style={{ whiteSpace: 'normal' }}>
              {order.productName}: {purpose}
            </dd>
          </div>
          <div className="is-total">
            <dt>Сумма</dt>
            <dd>{amount}</dd>
          </div>
        </dl>

        <div style={{ marginTop: 16 }} aria-live="polite">
          {payment.status === 'confirmed' && (
            <div className="alert alert--success" role="status">
              <p>
                <strong>Оплата получена.</strong> Банк подтвердил платёж. Спасибо!
              </p>
            </div>
          )}
          {isActive && (
            <div className="alert alert--info" role="status">
              <p>
                Ожидаем подтверждения от банка. Если вы уже оплатили, обновите страницу через минуту — статус
                изменится после того, как банк пришлёт подтверждение. Повторно оплачивать не нужно.
              </p>
            </div>
          )}
          {(payment.status === 'rejected' || payment.status === 'canceled' || payment.status === 'error') && (
            <div className="alert alert--warning" role="status">
              <p>Платёж не прошёл или ссылка устарела. Деньги не списаны. Свяжитесь с нами — пришлём новую ссылку.</p>
            </div>
          )}
          {payment.status === 'refunded' && (
            <div className="alert alert--info" role="status">
              <p>Платёж возвращён.</p>
            </div>
          )}
        </div>

        {isActive && payment.paymentUrl && (
          <>
            <a href={payment.paymentUrl} className="btn btn--primary btn--block" rel="noopener noreferrer">
              Перейти к оплате на странице банка
            </a>
            <p className="small muted" style={{ marginTop: 10 }}>
              Данные карты вводятся только на защищённой странице банка. Сайт NUR Invest их не видит и не хранит.
            </p>
          </>
        )}
        <div className="btn-row" style={{ marginTop: 16 }}>
          <Link href={`/pay/${payment.id}`} className="btn btn--secondary btn--sm">
            Обновить статус
          </Link>
          <WhatsAppButton size="sm" label="Вопрос по оплате" text={`Здравствуйте! Вопрос по оплате договора ${order.number}.`} />
        </div>
      </div>
    </div>
  )
}

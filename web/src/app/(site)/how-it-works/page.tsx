import type { Metadata } from 'next'
import Link from 'next/link'

import { WhatsAppButton } from '@/components/WhatsAppButton'
import { installmentTerms, principlesDisclaimer } from '@/config/terms'

export const metadata: Metadata = {
  title: 'Как это работает',
  description:
    'Как устроена покупка товара с оплатой частями в NUR Invest: продажа товара по заранее известной цене, без процентов по займу и штрафов за просрочку.',
  alternates: { canonical: '/how-it-works' },
}

export default function HowItWorksPage() {
  return (
    <div className="container" style={{ paddingBottom: 72 }}>
      <header className="page-head">
        <h1>Как это работает</h1>
        <p>Простыми словами о том, чем покупка товара с оплатой частями отличается от кредита.</p>
      </header>
      <div className="prose">
        <h2>Мы продаём товар, а не даём деньги в долг</h2>
        <p>
          Когда вы выбираете товар, NUR Invest приобретает его и продаёт вам по цене продажи, которую мы
          согласуем до подписания договора. В цену входит наценка продавца — она известна заранее. Вы вносите
          первоначальный взнос, а остаток оплачиваете равными частями по графику.
        </p>
        <h2>Что фиксируется в договоре</h2>
        <ul>
          <li>Товар и его цена продажи — она не меняется весь срок оплаты.</li>
          <li>Первоначальный взнос — обычно от {installmentTerms.minDownPercent}% стоимости товара.</li>
          <li>Количество платежей, их размер и даты.</li>
          <li>Порядок досрочной оплаты, возврата товара и действий в сложных ситуациях.</li>
        </ul>
        <h2>Чего в сделке нет</h2>
        <ul>
          <li>Процентов за пользование деньгами: на остаток ничего не начисляется.</li>
          <li>Штрафов и пеней за просрочку платежа.</li>
        </ul>
        <h2>Если платёж задерживается</h2>
        <p>
          Жизнь бывает разной. Если вы понимаете, что не успеваете внести платёж, напишите или позвоните нам.
          Цена товара от этого не вырастет — вместе обсудим, как удобнее продолжить оплату.
        </p>
        <h2>О принципах сделки</h2>
        <p>{principlesDisclaimer}</p>
        <div className="btn-row" style={{ marginTop: 28 }}>
          <Link href="/calculator" className="btn btn--primary">
            Рассчитать условия
          </Link>
          <Link href="/catalog" className="btn btn--secondary">
            Выбрать товар
          </Link>
          <WhatsAppButton />
        </div>
      </div>
    </div>
  )
}

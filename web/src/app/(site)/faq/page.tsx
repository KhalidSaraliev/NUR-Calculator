import type { Metadata } from 'next'
import Link from 'next/link'

import { FaqJsonLd, FaqList } from '@/components/FaqList'
import { WhatsAppButton } from '@/components/WhatsAppButton'
import { faq } from '@/content/faq'

export const metadata: Metadata = {
  title: 'Частые вопросы',
  description: 'Ответы на частые вопросы о покупке товаров с оплатой частями в NUR Invest.',
  alternates: { canonical: '/faq' },
}

export default function FaqPage() {
  return (
    <div className="container" style={{ paddingBottom: 72 }}>
      <header className="page-head">
        <h1>Частые вопросы</h1>
        <p>Если вы не нашли ответ, напишите нам — объясним простыми словами.</p>
      </header>
      <FaqList items={faq} />
      <FaqJsonLd items={faq} />
      <div className="btn-row" style={{ marginTop: 32 }}>
        <WhatsAppButton />
        <Link href="/apply" className="btn btn--secondary">
          Оставить заявку
        </Link>
      </div>
    </div>
  )
}

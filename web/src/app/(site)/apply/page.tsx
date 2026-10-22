import type { Metadata } from 'next'
import { connection } from 'next/server'

import { LeadForm, type LeadFormDefaults } from '@/components/LeadForm'
import { installmentTerms } from '@/config/terms'
import { calculateInstallment, formatRub, pluralMonths } from '@/lib/calculator'
import { getPublicProduct } from '@/lib/data/catalog'

export const metadata: Metadata = {
  title: 'Оставить заявку',
  description: 'Оставьте заявку на покупку товара с оплатой частями — менеджер NUR Invest свяжется с вами и рассчитает условия.',
  alternates: { canonical: '/apply' },
}

function first(v: string | string[] | undefined): string {
  return (Array.isArray(v) ? v[0] : v) ?? ''
}

export default async function ApplyPage({ searchParams }: PageProps<'/apply'>) {
  await connection()
  const sp = await searchParams
  const defaults: LeadFormDefaults = {}

  const slug = first(sp.product).slice(0, 120)
  const found = slug ? await getPublicProduct(slug) : null
  if (found) {
    defaults.productInterest = found.product.name
    defaults.productId = found.product.id
    defaults.estimatedPrice = found.product.price
  }

  const price = Number(first(sp.price)) || found?.product.price
  const term = Number(first(sp.term))
  const down = first(sp.down)
  if (price && !defaults.estimatedPrice) defaults.estimatedPrice = Math.round(price)

  // Если пришли из калькулятора — подставляем выбранные условия в комментарий.
  if (price && installmentTerms.termOptions.includes(term)) {
    try {
      const r = calculateInstallment({
        price,
        termMonths: term,
        salePriceOverride: found?.product.salePrice,
        downPayment: down === '0' ? { mode: 'none' } : { mode: 'percent', percent: Number(down) || installmentTerms.defaultDownPercent },
      })
      defaults.comment = `Расчёт с сайта: срок ${pluralMonths(r.termMonths)}, взнос ${formatRub(r.downPayment)}, платёж ${formatRub(r.regularPayment)} в месяц, общая цена ${formatRub(r.total)}.`
    } catch {
      // Некорректные параметры из адреса просто игнорируем.
    }
  }

  return (
    <div className="container" style={{ paddingBottom: 72 }}>
      <header className="page-head">
        <h1>Оставить заявку</h1>
        <p>
          Расскажите, какой товар вам нужен. Менеджер свяжется с вами, уточнит детали и рассчитает условия. Заявка
          ни к чему не обязывает.
        </p>
      </header>
      <div className="two-col">
        <LeadForm defaults={defaults} />
        <aside className="card card--soft" aria-labelledby="next-title">
          <h2 id="next-title" style={{ fontSize: '1.15rem' }}>
            Что будет дальше
          </h2>
          <ol style={{ paddingLeft: '1.2em' }}>
            <li>Менеджер свяжется с вами удобным способом.</li>
            <li>Подберём товар и назовём цену продажи, взнос и график.</li>
            <li>Вы спокойно изучите договор и решите, подходит ли он вам.</li>
          </ol>
          <p className="small muted">
            Мы никогда не просим сообщить данные банковской карты, коды из SMS или пароли — ни по телефону, ни в
            мессенджерах.
          </p>
        </aside>
      </div>
    </div>
  )
}

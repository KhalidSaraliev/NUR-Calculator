import type { Metadata } from 'next'

import { Calculator } from '@/components/Calculator'
import { installmentTerms } from '@/config/terms'

export const metadata: Metadata = {
  title: 'Калькулятор оплаты частями',
  description:
    'Рассчитайте первоначальный взнос, ежемесячный платёж и общую цену сделки при покупке товара с оплатой частями в NUR Invest.',
  alternates: { canonical: '/calculator' },
}

export default function CalculatorPage() {
  return (
    <div className="container" style={{ paddingBottom: 72 }}>
      <header className="page-head">
        <h1>Калькулятор оплаты частями</h1>
        <p>
          Укажите стоимость товара, срок и первоначальный взнос (по умолчанию {installmentTerms.defaultDownPercent}
          %). Калькулятор покажет взнос, ежемесячный платёж, предварительный график и общую цену сделки.
        </p>
      </header>
      <Calculator />
      <section className="prose" style={{ marginTop: 48 }} aria-labelledby="how-calc">
        <h2 id="how-calc">Как считается цена</h2>
        <p>
          Цена продажи = стоимость товара + наценка продавца. Наценка зависит от срока оплаты и наличия
          первоначального взноса, известна заранее и входит в цену, указанную в договоре. После подписания цена
          не меняется: на остаток ничего не начисляется.
        </p>
        <p>
          Первоначальный взнос считается от стоимости товара. Остаток делится на равные ежемесячные платежи,
          округлённые до 10 ₽; последний платёж может быть немного меньше, чтобы сумма всех платежей была ровно
          равна цене продажи.
        </p>
      </section>
    </div>
  )
}

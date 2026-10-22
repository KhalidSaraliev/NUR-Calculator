import Link from 'next/link'
import { connection } from 'next/server'

import { Calculator } from '@/components/Calculator'
import { FaqList } from '@/components/FaqList'
import { CalendarIcon, CategoryIcon, CheckIcon, DocIcon, HeartIcon, ScaleIcon, ShieldIcon, TagIcon } from '@/components/icons'
import { WhatsAppButton } from '@/components/WhatsAppButton'
import { installmentTerms, principlesDisclaimer } from '@/config/terms'
import { faq } from '@/content/faq'
import { calculateInstallment, formatRub } from '@/lib/calculator'
import { getVisibleCategories } from '@/lib/data/catalog'

const example = calculateInstallment({
  price: 100_000,
  termMonths: 6,
  downPayment: { mode: 'percent', percent: installmentTerms.defaultDownPercent },
  startDate: new Date(2026, 0, 1),
})

export default async function HomePage() {
  await connection()
  const categories = await getVisibleCategories()

  return (
    <>
      <section className="hero" aria-labelledby="hero-title">
        <div className="container hero__grid">
          <div>
            <span className="eyebrow">Покупка товаров с оплатой частями</span>
            <h1 id="hero-title">Нужная вещь сейчас — понятная цена и спокойный график оплаты</h1>
            <p className="hero__lead">
              NUR Invest продаёт бытовую технику, мебель и электронику с оплатой частями. Цену товара вы
              знаете заранее, она фиксируется в договоре и не меняется.
            </p>
            <ul className="hero__points">
              {[
                'Без процентов по займу — это покупка товара, а не кредит',
                'Без штрафов и пеней за просрочку',
                `Первоначальный взнос обычно от ${installmentTerms.minDownPercent}%, срок — чаще 6–7 месяцев`,
              ].map((text) => (
                <li key={text}>
                  <span className="check">
                    <CheckIcon />
                  </span>
                  {text}
                </li>
              ))}
            </ul>
            <div className="btn-row">
              <Link href="/catalog" className="btn btn--primary">
                Выбрать товар
              </Link>
              <Link href="/calculator" className="btn btn--secondary">
                Рассчитать условия
              </Link>
              <WhatsAppButton />
            </div>
          </div>

          <aside className="hero__card" aria-labelledby="example-title">
            <h2 id="example-title">Пример расчёта</h2>
            <dl className="result__rows">
              <div>
                <dt>Стоимость товара</dt>
                <dd>{formatRub(example.price)}</dd>
              </div>
              <div>
                <dt>Первоначальный взнос {installmentTerms.defaultDownPercent}%</dt>
                <dd>{formatRub(example.downPayment)}</dd>
              </div>
              <div>
                <dt>Платёж в месяц × {example.paymentsCount}</dt>
                <dd>{formatRub(example.regularPayment)}</dd>
              </div>
              <div className="is-total">
                <dt>Общая цена сделки</dt>
                <dd>{formatRub(example.total)}</dd>
              </div>
            </dl>
            <p className="small muted" style={{ marginTop: 12 }}>
              Расчёт по текущей таблице наценок на 6 месяцев. Точные условия — в договоре.
            </p>
            <Link href="/apply" className="btn btn--primary btn--block">
              Оставить заявку
            </Link>
          </aside>
        </div>
      </section>

      <section className="section" aria-labelledby="how-title">
        <div className="container">
          <div className="section__head">
            <span className="eyebrow">Как это работает</span>
            <h2 id="how-title">Четыре понятных шага</h2>
            <p>Мы покупаем выбранный товар и продаём его вам по цене, о которой договорились заранее.</p>
          </div>
          <ol className="steps grid grid--4">
            <li className="card">
              <h3>Выберите товар</h3>
              <p>В каталоге, в партнёрском магазине или просто опишите, что нужно.</p>
            </li>
            <li className="card">
              <h3>Согласуйте условия</h3>
              <p>Менеджер назовёт цену продажи, взнос и график платежей — до подписания.</p>
            </li>
            <li className="card">
              <h3>Подпишите договор</h3>
              <p>Цена и график фиксируются в договоре купли-продажи и больше не меняются.</p>
            </li>
            <li className="card">
              <h3>Получите товар и платите по графику</h3>
              <p>Вносите равные платежи в удобные даты. Досрочная оплата возможна.</p>
            </li>
          </ol>
        </div>
      </section>

      <section className="section section--muted" aria-labelledby="benefits-title">
        <div className="container">
          <div className="section__head">
            <span className="eyebrow">Почему это прозрачно</span>
            <h2 id="benefits-title">Всё, что важно знать, — заранее</h2>
          </div>
          <div className="grid grid--3">
            <article className="card">
              <div className="card__icon">
                <TagIcon />
              </div>
              <h3>Фиксированная цена</h3>
              <p>Цена продажи известна до подписания договора и не растёт со временем.</p>
            </article>
            <article className="card">
              <div className="card__icon">
                <ScaleIcon />
              </div>
              <h3>Без процентов по займу</h3>
              <p>Мы не даём деньги в долг. Вы покупаете товар, а не берёте кредит.</p>
            </article>
            <article className="card">
              <div className="card__icon">
                <HeartIcon />
              </div>
              <h3>Без штрафов за просрочку</h3>
              <p>Если платёж задерживается, мы не начисляем пени, а помогаем найти решение.</p>
            </article>
            <article className="card">
              <div className="card__icon">
                <CalendarIcon />
              </div>
              <h3>Понятный график</h3>
              <p>Равные ежемесячные платежи и даты, которые вы видите ещё до сделки.</p>
            </article>
            <article className="card">
              <div className="card__icon">
                <DocIcon />
              </div>
              <h3>Всё в договоре</h3>
              <p>Цена, взнос, график и порядок действий в сложных ситуациях прописаны письменно.</p>
            </article>
            <article className="card">
              <div className="card__icon">
                <ShieldIcon />
              </div>
              <h3>Бережное общение</h3>
              <p>Объясняем условия простыми словами и не торопим с решением.</p>
            </article>
          </div>
        </div>
      </section>

      {categories.length > 0 && (
        <section className="section" aria-labelledby="categories-title">
          <div className="container">
            <div className="section__head">
              <span className="eyebrow">Каталог</span>
              <h2 id="categories-title">Популярные категории</h2>
            </div>
            <div className="grid grid--4">
              {categories.map((c) => (
                <Link key={c.id} href={`/catalog?category=${c.slug}`} className="card category-card">
                  <div className="card__icon">
                    <CategoryIcon slug={c.slug} />
                  </div>
                  <h3>{c.name}</h3>
                  <p>{c.description}</p>
                  <span className="category-card__more" aria-hidden="true">
                    Смотреть →
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="section section--muted" aria-labelledby="calc-title">
        <div className="container">
          <div className="section__head">
            <span className="eyebrow">Первоначальный взнос и график</span>
            <h2 id="calc-title">Рассчитайте условия</h2>
            <p>
              Первоначальный взнос — обычно от {installmentTerms.minDownPercent}% стоимости товара. Остаток
              цены продажи делится на равные ежемесячные платежи. Чем больше взнос, тем меньше платёж.
            </p>
          </div>
          <Calculator />
        </div>
      </section>

      <section className="section" aria-labelledby="faq-title">
        <div className="container">
          <div className="section__head">
            <span className="eyebrow">Вопросы и ответы</span>
            <h2 id="faq-title">Частые вопросы</h2>
          </div>
          <FaqList items={faq.slice(0, 6)} />
          <p style={{ marginTop: 20 }}>
            <Link href="/faq">Все вопросы и ответы →</Link>
          </p>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }} aria-labelledby="cta-title">
        <div className="container">
          <div className="cta">
            <div>
              <h2 id="cta-title">Расскажите, что вам нужно</h2>
              <p>Оставьте заявку или напишите в WhatsApp — подберём товар и рассчитаем условия. {principlesDisclaimer}</p>
            </div>
            <div className="btn-row">
              <Link href="/apply" className="btn btn--secondary">
                Оставить заявку
              </Link>
              <WhatsAppButton />
            </div>
          </div>
        </div>
      </section>
    </>
  )
}

import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { connection } from 'next/server'

import { Calculator } from '@/components/Calculator'
import { CheckIcon } from '@/components/icons'
import { ProductMedia } from '@/components/ProductMedia'
import { WhatsAppButton } from '@/components/WhatsAppButton'
import { installmentTerms } from '@/config/terms'
import { formatRub } from '@/lib/calculator'
import { getPublicProduct, getSettings } from '@/lib/data/catalog'

export async function generateMetadata({ params }: PageProps<'/catalog/[slug]'>): Promise<Metadata> {
  const { slug } = await params
  const found = await getPublicProduct(slug)
  if (!found) return { title: 'Товар не найден' }
  const { product } = found
  return {
    title: `${product.name} — купить с оплатой частями`,
    description: `${product.name}: ${product.description} Оплата частями без процентов по займу, цена фиксируется в договоре.`.slice(0, 300),
    alternates: { canonical: `/catalog/${product.slug}` },
    openGraph: { title: product.name, description: product.description, url: `/catalog/${product.slug}` },
  }
}

export default async function ProductPage({ params }: PageProps<'/catalog/[slug]'>) {
  await connection()
  const { slug } = await params
  const [found, settings] = await Promise.all([getPublicProduct(slug), getSettings()])
  if (!found) notFound()
  const { product, category } = found

  return (
    <div className="container" style={{ paddingBottom: 72 }}>
      <nav aria-label="Навигационная цепочка" className="breadcrumbs" style={{ paddingTop: 28 }}>
        <ol>
          <li>
            <Link href="/">Главная</Link>
          </li>
          <li>
            <Link href="/catalog">Каталог</Link>
          </li>
          <li>
            <Link href={`/catalog?category=${category.slug}`}>{category.name}</Link>
          </li>
          <li aria-current="page">{product.name}</li>
        </ol>
      </nav>

      <div className="product-page">
        <div className="product-page__media">
          <ProductMedia name={product.name} image={product.image} categorySlug={category.slug} sizes="(max-width: 900px) 100vw, 560px" priority />
        </div>
        <div>
          <div className="badges" style={{ marginBottom: 10 }}>
            {product.demo && <span className="badge badge--demo">Пример товара — цена условная</span>}
            <span className="badge">{product.availability === 'in_stock' ? 'В наличии' : 'Под заказ'}</span>
            {product.source.type === 'partner' && <span className="badge badge--info">Партнёр: {product.source.partnerName}</span>}
          </div>
          <h1 style={{ fontSize: 'clamp(1.7rem, 3.4vw, 2.4rem)' }}>{product.name}</h1>
          {settings.showPrices && (
            <p style={{ fontSize: '1.6rem', fontWeight: 800, marginBottom: 6 }}>{formatRub(product.price)}</p>
          )}
          <p className="muted">{product.description}</p>
          {product.specs.length > 0 && (
            <ul className="hero__points" style={{ margin: '16px 0 24px' }}>
              {product.specs.map((s) => (
                <li key={s}>
                  <span className="check">
                    <CheckIcon />
                  </span>
                  {s}
                </li>
              ))}
            </ul>
          )}
          <div className="card card--soft" style={{ marginBottom: 20 }}>
            <h2 style={{ fontSize: '1.1rem' }}>Условия покупки</h2>
            <ul style={{ paddingLeft: '1.2em', margin: 0 }}>
              <li>Первоначальный взнос — от {installmentTerms.minDownPercent}% стоимости товара.</li>
              <li>
                Срок оплаты — от {Math.min(...installmentTerms.termOptions)} до {Math.max(...installmentTerms.termOptions)} месяцев, равными платежами.
              </li>
              <li>Цена продажи фиксируется в договоре и не меняется.</li>
              <li>Без процентов по займу и без штрафов за просрочку.</li>
            </ul>
          </div>
          <div className="btn-row">
            <Link href={`/apply?product=${product.slug}`} className="btn btn--primary">
              Оформить заявку
            </Link>
            <WhatsAppButton text={`Здравствуйте! Интересует товар «${product.name}». Расскажите об условиях оплаты частями.`} />
          </div>
        </div>
      </div>

      {settings.showPrices && (
        <section id="calculator" className="section" style={{ paddingBottom: 0 }} aria-labelledby="calc-title">
          <h2 id="calc-title">Рассчитать условия для этого товара</h2>
          <Calculator
            initialPrice={product.price}
            fixedSalePrice={product.salePrice}
            productName={product.name}
            productSlug={product.slug}
          />
        </section>
      )}
    </div>
  )
}

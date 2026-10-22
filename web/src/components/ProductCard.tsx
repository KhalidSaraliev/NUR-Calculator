import Link from 'next/link'

import { ProductMedia } from '@/components/ProductMedia'
import { WhatsAppButton } from '@/components/WhatsAppButton'
import { installmentTerms } from '@/config/terms'
import { calculateInstallment, formatRub } from '@/lib/calculator'
import type { Category, Product } from '@/lib/types'

export function estimateMonthly(product: Product): number | null {
  try {
    return calculateInstallment({
      price: product.price,
      salePriceOverride: product.salePrice,
      termMonths: installmentTerms.defaultTerm,
      downPayment: { mode: 'percent', percent: installmentTerms.defaultDownPercent },
    }).regularPayment
  } catch {
    return null
  }
}

export function ProductCard({ product, category, showPrices }: { product: Product; category?: Category; showPrices: boolean }) {
  const monthly = showPrices ? estimateMonthly(product) : null
  return (
    <article className="product-card">
      <div className="product-card__media">
        <ProductMedia name={product.name} image={product.image} categorySlug={category?.slug ?? ''} sizes="(max-width: 620px) 100vw, 280px" />
        <div className="badges">
          {product.demo && <span className="badge badge--demo">Пример товара</span>}
          {product.source.type === 'partner' && <span className="badge badge--info">Партнёр: {product.source.partnerName}</span>}
        </div>
      </div>
      <div className="product-card__body">
        {category && <span className="small muted">{category.name}</span>}
        <h3 className="product-card__title">
          <Link href={`/catalog/${product.slug}`}>{product.name}</Link>
        </h3>
        {showPrices ? (
          <>
            <span className="product-card__price">{formatRub(product.price)}</span>
            {monthly && (
              <span className="product-card__monthly">
                от {formatRub(monthly)} в месяц · {installmentTerms.defaultTerm} мес., взнос {installmentTerms.defaultDownPercent}%
              </span>
            )}
          </>
        ) : (
          <span className="product-card__monthly">Цена — по запросу</span>
        )}
        <div className="product-card__actions">
          <Link href={`/catalog/${product.slug}#calculator`} className="btn btn--secondary btn--sm">
            Рассчитать
          </Link>
          <WhatsAppButton size="sm" label="WhatsApp" text={`Здравствуйте! Интересует товар «${product.name}». Расскажите об условиях оплаты частями.`} />
        </div>
      </div>
    </article>
  )
}

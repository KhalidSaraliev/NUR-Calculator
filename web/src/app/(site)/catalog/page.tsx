import type { Metadata } from 'next'
import Link from 'next/link'
import { connection } from 'next/server'

import { ProductCard } from '@/components/ProductCard'
import { WhatsAppButton } from '@/components/WhatsAppButton'
import { getSettings, getVisibleCategories, searchProducts, type CatalogFilter } from '@/lib/data/catalog'

export const metadata: Metadata = {
  title: 'Каталог товаров с оплатой частями',
  description:
    'Бытовая техника, мебель, смартфоны и электроника с оплатой частями. Цена фиксируется в договоре заранее, без процентов по займу.',
  alternates: { canonical: '/catalog' },
}

const sortOptions: { value: NonNullable<CatalogFilter['sort']>; label: string }[] = [
  { value: 'popular', label: 'По умолчанию' },
  { value: 'price_asc', label: 'Сначала дешевле' },
  { value: 'price_desc', label: 'Сначала дороже' },
  { value: 'name', label: 'По названию' },
]

function str(v: string | string[] | undefined): string {
  return (Array.isArray(v) ? v[0] : v)?.slice(0, 100) ?? ''
}
function num(v: string): number | undefined {
  const n = Number(v.replace(/\D/g, ''))
  return v && Number.isFinite(n) && n > 0 ? n : undefined
}

export default async function CatalogPage({ searchParams }: PageProps<'/catalog'>) {
  await connection()
  const sp = await searchParams
  const filter: CatalogFilter = {
    q: str(sp.q),
    category: str(sp.category) || undefined,
    minPrice: num(str(sp.min)),
    maxPrice: num(str(sp.max)),
    sort: sortOptions.some((o) => o.value === str(sp.sort)) ? (str(sp.sort) as CatalogFilter['sort']) : 'popular',
  }
  const [categories, products, settings] = await Promise.all([
    getVisibleCategories(),
    searchProducts(filter),
    getSettings(),
  ])
  const byId = new Map(categories.map((c) => [c.id, c]))
  const active = categories.find((c) => c.slug === filter.category)

  const hrefWith = (category?: string) => {
    const p = new URLSearchParams()
    if (category) p.set('category', category)
    if (filter.q) p.set('q', filter.q)
    return `/catalog${p.size ? `?${p}` : ''}`
  }

  return (
    <div className="container">
      <header className="page-head">
        <h1>{active ? active.name : 'Каталог товаров'}</h1>
        <p>
          {active?.description ??
            'Выберите товар и рассчитайте условия. Если нужного товара нет в списке — оставьте заявку, мы подберём его, в том числе в партнёрских магазинах.'}
        </p>
        {settings.catalogNotice && (
          <div className="alert alert--info" role="note">
            <p>{settings.catalogNotice}</p>
          </div>
        )}
      </header>

      <nav aria-label="Категории">
        <ul className="chip-list">
          <li>
            <Link href={hrefWith()} className="chip" aria-current={!active ? 'true' : undefined}>
              Все товары
            </Link>
          </li>
          {categories.map((c) => (
            <li key={c.id}>
              <Link href={hrefWith(c.slug)} className="chip" aria-current={active?.id === c.id ? 'true' : undefined}>
                {c.name}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <div className="catalog-layout" style={{ paddingBottom: 64 }}>
        <aside className="filters card" aria-labelledby="filters-title">
          <h2 id="filters-title" style={{ fontSize: '1.1rem' }}>
            Поиск и фильтры
          </h2>
          <form method="get" action="/catalog" role="search">
            {filter.category && <input type="hidden" name="category" value={filter.category} />}
            <div className="field">
              <label htmlFor="q">Название товара</label>
              <input id="q" name="q" type="search" className="input" defaultValue={filter.q} maxLength={100} />
            </div>
            <fieldset>
              <legend>Стоимость, ₽</legend>
              <div className="form-row">
                <div className="field">
                  <label htmlFor="min" className="visually-hidden">
                    От
                  </label>
                  <input id="min" name="min" className="input" inputMode="numeric" placeholder="от" defaultValue={filter.minPrice ?? ''} />
                </div>
                <div className="field">
                  <label htmlFor="max" className="visually-hidden">
                    До
                  </label>
                  <input id="max" name="max" className="input" inputMode="numeric" placeholder="до" defaultValue={filter.maxPrice ?? ''} />
                </div>
              </div>
            </fieldset>
            <div className="field">
              <label htmlFor="sort">Сортировка</label>
              <select id="sort" name="sort" className="select" defaultValue={filter.sort}>
                {sortOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="btn-row">
              <button type="submit" className="btn btn--primary btn--sm">
                Показать
              </button>
              <Link href={hrefWith(filter.category)} className="btn btn--ghost btn--sm">
                Сбросить
              </Link>
            </div>
          </form>
        </aside>

        <section aria-labelledby="results-title">
          <h2 id="results-title" className="visually-hidden">
            Товары
          </h2>
          <p className="muted small" role="status">
            Найдено товаров: {products.length}
          </p>
          {products.length === 0 ? (
            <div className="empty">
              <p>По вашему запросу ничего не нашлось. Мы можем подобрать товар под заказ.</p>
              <div className="btn-row" style={{ justifyContent: 'center' }}>
                <Link href="/apply" className="btn btn--primary">
                  Оставить заявку
                </Link>
                <WhatsAppButton />
              </div>
            </div>
          ) : (
            <div className="product-grid">
              {products.map((p) => (
                <ProductCard key={p.id} product={p} category={byId.get(p.categoryId)} showPrices={settings.showPrices} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

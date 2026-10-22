import type { Metadata } from 'next'
import Link from 'next/link'

import { Flash } from '@/components/admin/Flash'
import { requireAdminPage } from '@/lib/auth/session'
import { formatRub } from '@/lib/calculator'
import { getAllCategories, getAllProducts } from '@/lib/data/catalog'

export const metadata: Metadata = { title: 'Каталог' }

export default async function AdminCatalogPage({ searchParams }: PageProps<'/admin/catalog'>) {
  await requireAdminPage('catalog:write')
  const sp = await searchParams
  const [products, categories] = await Promise.all([getAllProducts(), getAllCategories()])
  const names = new Map(categories.map((c) => [c.id, c.name]))
  return (
    <>
      <div className="admin-toolbar" style={{ justifyContent: 'space-between' }}>
        <h1 style={{ margin: 0 }}>Товары</h1>
        <div className="btn-row">
          <Link href="/admin/catalog/categories" className="btn btn--secondary btn--sm">
            Категории
          </Link>
          <Link href="/admin/catalog/products/new" className="btn btn--primary btn--sm">
            Добавить товар
          </Link>
        </div>
      </div>
      <Flash ok={sp.ok} error={sp.error} />
      {products.some((p) => p.demo) && (
        <div className="alert alert--warning" role="note">
          <p>
            В каталоге есть демонстрационные товары с условными ценами. Замените их реальным ассортиментом или
            скройте перед запуском.
          </p>
        </div>
      )}
      <div className="table-wrap">
        <table className="table">
          <caption className="visually-hidden">Товары</caption>
          <thead>
            <tr>
              <th scope="col">Название</th>
              <th scope="col">Категория</th>
              <th scope="col" className="num">
                Стоимость
              </th>
              <th scope="col">Источник</th>
              <th scope="col">На сайте</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id}>
                <td>
                  <Link href={`/admin/catalog/products/${p.id}`}>{p.name}</Link>
                  {p.demo && <span className="badge badge--demo" style={{ marginLeft: 6 }}>демо</span>}
                </td>
                <td>{names.get(p.categoryId) ?? '—'}</td>
                <td className="num">{formatRub(p.price)}</td>
                <td>{p.source.type === 'partner' ? `Партнёр: ${p.source.partnerName}` : 'Собственный'}</td>
                <td>{p.visible ? 'Показан' : 'Скрыт'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

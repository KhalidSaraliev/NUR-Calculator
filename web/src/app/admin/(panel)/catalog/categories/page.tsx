import type { Metadata } from 'next'
import Link from 'next/link'

import { Flash } from '@/components/admin/Flash'
import { requireAdminPage } from '@/lib/auth/session'
import { getAllCategories } from '@/lib/data/catalog'
import type { Category } from '@/lib/types'

import { deleteCategoryAction, saveCategoryAction } from '../../actions'

export const metadata: Metadata = { title: 'Категории' }

function CategoryForm({ category }: { category?: Category }) {
  const p = category?.id ?? 'new'
  return (
    <form action={saveCategoryAction} className="card">
      {category && <input type="hidden" name="id" value={category.id} />}
      <div className="form-row">
        <div className="field">
          <label htmlFor={`${p}-name`}>Название</label>
          <input id={`${p}-name`} name="name" className="input" required defaultValue={category?.name} />
        </div>
        <div className="field">
          <label htmlFor={`${p}-slug`}>Адрес (slug)</label>
          <input id={`${p}-slug`} name="slug" className="input" required defaultValue={category?.slug} />
        </div>
      </div>
      <div className="field">
        <label htmlFor={`${p}-description`}>Описание</label>
        <input id={`${p}-description`} name="description" className="input" defaultValue={category?.description} />
      </div>
      <div className="form-row">
        <div className="field">
          <label htmlFor={`${p}-sort`}>Порядок</label>
          <input id={`${p}-sort`} name="sortOrder" type="number" min={0} max={999} className="input" defaultValue={category?.sortOrder ?? 10} />
        </div>
        <div className="field" style={{ justifyContent: 'flex-end' }}>
          <div className="checkbox">
            <input id={`${p}-visible`} name="visible" type="checkbox" defaultChecked={category?.visible ?? true} />
            <label htmlFor={`${p}-visible`}>Показывать на сайте</label>
          </div>
        </div>
      </div>
      <button type="submit" className="btn btn--primary btn--sm">
        {category ? 'Сохранить' : 'Добавить категорию'}
      </button>
    </form>
  )
}

export default async function CategoriesPage({ searchParams }: PageProps<'/admin/catalog/categories'>) {
  await requireAdminPage('catalog:write')
  const sp = await searchParams
  const categories = await getAllCategories()
  return (
    <>
      <p>
        <Link href="/admin/catalog">← Товары</Link>
      </p>
      <h1>Категории</h1>
      <Flash ok={sp.ok} error={sp.error} />
      <div className="stack" style={{ maxWidth: 820 }}>
        {categories.map((c) => (
          <div key={c.id}>
            <CategoryForm category={c} />
            <form action={deleteCategoryAction} style={{ marginTop: 8 }}>
              <input type="hidden" name="id" value={c.id} />
              <button type="submit" className="btn btn--danger btn--sm">
                Удалить «{c.name}»
              </button>
            </form>
          </div>
        ))}
        <h2 style={{ fontSize: '1.2rem', marginTop: 32 }}>Новая категория</h2>
        <CategoryForm />
      </div>
    </>
  )
}

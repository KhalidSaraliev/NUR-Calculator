import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { Flash } from '@/components/admin/Flash'
import { requireAdminPage } from '@/lib/auth/session'
import { getAllCategories, getProductById } from '@/lib/data/catalog'

import { deleteProductAction, saveProductAction } from '../../../actions'

export const metadata: Metadata = { title: 'Товар' }

export default async function ProductEditPage({ params, searchParams }: PageProps<'/admin/catalog/products/[id]'>) {
  await requireAdminPage('catalog:write')
  const { id } = await params
  const sp = await searchParams
  const isNew = id === 'new'
  const [product, categories] = await Promise.all([isNew ? undefined : getProductById(id), getAllCategories()])
  if (!isNew && !product) notFound()
  const partner = product?.source.type === 'partner' ? product.source : undefined

  return (
    <>
      <p>
        <Link href="/admin/catalog">← Товары</Link>
      </p>
      <h1>{isNew ? 'Новый товар' : product!.name}</h1>
      <Flash ok={sp.ok} error={sp.error} />
      <form action={saveProductAction} className="card" style={{ maxWidth: 820 }}>
        {!isNew && <input type="hidden" name="id" value={product!.id} />}
        <div className="form-row">
          <div className="field">
            <label htmlFor="name">Название</label>
            <input id="name" name="name" className="input" required defaultValue={product?.name} />
          </div>
          <div className="field">
            <label htmlFor="slug">Адрес страницы (slug)</label>
            <input id="slug" name="slug" className="input" required pattern="[a-z0-9\-]+" defaultValue={product?.slug} aria-describedby="slug-hint" />
            <span id="slug-hint" className="field__hint">
              Латиница, цифры, дефис: holodilnik-lg-200
            </span>
          </div>
        </div>
        <div className="form-row">
          <div className="field">
            <label htmlFor="categoryId">Категория</label>
            <select id="categoryId" name="categoryId" className="select" defaultValue={product?.categoryId}>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="availability">Наличие</label>
            <select id="availability" name="availability" className="select" defaultValue={product?.availability ?? 'on_order'}>
              <option value="in_stock">В наличии</option>
              <option value="on_order">Под заказ</option>
            </select>
          </div>
        </div>
        <div className="form-row">
          <div className="field">
            <label htmlFor="price">Стоимость товара, ₽</label>
            <input id="price" name="price" className="input" inputMode="numeric" required defaultValue={product?.price} />
          </div>
          <div className="field">
            <label htmlFor="salePrice">Фиксированная цена продажи, ₽</label>
            <input id="salePrice" name="salePrice" className="input" inputMode="numeric" defaultValue={product?.salePrice ?? ''} aria-describedby="sale-hint" />
            <span id="sale-hint" className="field__hint">
              Необязательно. Если пусто — калькулятор считает по таблице наценок.
            </span>
          </div>
        </div>
        <div className="field">
          <label htmlFor="description">Описание</label>
          <textarea id="description" name="description" className="textarea" defaultValue={product?.description} />
        </div>
        <div className="field">
          <label htmlFor="specs">Характеристики (по одной в строке)</label>
          <textarea id="specs" name="specs" className="textarea" defaultValue={product?.specs.join('\n')} />
        </div>
        <div className="field">
          <label htmlFor="image">Изображение</label>
          <input id="image" name="image" className="input" defaultValue={product?.image ?? ''} aria-describedby="image-hint" />
          <span id="image-hint" className="field__hint">
            Путь к файлу в папке public (например, /products/phone.png) или https-ссылка. Пусто — заглушка.
          </span>
        </div>
        <fieldset className="card card--soft" style={{ marginBottom: 18 }}>
          <legend style={{ fontWeight: 700 }}>Источник товара</legend>
          <div className="form-row">
            <div className="field">
              <label htmlFor="sourceType">Тип</label>
              <select id="sourceType" name="sourceType" className="select" defaultValue={product?.source.type ?? 'own'}>
                <option value="own">Собственный ассортимент</option>
                <option value="partner">Партнёрский магазин</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="partnerName">Партнёр</label>
              <input id="partnerName" name="partnerName" className="input" defaultValue={partner?.partnerName ?? ''} />
            </div>
          </div>
          <div className="form-row">
            <div className="field">
              <label htmlFor="externalId">Артикул у партнёра</label>
              <input id="externalId" name="externalId" className="input" defaultValue={partner?.externalId ?? ''} />
            </div>
            <div className="field">
              <label htmlFor="externalUrl">Ссылка на товар у партнёра</label>
              <input id="externalUrl" name="externalUrl" className="input" defaultValue={partner?.externalUrl ?? ''} />
            </div>
          </div>
        </fieldset>
        <div className="field">
          <div className="checkbox">
            <input id="visible" name="visible" type="checkbox" defaultChecked={product?.visible ?? true} />
            <label htmlFor="visible">Показывать на сайте</label>
          </div>
        </div>
        <button type="submit" className="btn btn--primary">
          Сохранить
        </button>
      </form>
      {!isNew && (
        <form action={deleteProductAction} style={{ marginTop: 16 }}>
          <input type="hidden" name="id" value={product!.id} />
          <button type="submit" className="btn btn--danger btn--sm">
            Удалить товар
          </button>
        </form>
      )}
    </>
  )
}

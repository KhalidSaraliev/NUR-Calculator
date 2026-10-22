import 'server-only'

import { randomUUID } from 'node:crypto'

import { mutateDb, readDb } from '@/lib/db/store'
import type { Category, Product, SiteSettings } from '@/lib/types'

export interface CatalogFilter {
  q?: string
  category?: string
  minPrice?: number
  maxPrice?: number
  sort?: 'popular' | 'price_asc' | 'price_desc' | 'name'
}

export async function getVisibleCategories(): Promise<Category[]> {
  const db = await readDb()
  return db.categories.filter((c) => c.visible).sort((a, b) => a.sortOrder - b.sortOrder)
}

export async function getAllCategories(): Promise<Category[]> {
  const db = await readDb()
  return [...db.categories].sort((a, b) => a.sortOrder - b.sortOrder)
}

export async function getSettings(): Promise<SiteSettings> {
  return (await readDb()).settings
}

/** Публичный каталог: только видимые товары видимых категорий. */
export async function searchProducts(filter: CatalogFilter = {}): Promise<Product[]> {
  const db = await readDb()
  const visibleCategoryIds = new Set(db.categories.filter((c) => c.visible).map((c) => c.id))
  const category = filter.category ? db.categories.find((c) => c.slug === filter.category) : undefined
  const q = filter.q?.trim().toLowerCase()

  const items = db.products.filter((p) => {
    if (!p.visible || !visibleCategoryIds.has(p.categoryId)) return false
    if (category && p.categoryId !== category.id) return false
    if (q && !`${p.name} ${p.description}`.toLowerCase().includes(q)) return false
    if (filter.minPrice !== undefined && p.price < filter.minPrice) return false
    if (filter.maxPrice !== undefined && p.price > filter.maxPrice) return false
    return true
  })

  switch (filter.sort) {
    case 'price_asc':
      return items.sort((a, b) => a.price - b.price)
    case 'price_desc':
      return items.sort((a, b) => b.price - a.price)
    case 'name':
      return items.sort((a, b) => a.name.localeCompare(b.name, 'ru'))
    default:
      return items
  }
}

export async function getPublicProduct(slug: string): Promise<{ product: Product; category: Category } | null> {
  const db = await readDb()
  const product = db.products.find((p) => p.slug === slug && p.visible)
  const category = product && db.categories.find((c) => c.id === product.categoryId && c.visible)
  return product && category ? { product, category } : null
}

export async function getAllProducts(): Promise<Product[]> {
  const db = await readDb()
  return [...db.products].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}

export async function getProductById(id: string): Promise<Product | undefined> {
  return (await readDb()).products.find((p) => p.id === id)
}

export type ProductInput = Omit<Product, 'id' | 'updatedAt' | 'demo'>

export async function saveProduct(id: string | null, input: ProductInput): Promise<Product> {
  return mutateDb((db) => {
    if (db.products.some((p) => p.slug === input.slug && p.id !== id)) {
      throw new Error('Товар с таким адресом (slug) уже есть')
    }
    if (!db.categories.some((c) => c.id === input.categoryId)) throw new Error('Категория не найдена')
    const now = new Date().toISOString()
    if (id) {
      const index = db.products.findIndex((p) => p.id === id)
      const existing = db.products[index]
      if (!existing) throw new Error('Товар не найден')
      const updated: Product = { ...input, id, demo: existing.demo, updatedAt: now }
      db.products[index] = updated
      return updated
    }
    const created: Product = { ...input, id: randomUUID(), updatedAt: now }
    db.products.push(created)
    return created
  })
}

export async function deleteProduct(id: string) {
  await mutateDb((db) => {
    db.products = db.products.filter((p) => p.id !== id)
  })
}

export type CategoryInput = Omit<Category, 'id'>

export async function saveCategory(id: string | null, input: CategoryInput): Promise<Category> {
  return mutateDb((db) => {
    if (db.categories.some((c) => c.slug === input.slug && c.id !== id)) {
      throw new Error('Категория с таким адресом (slug) уже есть')
    }
    if (id) {
      const index = db.categories.findIndex((c) => c.id === id)
      if (index < 0) throw new Error('Категория не найдена')
      db.categories[index] = { ...input, id }
      return db.categories[index]!
    }
    const created: Category = { ...input, id: randomUUID() }
    db.categories.push(created)
    return created
  })
}

export async function deleteCategory(id: string) {
  await mutateDb((db) => {
    if (db.products.some((p) => p.categoryId === id)) {
      throw new Error('В категории есть товары — сначала перенесите или удалите их')
    }
    db.categories = db.categories.filter((c) => c.id !== id)
  })
}

export async function saveSettings(settings: SiteSettings) {
  await mutateDb((db) => {
    db.settings = settings
  })
}

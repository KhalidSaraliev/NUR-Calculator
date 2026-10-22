import type { Category, Database, Product } from '@/lib/types'

const categories: Category[] = [
  {
    id: 'cat-appliances',
    slug: 'appliances',
    name: 'Бытовая техника',
    description: 'Холодильники, стиральные машины, плиты и другая техника для дома.',
    sortOrder: 1,
    visible: true,
  },
  {
    id: 'cat-furniture',
    slug: 'furniture',
    name: 'Мебель',
    description: 'Диваны, шкафы, кухни, спальни и мебель для детской.',
    sortOrder: 2,
    visible: true,
  },
  {
    id: 'cat-electronics',
    slug: 'electronics',
    name: 'Смартфоны и электроника',
    description: 'Смартфоны, ноутбуки, телевизоры и аксессуары.',
    sortOrder: 3,
    visible: true,
  },
  {
    id: 'cat-other',
    slug: 'other',
    name: 'Другие товары',
    description: 'Товары для дома и семьи, которых нет в других категориях.',
    sortOrder: 4,
    visible: true,
  },
]

type DemoProduct = Omit<Product, 'updatedAt' | 'visible' | 'demo' | 'source' | 'availability'>

// Демонстрационные позиции, чтобы каталог можно было проверить сразу.
// Цены условные. Перед запуском замените их реальным ассортиментом
// через админ-панель или отключите SEED_DEMO_PRODUCTS.
const demoProducts: DemoProduct[] = [
  {
    id: 'demo-smartphone',
    slug: 'samsung-galaxy-s24-ultra',
    name: 'Samsung Galaxy S24 Ultra',
    categoryId: 'cat-electronics',
    price: 120_000,
    description: 'Флагманский смартфон. Конфигурацию и цвет уточняйте у менеджера.',
    specs: ['Экран 6,8"', 'Память — по наличию', 'Официальная гарантия производителя'],
  },
  {
    id: 'demo-fridge',
    slug: 'holodilnik-dvuhkamernyj',
    name: 'Холодильник двухкамерный',
    categoryId: 'cat-appliances',
    price: 45_000,
    description: 'Двухкамерный холодильник для семьи. Модель подбирается под ваш запрос.',
    specs: ['Высота около 185 см', 'No Frost — по модели', 'Доставка — по согласованию'],
  },
  {
    id: 'demo-washer',
    slug: 'stiralnaya-mashina',
    name: 'Стиральная машина',
    categoryId: 'cat-appliances',
    price: 35_000,
    description: 'Стиральная машина с фронтальной загрузкой.',
    specs: ['Загрузка 6–8 кг', 'Класс энергопотребления — по модели'],
  },
  {
    id: 'demo-sofa',
    slug: 'divan-uglovoj',
    name: 'Диван угловой',
    categoryId: 'cat-furniture',
    price: 60_000,
    description: 'Угловой диван с механизмом раскладывания. Обивку можно выбрать.',
    specs: ['Спальное место', 'Ящик для белья', 'Сборка — по согласованию'],
  },
  {
    id: 'demo-wardrobe',
    slug: 'shkaf-kupe',
    name: 'Шкаф-купе',
    categoryId: 'cat-furniture',
    price: 40_000,
    description: 'Шкаф-купе с зеркалом. Размеры подбираются под помещение.',
    specs: ['Ширина 150–240 см', 'Наполнение — по выбору'],
  },
  {
    id: 'demo-laptop',
    slug: 'noutbuk-15',
    name: 'Ноутбук 15,6"',
    categoryId: 'cat-electronics',
    price: 55_000,
    description: 'Ноутбук для учёбы и работы.',
    specs: ['Экран 15,6"', 'SSD', 'Конфигурация — по наличию'],
  },
  {
    id: 'demo-tv',
    slug: 'televizor-55',
    name: 'Телевизор 55"',
    categoryId: 'cat-electronics',
    price: 50_000,
    description: 'Телевизор 4K со Smart TV.',
    specs: ['Диагональ 55"', '4K', 'Smart TV'],
  },
  {
    id: 'demo-stroller',
    slug: 'detskaya-kolyaska',
    name: 'Детская коляска',
    categoryId: 'cat-other',
    price: 25_000,
    description: 'Коляска 2 в 1 для новорождённых.',
    specs: ['Люлька и прогулочный блок', 'Цвет — по наличию'],
  },
]

export function createSeedDatabase(withDemoProducts: boolean): Database {
  const now = new Date().toISOString()
  return {
    version: 1,
    categories,
    products: withDemoProducts
      ? demoProducts.map((p) => ({
          ...p,
          availability: 'on_order',
          visible: true,
          demo: true,
          source: { type: 'own' },
          updatedAt: now,
        }))
      : [],
    leads: [],
    orders: [],
    payments: [],
    users: [],
    settings: { showPrices: true, catalogNotice: '' },
    counters: { order: 0 },
  }
}

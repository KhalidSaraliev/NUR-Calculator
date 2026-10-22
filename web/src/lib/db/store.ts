import 'server-only'

import { promises as fs } from 'node:fs'
import path from 'node:path'

import { createSeedDatabase } from '@/lib/db/seed'
import type { Database } from '@/lib/types'

/**
 * Хранилище для разработки и небольшого пилота: один JSON-файл
 * с атомарной записью (временный файл + rename) и очередью изменений,
 * чтобы параллельные запросы не затирали друг друга.
 *
 * Ограничения: работает только при одном экземпляре приложения и
 * постоянном диске. Для production замените реализацию на PostgreSQL
 * (интерфейс readDb / mutateDb остаётся тем же) — см. README.
 */

function dataFile(): string {
  const dir = process.env.DATA_DIR?.trim() || path.join(process.cwd(), '.data')
  return path.join(dir, 'db.json')
}

function seedDemo(): boolean {
  return (process.env.SEED_DEMO_PRODUCTS ?? 'true').trim() !== 'false'
}

async function load(): Promise<Database> {
  const file = dataFile()
  try {
    const raw = await fs.readFile(file, 'utf8')
    return JSON.parse(raw) as Database
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
    const db = createSeedDatabase(seedDemo())
    await persist(db)
    return db
  }
}

async function persist(db: Database): Promise<void> {
  const file = dataFile()
  await fs.mkdir(path.dirname(file), { recursive: true, mode: 0o700 })
  const tmp = `${file}.${process.pid}.${Date.now()}.tmp`
  await fs.writeFile(tmp, JSON.stringify(db, null, 2), { encoding: 'utf8', mode: 0o600 })
  await fs.rename(tmp, file)
}

let queue: Promise<unknown> = Promise.resolve()

export async function readDb(): Promise<Database> {
  // Дожидаемся записей, поставленных в очередь раньше, чтобы не читать устаревшие данные.
  await queue.catch(() => undefined)
  return load()
}

/** Изменяет данные внутри очереди; результат функции возвращается вызывающему. */
export function mutateDb<T>(fn: (db: Database) => T | Promise<T>): Promise<T> {
  const run = queue.then(async () => {
    const db = await load()
    const result = await fn(db)
    await persist(db)
    return result
  })
  queue = run.catch(() => undefined)
  return run
}

#!/usr/bin/env node
// Создание или обновление учётной записи сотрудника.
//
//   npm run admin:create -- --email admin@example.ru --name "Имя" --role admin
//
// Пароль вводится в терминале (не сохраняется в истории команд) или
// передаётся через переменную ADMIN_PASSWORD. В хранилище попадает только хеш.
import { randomUUID } from 'node:crypto'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { createInterface } from 'node:readline'
import { parseArgs } from 'node:util'

import { hashPassword, MIN_PASSWORD_LENGTH } from './password-hash.mjs'

const { values } = parseArgs({
  options: {
    email: { type: 'string' },
    name: { type: 'string', default: '' },
    role: { type: 'string', default: 'manager' },
    disable: { type: 'boolean', default: false },
  },
})

function fail(message) {
  console.error(`Ошибка: ${message}`)
  process.exit(1)
}

const email = (values.email ?? '').trim().toLowerCase()
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail('укажите --email')
if (!['admin', 'manager'].includes(values.role)) fail('--role должен быть admin или manager')

async function askPassword() {
  if (process.env.ADMIN_PASSWORD) return process.env.ADMIN_PASSWORD
  if (!process.stdin.isTTY) fail('задайте пароль в ADMIN_PASSWORD или запустите скрипт в терминале')
  const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true })
  // Скрываем вводимые символы.
  rl._writeToOutput = (s) => {
    if (s.includes('Пароль')) rl.output.write(s)
  }
  const ask = (q) => new Promise((resolve) => rl.question(q, resolve))
  const first = await ask(`Пароль (не короче ${MIN_PASSWORD_LENGTH} символов): `)
  process.stdout.write('\n')
  const second = await ask('Пароль ещё раз: ')
  process.stdout.write('\n')
  rl.close()
  if (first !== second) fail('пароли не совпадают')
  return first
}

const dataDir = process.env.DATA_DIR?.trim() || path.join(process.cwd(), '.data')
const file = path.join(dataDir, 'db.json')

let db
try {
  db = JSON.parse(await fs.readFile(file, 'utf8'))
} catch (error) {
  if (error.code !== 'ENOENT') throw error
  fail(`файл данных ${file} не найден — сначала запустите сайт (npm run dev), он создаст его`)
}

const existing = db.users.find((u) => u.email === email)
if (values.disable) {
  if (!existing) fail('пользователь не найден')
  existing.disabled = true
  existing.sessionVersion += 1
} else {
  const passwordHash = await hashPassword(await askPassword())
  if (existing) {
    existing.passwordHash = passwordHash
    existing.role = values.role
    existing.name = values.name || existing.name
    existing.disabled = false
    existing.sessionVersion += 1
  } else {
    db.users.push({
      id: randomUUID(),
      email,
      name: values.name || email,
      role: values.role,
      passwordHash,
      sessionVersion: 1,
      disabled: false,
      createdAt: new Date().toISOString(),
    })
  }
}

const tmp = `${file}.${process.pid}.tmp`
await fs.writeFile(tmp, JSON.stringify(db, null, 2), { mode: 0o600 })
await fs.rename(tmp, file)
console.log(values.disable ? `Пользователь ${email} отключён.` : `Пользователь ${email} сохранён (роль: ${values.role}).`)
console.log('Если сайт запущен, изменения применятся сразу; старые сессии этого пользователя завершены.')

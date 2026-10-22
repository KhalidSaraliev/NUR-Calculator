/**
 * Публичные данные компании. Всё, что должен предоставить владелец
 * (контакты, реквизиты, адрес), берётся из переменных окружения —
 * в коде нет выдуманных телефонов, адресов или реквизитов.
 * Пустое значение означает «ещё не заполнено», и интерфейс это учитывает.
 */

function env(value: string | undefined): string {
  return (value ?? '').trim()
}

export const siteConfig = {
  name: 'NUR Invest',
  url: env(process.env.NEXT_PUBLIC_SITE_URL) || 'http://localhost:3000',
  description:
    'NUR Invest — покупка бытовой техники, мебели и электроники с оплатой частями. ' +
    'Цена товара фиксируется заранее, без процентов по займу и без штрафов за просрочку.',
  /** Номер WhatsApp только цифрами в международном формате, например 7XXXXXXXXXX. */
  whatsappPhone: env(process.env.NEXT_PUBLIC_WHATSAPP_PHONE).replace(/\D/g, ''),
  phone: env(process.env.NEXT_PUBLIC_CONTACT_PHONE),
  email: env(process.env.NEXT_PUBLIC_CONTACT_EMAIL),
  city: env(process.env.NEXT_PUBLIC_CONTACT_CITY),
  address: env(process.env.NEXT_PUBLIC_CONTACT_ADDRESS),
  workingHours: env(process.env.NEXT_PUBLIC_WORKING_HOURS),
  legal: {
    name: env(process.env.NEXT_PUBLIC_LEGAL_NAME),
    inn: env(process.env.NEXT_PUBLIC_LEGAL_INN),
    ogrn: env(process.env.NEXT_PUBLIC_LEGAL_OGRN),
    address: env(process.env.NEXT_PUBLIC_LEGAL_ADDRESS),
  },
} as const

export function isLegalInfoComplete(): boolean {
  const { name, inn, ogrn } = siteConfig.legal
  return Boolean(name && inn && ogrn)
}

/** Список незаполненных настроек — показывается только в режиме разработки. */
export function missingPublicConfig(): string[] {
  const missing: string[] = []
  if (!process.env.NEXT_PUBLIC_SITE_URL) missing.push('NEXT_PUBLIC_SITE_URL')
  if (!siteConfig.whatsappPhone) missing.push('NEXT_PUBLIC_WHATSAPP_PHONE')
  if (!siteConfig.phone) missing.push('NEXT_PUBLIC_CONTACT_PHONE')
  if (!isLegalInfoComplete()) missing.push('NEXT_PUBLIC_LEGAL_NAME / _INN / _OGRN')
  return missing
}

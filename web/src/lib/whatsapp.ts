import { siteConfig } from '@/config/site'

/**
 * Ссылка на чат WhatsApp с заранее заполненным сообщением.
 * Возвращает null, если номер не задан в NEXT_PUBLIC_WHATSAPP_PHONE —
 * тогда кнопки ведут на форму заявки, а не на выдуманный номер.
 */
export function whatsappLink(text?: string, phone: string = siteConfig.whatsappPhone): string | null {
  if (!/^\d{10,15}$/.test(phone)) return null
  const query = text ? `?text=${encodeURIComponent(text)}` : ''
  return `https://wa.me/${phone}${query}`
}

export const defaultWhatsappText = 'Здравствуйте! Хочу узнать об условиях покупки товара с оплатой частями в NUR Invest.'

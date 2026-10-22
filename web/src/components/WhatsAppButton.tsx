import Link from 'next/link'

import { WhatsAppIcon } from '@/components/icons'
import { defaultWhatsappText, whatsappLink } from '@/lib/whatsapp'

interface Props {
  text?: string
  label?: string
  className?: string
  size?: 'sm' | 'md'
}

/**
 * Кнопка «Написать в WhatsApp». Если номер не настроен, ведёт на форму
 * заявки — так посетитель не попадёт на несуществующий чат.
 */
export function WhatsAppButton({ text = defaultWhatsappText, label = 'Написать в WhatsApp', className, size = 'md' }: Props) {
  const href = whatsappLink(text)
  const cls = ['btn', 'btn--whatsapp', size === 'sm' ? 'btn--sm' : '', className ?? ''].join(' ').trim()
  if (!href) {
    return (
      <Link href="/apply" className={cls} title="WhatsApp пока не подключён — оставьте заявку на сайте">
        <WhatsAppIcon size={20} />
        <span className="btn__label">{label}</span>
      </Link>
    )
  }
  return (
    <a href={href} className={cls} target="_blank" rel="noopener noreferrer">
      <WhatsAppIcon size={20} />
      <span className="btn__label">{label}</span>
      <span className="visually-hidden"> (откроется в новом окне)</span>
    </a>
  )
}

/** Плавающая кнопка в углу экрана. Не показывается, пока номер не задан. */
export function WhatsAppFloating() {
  const href = whatsappLink(defaultWhatsappText)
  if (!href) return null
  return (
    <a href={href} className="wa-float" target="_blank" rel="noopener noreferrer" aria-label="Написать в WhatsApp (откроется в новом окне)">
      <WhatsAppIcon size={24} />
      <span className="wa-float__label">WhatsApp</span>
    </a>
  )
}

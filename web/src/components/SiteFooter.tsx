import Link from 'next/link'

import { Logo } from '@/components/Logo'
import { isLegalInfoComplete, siteConfig } from '@/config/site'
import { principlesDisclaimer } from '@/config/terms'
import { formatRuPhone, normalizeRuPhone } from '@/lib/validation'

export function SiteFooter() {
  const { legal } = siteConfig
  const phone = siteConfig.phone ? normalizeRuPhone(siteConfig.phone) : null
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-grid">
          <div>
            <Logo />
            <p style={{ marginTop: 16 }}>
              Продажа товаров с оплатой частями: цена фиксируется в договоре заранее, без процентов
              по займу и без штрафов за просрочку.
            </p>
          </div>
          <nav aria-label="Разделы сайта">
            <h2>Покупателям</h2>
            <ul>
              <li><Link href="/catalog">Каталог товаров</Link></li>
              <li><Link href="/calculator">Калькулятор оплаты</Link></li>
              <li><Link href="/apply">Оставить заявку</Link></li>
              <li><Link href="/how-it-works">Как это работает</Link></li>
              <li><Link href="/faq">Частые вопросы</Link></li>
            </ul>
          </nav>
          <div>
            <h2>Документы</h2>
            <ul>
              <li><Link href="/privacy">Политика обработки персональных данных</Link></li>
              <li><Link href="/contacts">Контакты и реквизиты</Link></li>
            </ul>
          </div>
          <div>
            <h2>Контакты</h2>
            <ul>
              {phone && (
                <li>
                  <a href={`tel:${phone}`}>{formatRuPhone(phone)}</a>
                </li>
              )}
              {siteConfig.email && (
                <li>
                  <a href={`mailto:${siteConfig.email}`}>{siteConfig.email}</a>
                </li>
              )}
              {siteConfig.address && <li>{siteConfig.address}</li>}
              {siteConfig.workingHours && <li>{siteConfig.workingHours}</li>}
              {!phone && !siteConfig.email && <li>Контакты появятся здесь после настройки сайта.</li>}
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          {isLegalInfoComplete() ? (
            <p>
              {legal.name}, ИНН {legal.inn}, ОГРН {legal.ogrn}
              {legal.address ? `, ${legal.address}` : ''}
            </p>
          ) : (
            <p>Реквизиты продавца будут опубликованы здесь до начала продаж.</p>
          )}
          <p>
            {principlesDisclaimer} Информация на сайте не является публичной офертой; условия
            сделки определяются договором купли-продажи.
          </p>
          <p>© {new Date().getFullYear()} NUR Invest</p>
        </div>
      </div>
    </footer>
  )
}

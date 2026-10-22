import type { Metadata } from 'next'
import Link from 'next/link'

import { WhatsAppButton } from '@/components/WhatsAppButton'
import { isLegalInfoComplete, siteConfig } from '@/config/site'
import { formatRuPhone, normalizeRuPhone } from '@/lib/validation'

export const metadata: Metadata = {
  title: 'Контакты и реквизиты',
  description: 'Как связаться с NUR Invest: WhatsApp, телефон, адрес и реквизиты продавца.',
  alternates: { canonical: '/contacts' },
}

export default function ContactsPage() {
  const phone = siteConfig.phone ? normalizeRuPhone(siteConfig.phone) : null
  const { legal } = siteConfig
  return (
    <div className="container" style={{ paddingBottom: 72 }}>
      <header className="page-head">
        <h1>Контакты</h1>
        <p>Удобнее всего написать нам в WhatsApp или оставить заявку на сайте.</p>
      </header>
      <div className="grid grid--2">
        <section className="card" aria-labelledby="contacts-title">
          <h2 id="contacts-title" style={{ fontSize: '1.2rem' }}>
            Связаться
          </h2>
          <dl className="result__rows">
            {phone && (
              <div>
                <dt>Телефон</dt>
                <dd>
                  <a href={`tel:${phone}`}>{formatRuPhone(phone)}</a>
                </dd>
              </div>
            )}
            {siteConfig.email && (
              <div>
                <dt>Эл. почта</dt>
                <dd>
                  <a href={`mailto:${siteConfig.email}`}>{siteConfig.email}</a>
                </dd>
              </div>
            )}
            {siteConfig.city && (
              <div>
                <dt>Город</dt>
                <dd>{siteConfig.city}</dd>
              </div>
            )}
            {siteConfig.address && (
              <div>
                <dt>Адрес</dt>
                <dd style={{ whiteSpace: 'normal' }}>{siteConfig.address}</dd>
              </div>
            )}
            {siteConfig.workingHours && (
              <div>
                <dt>Часы работы</dt>
                <dd>{siteConfig.workingHours}</dd>
              </div>
            )}
          </dl>
          {!phone && !siteConfig.email && !siteConfig.address && (
            <p className="muted">Контактные данные будут опубликованы после настройки сайта.</p>
          )}
          <div className="btn-row" style={{ marginTop: 16 }}>
            <WhatsAppButton />
            <Link href="/apply" className="btn btn--secondary">
              Оставить заявку
            </Link>
          </div>
        </section>
        <section className="card" aria-labelledby="legal-title">
          <h2 id="legal-title" style={{ fontSize: '1.2rem' }}>
            Реквизиты продавца
          </h2>
          {isLegalInfoComplete() ? (
            <dl className="result__rows">
              <div>
                <dt>Наименование</dt>
                <dd style={{ whiteSpace: 'normal' }}>{legal.name}</dd>
              </div>
              <div>
                <dt>ИНН</dt>
                <dd>{legal.inn}</dd>
              </div>
              <div>
                <dt>ОГРН / ОГРНИП</dt>
                <dd>{legal.ogrn}</dd>
              </div>
              {legal.address && (
                <div>
                  <dt>Юридический адрес</dt>
                  <dd style={{ whiteSpace: 'normal' }}>{legal.address}</dd>
                </div>
              )}
            </dl>
          ) : (
            <p className="muted">Реквизиты будут опубликованы здесь до начала продаж.</p>
          )}
        </section>
      </div>
    </div>
  )
}

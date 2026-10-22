import type { Metadata } from 'next'

import { Flash } from '@/components/admin/Flash'
import { PaymentsModeBanner } from '@/components/admin/PaymentsModeBanner'
import { installmentTerms } from '@/config/terms'
import { requireAdminPage } from '@/lib/auth/session'
import { getSettings } from '@/lib/data/catalog'

import { saveSettingsAction } from '../actions'

export const metadata: Metadata = { title: 'Настройки' }

export default async function SettingsPage({ searchParams }: PageProps<'/admin/settings'>) {
  await requireAdminPage('settings:write')
  const sp = await searchParams
  const settings = await getSettings()
  return (
    <>
      <h1>Настройки отображения</h1>
      <Flash ok={sp.ok} error={sp.error} />
      <form action={saveSettingsAction} className="card" style={{ maxWidth: 720 }}>
        <div className="field">
          <div className="checkbox">
            <input id="showPrices" name="showPrices" type="checkbox" defaultChecked={settings.showPrices} />
            <label htmlFor="showPrices">Показывать цены и калькулятор в каталоге</label>
          </div>
        </div>
        <div className="field">
          <label htmlFor="catalogNotice">Объявление над каталогом</label>
          <input id="catalogNotice" name="catalogNotice" className="input" maxLength={300} defaultValue={settings.catalogNotice} />
          <span className="field__hint">Например: «Доставка по городу — по согласованию». Пусто — не показывается.</span>
        </div>
        <button type="submit" className="btn btn--primary btn--sm">
          Сохранить
        </button>
      </form>

      <section className="card card--soft" style={{ maxWidth: 720, marginTop: 24 }}>
        <h2 style={{ fontSize: '1.1rem' }}>Условия оплаты частями</h2>
        <p className="small">
          Сроки, минимальный взнос и таблица наценок задаются в файле <code>src/config/terms.ts</code> и меняются
          вместе с кодом, чтобы любое изменение условий проходило проверку.
        </p>
        <p className="small">
          Сейчас: взнос от {installmentTerms.minDownPercent}%, сроки {installmentTerms.termOptions.join(', ')} мес.
        </p>
      </section>
      <div style={{ maxWidth: 720, marginTop: 24 }}>
        <PaymentsModeBanner />
      </div>
    </>
  )
}

import { SiteFooter } from '@/components/SiteFooter'
import { SiteHeader } from '@/components/SiteHeader'
import { WhatsAppButton, WhatsAppFloating } from '@/components/WhatsAppButton'
import { missingPublicConfig } from '@/config/site'

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  const missing = process.env.NODE_ENV !== 'production' ? missingPublicConfig() : []
  return (
    <>
      <a href="#main" className="skip-link">
        Перейти к содержимому
      </a>
      {missing.length > 0 && (
        <div className="dev-banner" role="note">
          <div className="container">
            Режим разработки: не заполнены переменные {missing.join(', ')} (см. .env.example). Эта полоса не
            показывается в production.
          </div>
        </div>
      )}
      <SiteHeader whatsappSlot={<WhatsAppButton size="sm" label="WhatsApp" />} />
      <main id="main">{children}</main>
      <SiteFooter />
      <WhatsAppFloating />
    </>
  )
}

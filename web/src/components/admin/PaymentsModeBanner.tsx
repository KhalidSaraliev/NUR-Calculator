import { getPaymentsConfig } from '@/lib/payments/config'

export function PaymentsModeBanner() {
  const config = getPaymentsConfig()
  if (!config.enabled) {
    return (
      <div className="alert alert--warning" role="note">
        <p>
          <strong>Онлайн-оплата не подключена.</strong> Ссылки на оплату не создаются.{' '}
          {config.provider === 'disabled'
            ? 'Чтобы включить тестовый режим T-Bank, заполните переменные PAYMENTS_* и TBANK_* (см. README).'
            : `${config.issues.join('. ')}.`}
        </p>
      </div>
    )
  }
  if (config.mode === 'test') {
    return (
      <div className="alert alert--info" role="note">
        <p>
          <strong>Тестовый режим T-Bank.</strong> Используется тестовый терминал — реальные деньги не списываются.
        </p>
      </div>
    )
  }
  return (
    <div className="alert alert--success" role="note">
      <p>
        <strong>Боевой режим T-Bank.</strong> Платежи по ссылкам списываются с карт клиентов.
      </p>
    </div>
  )
}

import type { FaqItem } from '@/content/faq'

export function FaqList({ items }: { items: FaqItem[] }) {
  return (
    <div className="faq">
      {items.map((item) => (
        <details key={item.q}>
          <summary>{item.q}</summary>
          <div>{item.a}</div>
        </details>
      ))}
    </div>
  )
}

/** Разметка FAQPage для поисковых систем. */
export function FaqJsonLd({ items }: { items: FaqItem[] }) {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((i) => ({
      '@type': 'Question',
      name: i.q,
      acceptedAnswer: { '@type': 'Answer', text: i.a },
    })),
  }
  return (
    <script
      type="application/ld+json"
      // Данные статические, из src/content/faq.ts; '<' экранируется на всякий случай.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }}
    />
  )
}

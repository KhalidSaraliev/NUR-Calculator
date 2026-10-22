'use client'

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main id="main" className="container" style={{ padding: '96px 20px', textAlign: 'center' }}>
      <h1>Что-то пошло не так</h1>
      <p className="muted">Попробуйте обновить страницу. Если ошибка повторяется, напишите нам.</p>
      <button type="button" className="btn btn--primary" onClick={reset}>
        Попробовать снова
      </button>
    </main>
  )
}

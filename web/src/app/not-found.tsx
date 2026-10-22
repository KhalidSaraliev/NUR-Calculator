import Link from 'next/link'

export default function NotFound() {
  return (
    <main id="main" className="container" style={{ padding: '96px 20px', textAlign: 'center' }}>
      <h1>Страница не найдена</h1>
      <p className="muted">Возможно, она была перемещена или ссылка набрана с ошибкой.</p>
      <div className="btn-row" style={{ justifyContent: 'center' }}>
        <Link href="/" className="btn btn--primary">
          На главную
        </Link>
        <Link href="/catalog" className="btn btn--secondary">
          В каталог
        </Link>
      </div>
    </main>
  )
}

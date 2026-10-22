import Link from 'next/link'

export function Logo() {
  return (
    <Link href="/" className="logo" aria-label="NUR Invest — на главную">
      <span className="logo__mark" aria-hidden="true">
        N
      </span>
      <span>
        NUR Invest
        <span className="logo__sub">Покупка с оплатой частями</span>
      </span>
    </Link>
  )
}

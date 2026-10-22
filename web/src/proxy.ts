import { NextResponse, type NextRequest } from 'next/server'

import { getSessionSecret, SESSION_COOKIE, verifySessionToken } from '@/lib/auth/session-token'

/**
 * Первый рубеж защиты админ-панели: без действительной подписанной
 * сессии запрос перенаправляется на страницу входа. Права и актуальность
 * пользователя дополнительно проверяются на каждой странице и в каждом
 * серверном действии (src/lib/auth/session.ts).
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  if (pathname === '/admin/login') return NextResponse.next()

  const secret = getSessionSecret()
  const session = secret ? verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value, secret) : null
  if (!session) {
    const url = request.nextUrl.clone()
    url.pathname = '/admin/login'
    url.search = ''
    return NextResponse.redirect(url)
  }
  return NextResponse.next()
}

export const config = {
  matcher: ['/admin', '/admin/:path*'],
}

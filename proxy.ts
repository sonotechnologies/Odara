import { NextResponse, type NextRequest } from 'next/server'
import { verify } from '@/lib/signing'

/**
 * Optimistic gate for the studio. Every studio page and action checks the
 * session again on the server; this just keeps signed-out visitors on the login page.
 */
export async function proxy(req: NextRequest) {
  const session = await verify(req.cookies.get('odara_studio')?.value)
  if (!session) {
    const url = new URL('/studio/login', req.url)
    if (req.nextUrl.pathname !== '/studio') url.searchParams.set('next', req.nextUrl.pathname)
    return NextResponse.redirect(url)
  }
  return NextResponse.next()
}

export const config = { matcher: ['/studio', '/studio/((?!login).*)'] }

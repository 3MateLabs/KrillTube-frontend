import { NextRequest, NextResponse } from 'next/server'

export function middleware(request: NextRequest) {
  const response = NextResponse.next()
  
  const isEmbedRoute = request.nextUrl.pathname.startsWith('/x-card') || 
                        request.nextUrl.pathname.startsWith('/api/twitter')
  
  if (isEmbedRoute) {
    response.headers.delete('X-Frame-Options')
    
    response.headers.set(
      'Content-Security-Policy',
      "frame-ancestors 'self' https://twitter.com https://mobile.twitter.com https://x.com https://tweetdeck.twitter.com"
    )
    
    response.headers.set(
      'Access-Control-Allow-Origin',
      'https://twitter.com'
    )
    response.headers.set(
      'Access-Control-Allow-Methods',
      'GET, POST, OPTIONS'
    )
    response.headers.set(
      'Access-Control-Allow-Credentials',
      'true'
    )
  } else {
    response.headers.set('X-Frame-Options', 'SAMEORIGIN')
    response.headers.set(
      'Content-Security-Policy',
      "frame-ancestors 'self'"
    )
  }
  
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  
  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
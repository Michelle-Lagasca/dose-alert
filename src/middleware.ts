import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value)
          })

          response = NextResponse.next({
            request,
          })

          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  // 🔐 Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // 🛡️ Protected routes
  const protectedRoutes = [
    '/dashboard',
    '/medications',
    '/reminders',
    '/history',
    '/chatbot',
    '/records',
    '/settings',
  ]

  const isProtected = protectedRoutes.some((route) =>
    request.nextUrl.pathname.startsWith(route)
  )

  // 🚫 Redirect if not logged in
  if (isProtected && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/auth'
    return NextResponse.redirect(url)
  }

  return response
}

// ⚡ Apply middleware only to protected routes
export const config = {
  matcher: [
    '/dashboard/:path*',
    '/medications/:path*',
    '/reminders/:path*',
    '/history/:path*',
    '/chatbot/:path*',
    '/settings/:path*',
  ],
}
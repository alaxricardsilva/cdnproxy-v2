import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function proxy(request: NextRequest) {
    const token = request.cookies.get('access_token')?.value
    const { pathname } = request.nextUrl

    // Rotas públicas que não precisam de autenticação
    const publicRoutes = ['/login', '/forgot-password', '/update-password']
    const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route))

    // Se usuario tem token e tenta acessar login, manda pro dashboard
    if (token && isPublicRoute) {
        return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    // Se o usuario NAO tem token e tenta acessar rota protegida (tudo que não é público)
    // Excluindo static files, images, api, etc
    if (!token && !isPublicRoute && !pathname.match(/\.(.*)$/)) {
        // Permite API calls passarem (opcional, dependendo se o front faz proxy)
        // Mas geralmente protejemos páginas.
        if (pathname.startsWith('/api')) return NextResponse.next()

        return NextResponse.redirect(new URL('/login', request.url))
    }

    return NextResponse.next()
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - api (API routes)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         */
        '/((?!api|_next/static|_next/image|favicon.ico).*)',
    ],
}

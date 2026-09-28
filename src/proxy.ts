import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Corta el paso a /admin antes de renderizar.
 *
 * Es un chequeo optimista a propósito: acá sólo miramos que exista la cookie
 * de sesión para poder redirigir sin tocar la base ni verificar la firma (el
 * proxy corre en el edge y no tiene node:crypto). La autorización real la hace
 * `requireAdmin()` de src/server/admin-auth.ts, que corre en cada página, cada
 * server action y cada route handler del panel.
 *
 * En Next 16 este archivo se llama `proxy`, no `middleware`.
 */
const ADMIN_COOKIE = "soja_admin";

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (pathname === "/admin/login") {
    // Ya logueado: no tiene sentido mostrar el formulario otra vez.
    if (request.cookies.has(ADMIN_COOKIE)) {
      return NextResponse.redirect(new URL("/admin", request.url));
    }
    return NextResponse.next();
  }

  if (request.cookies.has(ADMIN_COOKIE)) return NextResponse.next();

  const login = new URL("/admin/login", request.url);
  // Para volver a donde iba una vez que entra.
  if (pathname !== "/admin") login.searchParams.set("next", `${pathname}${search}`);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ["/admin", "/admin/:path*"],
};

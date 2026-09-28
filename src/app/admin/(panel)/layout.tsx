import type { Metadata } from "next";
import Link from "next/link";

import { logoutAction } from "@/app/admin/actions";
import { AdminNav } from "@/components/admin/AdminNav";
import { requireAdmin } from "@/server/admin-auth";
import { getSettings } from "@/server/settings";

export const metadata: Metadata = {
  title: { default: "Panel", template: "%s · Panel SOJA" },
  // El panel nunca debería aparecer en un buscador.
  robots: { index: false, follow: false },
};

/**
 * Cáscara del panel del dueño.
 *
 * `requireAdmin()` corre acá, pero no alcanza: un layout no protege a las
 * server actions ni a los route handlers, así que cada uno vuelve a pedir
 * sesión por su cuenta.
 */
export default async function AdminPanelLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  await requireAdmin();
  const settings = await getSettings();

  return (
    <div className="min-h-screen md:flex">
      <aside className="bg-ink text-paper print:hidden md:sticky md:top-0 md:flex md:h-screen md:w-60 md:shrink-0 md:flex-col">
        <div className="flex items-center justify-between gap-4 px-4 py-4 md:block">
          <Link href="/admin" className="flex items-baseline gap-2">
            <span className="font-display text-2xl leading-none">SOJA</span>
            <span className="text-[10px] uppercase tracking-[0.2em] text-paper-alt/60">
              Panel
            </span>
          </Link>
          <Link
            href="/"
            className="text-xs text-paper-alt/70 underline-offset-2 hover:text-paper hover:underline md:hidden"
          >
            Ver tienda
          </Link>
        </div>

        <div className="px-3 pb-3 md:flex-1">
          <AdminNav />
        </div>

        <div className="hidden border-t border-white/10 px-3 py-4 md:block">
          {settings.storePaused && (
            <p className="mb-3 rounded-lg bg-alerta/20 px-3 py-2 text-[11px] leading-snug text-paper">
              La tienda está <strong>en pausa</strong>: no entran pedidos nuevos.
            </p>
          )}
          <Link
            href="/"
            className="block rounded-lg px-3 py-2 text-sm text-paper-alt/75 transition-colors hover:bg-white/10 hover:text-paper"
          >
            Ver la tienda
          </Link>
          <form action={logoutAction}>
            <button
              type="submit"
              className="w-full rounded-lg px-3 py-2 text-left text-sm text-paper-alt/75 transition-colors hover:bg-white/10 hover:text-paper"
            >
              Cerrar sesión
            </button>
          </form>
        </div>
      </aside>

      <div className="min-w-0 flex-1 bg-paper">
        {settings.storePaused && (
          <p className="border-b border-alerta/30 bg-alerta/10 px-4 py-2 text-center text-xs font-semibold text-alerta print:hidden sm:px-8">
            Tienda en pausa · el checkout está rechazando pedidos nuevos
          </p>
        )}
        <div className="mx-auto max-w-6xl px-4 py-8 print:max-w-none print:p-0 sm:px-8 sm:py-10">
          {children}
        </div>
      </div>
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";

import { LoginForm } from "@/components/admin/LoginForm";
import { adminConfigured } from "@/server/admin-auth";

export const metadata: Metadata = {
  title: "Entrar al panel · SOJA",
  robots: { index: false, follow: false },
};

/** Queda fuera del grupo `(panel)`: es la única ruta de /admin sin sesión. */
export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  const rawNext = typeof query.next === "string" ? query.next : "/admin";
  const next = rawNext.startsWith("/admin") && !rawNext.startsWith("//") ? rawNext : "/admin";
  const configured = adminConfigured();

  return (
    <div className="grid min-h-screen place-items-center bg-paper px-4 py-16">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Link href="/" className="font-display text-4xl leading-none">
            SOJA
          </Link>
          <p className="mt-2 text-xs uppercase tracking-[0.2em] text-ink-muted">
            Panel de administración
          </p>
        </div>

        <div className="rounded-card border border-line bg-surface p-6">
          {configured ? (
            <LoginForm next={next} />
          ) : (
            <div className="space-y-3 text-sm leading-relaxed text-ink-soft">
              <p className="font-semibold text-ink">Falta configurar el panel.</p>
              <p>
                Agregá una contraseña en el archivo <code>.env</code> y reiniciá el
                servidor:
              </p>
              <pre className="overflow-x-auto rounded-lg bg-paper-alt px-3 py-2 text-xs">
                ADMIN_PASSWORD=&quot;tu-contraseña&quot;
              </pre>
              <p className="text-ink-muted">
                Para producción generá un hash con <code>npm run admin:hash</code> y
                guardalo en <code>ADMIN_PASSWORD_HASH</code>: así la contraseña no
                queda en texto plano en el servidor.
              </p>
            </div>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-ink-muted">
          <Link href="/" className="underline underline-offset-2">
            Volver a la tienda
          </Link>
        </p>
      </div>
    </div>
  );
}

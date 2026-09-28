import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-line bg-paper-alt">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-4">
        <div className="md:col-span-2">
          <span className="font-display text-2xl">SOJA</span>
          <p className="mt-3 max-w-sm text-sm text-ink-soft">
            Remeras y merch personalizado hecho en Argentina. Serigrafía y DTF,
            sin mínimos imposibles y con el precio a la vista desde el primer
            click.
          </p>
        </div>
        <div className="text-sm">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-ink-muted">
            Comprar
          </h3>
          <ul className="space-y-2 text-ink-soft">
            <li>
              <Link href="/disenar" className="hover:text-ink">
                Diseñar una remera
              </Link>
            </li>
            <li>
              <Link href="/productos" className="hover:text-ink">
                Productos y precios
              </Link>
            </li>
            <li>
              <Link href="/carrito" className="hover:text-ink">
                Mi carrito
              </Link>
            </li>
          </ul>
        </div>
        <div className="text-sm">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-ink-muted">
            Ayuda
          </h3>
          <ul className="space-y-2 text-ink-soft">
            <li>
              <Link href="/como-funciona" className="hover:text-ink">
                Cómo funciona
              </Link>
            </li>
            <li>
              <Link href="/seguimiento" className="hover:text-ink">
                Seguir mi pedido
              </Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-line">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-5 text-xs text-ink-muted sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <span>© {new Date().getFullYear()} SOJA. Todos los derechos reservados.</span>
          <span>Precios en pesos argentinos, IVA incluido.</span>
        </div>
      </div>
    </footer>
  );
}

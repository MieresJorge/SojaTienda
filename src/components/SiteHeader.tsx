"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cartUnits, useCart, useCartHydrated } from "@/lib/cart-store";

const NAV = [
  { href: "/productos", label: "Productos" },
  { href: "/como-funciona", label: "Cómo funciona" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const items = useCart((state) => state.items);
  const hydrated = useCartHydrated();
  const units = hydrated ? cartUnits(items) : 0;

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-paper/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-4 sm:px-6">
        <Link href="/" className="flex items-baseline gap-2">
          <span className="font-display text-2xl leading-none tracking-tight">SOJA</span>
          <span className="hidden text-[11px] uppercase tracking-[0.2em] text-ink-muted sm:inline">
            Indumentaria personalizada
          </span>
        </Link>

        <nav className="ml-auto hidden items-center gap-6 text-sm md:flex">
          {NAV.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={
                pathname === link.href
                  ? "text-ink"
                  : "text-ink-soft transition-colors hover:text-ink"
              }
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2 md:ml-0">
          <Link
            href="/carrito"
            className="relative rounded-full border border-line bg-surface px-4 py-2 text-sm font-medium transition-colors hover:border-ink"
          >
            Carrito
            {units > 0 && (
              <span className="ml-2 inline-flex min-w-5 items-center justify-center rounded-full bg-ink px-1.5 text-[11px] font-semibold text-paper">
                {units}
              </span>
            )}
          </Link>
          <Link
            href="/disenar"
            className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-paper transition-colors hover:bg-brote-dark"
          >
            Diseñar
          </Link>
        </div>
      </div>
    </header>
  );
}

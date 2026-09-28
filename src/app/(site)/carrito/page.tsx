"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { PRINT_METHODS, SIZE_ORDER } from "@/lib/catalog";
import { cartSubtotal, useCart, useCartHydrated } from "@/lib/cart-store";
import { money } from "@/lib/format";
import { Badge, Button } from "@/components/ui";

export default function CarritoPage() {
  const router = useRouter();
  const items = useCart((state) => state.items);
  const remove = useCart((state) => state.remove);
  const hydrated = useCartHydrated();

  if (!hydrated) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
        <div className="h-40 animate-pulse rounded-xl bg-paper-alt" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-24 text-center sm:px-6">
        <h1 className="font-display text-4xl">Tu carrito está vacío</h1>
        <p className="mt-3 text-ink-soft">
          Armá tu remera en el diseñador: vas viendo el precio mientras la hacés.
        </p>
        <Button size="lg" className="mt-8" onClick={() => router.push("/disenar")}>
          Empezar a diseñar
        </Button>
      </div>
    );
  }

  const subtotal = cartSubtotal(items);

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <h1 className="font-display text-4xl">Tu carrito</h1>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_340px]">
        <ul className="space-y-4">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex gap-4 rounded-card border border-line bg-surface p-4"
            >
              <div className="grid h-28 w-24 shrink-0 place-items-center overflow-hidden rounded-lg bg-paper-alt">
                {item.previewUrl ? (
                  // Mockup generado por el diseñador; no pasa por el optimizador.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.previewUrl}
                    alt={`Mockup de ${item.productName}`}
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <span className="text-xs text-ink-muted">sin vista</span>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-2">
                  <h2 className="font-semibold">{item.productName}</h2>
                  <Badge>{item.colorName}</Badge>
                  <Badge tone="brote">{PRINT_METHODS[item.method].name}</Badge>
                  {item.rush && <Badge tone="alerta">Exprés</Badge>}
                </div>

                <p className="mt-1.5 text-sm text-ink-soft">
                  {SIZE_ORDER.filter((size) => (item.quantities[size] ?? 0) > 0)
                    .map((size) => `${size}×${item.quantities[size]}`)
                    .join(" · ")}
                </p>

                <div className="mt-3 flex items-end justify-between gap-3">
                  <span className="text-xs text-ink-muted">
                    {item.totalQuantity} prendas · {money(item.unitPrice)} c/u
                  </span>
                  <button
                    type="button"
                    onClick={() => remove(item.id)}
                    className="text-xs text-ink-muted underline-offset-2 hover:text-alerta hover:underline"
                  >
                    Quitar
                  </button>
                </div>
              </div>

              <div className="shrink-0 text-right">
                <span className="font-display text-xl">{money(item.subtotal)}</span>
              </div>
            </li>
          ))}
        </ul>

        <aside className="h-fit rounded-card border border-line bg-surface p-5 lg:sticky lg:top-24">
          <h2 className="text-sm font-semibold">Resumen</h2>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-ink-muted">Subtotal</dt>
              <dd>{money(subtotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-muted">Envío</dt>
              <dd className="text-ink-muted">Se calcula en el próximo paso</dd>
            </div>
          </dl>

          <Button
            size="lg"
            className="mt-5 w-full"
            onClick={() => router.push("/checkout")}
          >
            Continuar al pago
          </Button>

          <Link
            href="/disenar"
            className="mt-3 block text-center text-sm text-ink-soft underline-offset-2 hover:underline"
          >
            Seguir diseñando
          </Link>

          <p className="mt-4 text-[11px] leading-relaxed text-ink-muted">
            Antes de producir te mandamos el mockup final por mail para que lo
            apruebes. Si algo no cierra, lo corregimos sin cargo.
          </p>
        </aside>
      </div>
    </div>
  );
}

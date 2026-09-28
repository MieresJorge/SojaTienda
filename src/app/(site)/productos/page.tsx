import type { Metadata } from "next";
import Link from "next/link";

import { GarmentPreview } from "@/components/GarmentPreview";
import { PRODUCTS, SIZE_ORDER } from "@/lib/catalog";
import { money } from "@/lib/format";
import { priceLadder } from "@/lib/pricing";

export const metadata: Metadata = {
  title: "Productos y precios",
  description:
    "Remeras de algodón peinado para personalizar: clásica, premium y oversize. Precios por cantidad, sin letra chica.",
};

export default function ProductosPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <h1 className="font-display text-5xl">Productos</h1>
      <p className="mt-3 max-w-xl text-ink-soft">
        Todo se personaliza en el mismo diseñador. Los precios de abajo son con
        una estampa de un color al frente, en serigrafía.
      </p>

      <div className="mt-12 space-y-14">
        {PRODUCTS.map((product) => {
          const ladder = priceLadder({
            productId: product.id,
            colorId: product.colors[0].id,
            method: "serigrafia",
            locations: [{ location: "frente", colors: 1, areaCm2: 600 }],
            quantities: {},
          });

          return (
            <section
              key={product.id}
              className="grid gap-8 border-b border-line pb-14 last:border-0 lg:grid-cols-[320px_1fr]"
            >
              <div className="bg-taller rounded-card border border-line p-6">
                <GarmentPreview
                  id={`producto-${product.id}`}
                  product={product}
                  colorHex="#141414"
                  shade="oscura"
                  className="h-auto w-full"
                />
              </div>

              <div>
                <h2 className="font-display text-3xl">{product.name}</h2>
                <p className="mt-3 max-w-xl leading-relaxed text-ink-soft">
                  {product.description}
                </p>

                <dl className="mt-6 grid gap-4 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-xs uppercase tracking-wider text-ink-muted">
                      Tela
                    </dt>
                    <dd className="mt-1">{product.fabric}</dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-wider text-ink-muted">
                      Calce
                    </dt>
                    <dd className="mt-1">{product.fit}</dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-wider text-ink-muted">
                      Talles
                    </dt>
                    <dd className="mt-1">{SIZE_ORDER.join(" · ")}</dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-wider text-ink-muted">
                      Zonas de estampado
                    </dt>
                    <dd className="mt-1">
                      {product.locations.map((l) => l.label).join(" · ")}
                    </dd>
                  </div>
                </dl>

                <div className="mt-6">
                  <h3 className="text-xs uppercase tracking-wider text-ink-muted">
                    Colores
                  </h3>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {product.colors.map((color) => (
                      <span
                        key={color.id}
                        title={color.name}
                        style={{ backgroundColor: color.hex }}
                        className="h-7 w-7 rounded-full border border-line"
                      />
                    ))}
                  </div>
                </div>

                <div className="mt-6 flex flex-wrap gap-x-8 gap-y-2 text-sm">
                  {ladder.map((row) => (
                    <div key={row.minQty}>
                      <span className="block text-xs text-ink-muted">
                        {row.label} u.
                      </span>
                      <span className="font-semibold">{money(row.unitPrice)}</span>
                    </div>
                  ))}
                </div>

                <Link
                  href="/disenar"
                  className="mt-8 inline-flex rounded-full bg-ink px-6 py-3 text-sm font-semibold text-paper transition-colors hover:bg-brote-dark"
                >
                  Diseñar esta prenda
                </Link>
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

import Link from "next/link";

import { GarmentPreview } from "@/components/GarmentPreview";
import { PRINT_METHODS, PRODUCTS } from "@/lib/catalog";
import { money } from "@/lib/format";
import { priceLadder } from "@/lib/pricing";

const PASOS = [
  {
    numero: "01",
    titulo: "Elegí la prenda",
    texto:
      "Modelo, color y talles. Dieciséis colores de remera, del blanco al verde botella.",
  },
  {
    numero: "02",
    titulo: "Diseñá",
    texto:
      "Subí tu logo, escribí lo que quieras o usá la galería. Frente, espalda y mangas.",
  },
  {
    numero: "03",
    titulo: "Mirá el precio",
    texto:
      "Se actualiza mientras diseñás: cuántos colores, qué técnica, cuántas prendas.",
  },
  {
    numero: "04",
    titulo: "Pagá y listo",
    texto:
      "Checkout con Mercado Pago. Te mandamos el mockup final para que lo apruebes.",
  },
];

// Escalera de precios de la remera clásica con una estampa de 1 color al frente.
const EJEMPLO = priceLadder({
  productId: "remera-clasica",
  colorId: "negro",
  method: "serigrafia",
  locations: [{ location: "frente", colors: 1, areaCm2: 600 }],
  quantities: {},
});

export default function HomePage() {
  return (
    <>
      {/* Hero ------------------------------------------------------------- */}
      <section className="border-b border-line">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:py-24">
          <div>
            <span className="inline-flex items-center rounded-full bg-brote-soft px-3 py-1 text-xs font-semibold text-brote-dark">
              Serigrafía y DTF · Hecho en Argentina
            </span>
            <h1 className="mt-5 font-display text-5xl leading-[0.95] sm:text-7xl">
              Tu remera,
              <br />
              como la tenés
              <br />
              en la cabeza.
            </h1>
            <p className="mt-6 max-w-md text-lg leading-relaxed text-ink-soft">
              Diseñala online, mirá cuánto sale mientras la armás y compralá sin
              pedir presupuesto ni esperar respuestas.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/disenar"
                className="rounded-full bg-ink px-7 py-3.5 text-base font-semibold text-paper transition-colors hover:bg-brote-dark"
              >
                Diseñar ahora
              </Link>
              <Link
                href="/productos"
                className="rounded-full border border-line bg-surface px-7 py-3.5 text-base font-semibold transition-colors hover:border-ink"
              >
                Ver productos
              </Link>
            </div>
            <p className="mt-6 text-sm text-ink-muted">
              Desde 1 prenda · Sin costo de diseño · Mockup antes de imprimir
            </p>
          </div>

          <div className="bg-taller relative rounded-card border border-line p-6">
            <div className="grid grid-cols-2 gap-4">
              {[
                { color: "#141414", shade: "oscura" as const, id: "hero-a" },
                { color: "#86b23c", shade: "clara" as const, id: "hero-b" },
                { color: "#f7f5ef", shade: "clara" as const, id: "hero-c" },
                { color: "#1e2a4a", shade: "oscura" as const, id: "hero-d" },
              ].map((item) => (
                <div
                  key={item.id}
                  className="rounded-lg bg-surface/70 p-2 shadow-[0_1px_2px_rgba(20,21,26,0.06)]"
                >
                  <GarmentPreview
                    id={item.id}
                    product={PRODUCTS[0]}
                    colorHex={item.color}
                    shade={item.shade}
                    className="h-auto w-full"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Pasos ------------------------------------------------------------ */}
      <section className="border-b border-line">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
          <h2 className="font-display text-3xl sm:text-4xl">Cómo funciona</h2>
          <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {PASOS.map((paso) => (
              <div key={paso.numero}>
                <span className="font-display text-4xl text-brote">{paso.numero}</span>
                <h3 className="mt-3 text-lg font-semibold">{paso.titulo}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                  {paso.texto}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Precios ---------------------------------------------------------- */}
      <section className="border-b border-line bg-paper-alt">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1fr_1.2fr]">
          <div>
            <h2 className="font-display text-3xl sm:text-4xl">
              Cuantas más, más barato
            </h2>
            <p className="mt-4 max-w-md leading-relaxed text-ink-soft">
              Precio por prenda de la remera clásica con una estampa de un color
              al frente. A partir de 50 unidades no cobramos la preparación de
              pantallas.
            </p>
            <div className="mt-6 space-y-3 text-sm">
              {Object.values(PRINT_METHODS).map((metodo) => (
                <div key={metodo.key} className="rounded-xl border border-line bg-surface p-4">
                  <h3 className="font-semibold">{metodo.name}</h3>
                  <p className="mt-1 text-ink-soft">{metodo.bestFor}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="overflow-hidden rounded-card border border-line bg-surface">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs uppercase tracking-wider text-ink-muted">
                  <th className="px-5 py-3 font-semibold">Cantidad</th>
                  <th className="px-5 py-3 text-right font-semibold">
                    Precio por prenda
                  </th>
                </tr>
              </thead>
              <tbody>
                {EJEMPLO.map((row) => (
                  <tr key={row.minQty} className="border-b border-line last:border-0">
                    <td className="px-5 py-3">{row.label} unidades</td>
                    <td className="px-5 py-3 text-right font-semibold">
                      {money(row.unitPrice)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="px-5 py-4 text-xs text-ink-muted">
              Precios finales con IVA. El diseñador te muestra el total exacto
              según tu diseño.
            </p>
          </div>
        </div>
      </section>

      {/* Productos -------------------------------------------------------- */}
      <section>
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
          <div className="flex items-end justify-between gap-4">
            <h2 className="font-display text-3xl sm:text-4xl">Las prendas</h2>
            <Link
              href="/productos"
              className="text-sm underline underline-offset-2 hover:text-brote-dark"
            >
              Ver todas
            </Link>
          </div>

          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {PRODUCTS.map((product) => (
              <Link
                key={product.id}
                href="/disenar"
                className="group rounded-card border border-line bg-surface p-5 transition-colors hover:border-ink"
              >
                <div className="bg-taller rounded-lg p-4">
                  <GarmentPreview
                    id={`card-${product.id}`}
                    product={product}
                    colorHex="#ffffff"
                    shade="clara"
                    seam="#e6e6e6"
                    className="h-auto w-full"
                  />
                </div>
                <h3 className="mt-4 font-semibold">{product.name}</h3>
                <p className="mt-1 text-sm text-ink-muted">{product.fabric}</p>
                <p className="mt-3 text-sm">
                  desde{" "}
                  <span className="font-display text-xl">
                    {money(product.basePrice)}
                  </span>
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

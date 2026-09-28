import type { Metadata } from "next";
import { Fragment } from "react";

import { PriceSimulator } from "@/components/admin/PriceSimulator";
import { AdminPageHeader, Card, DataRow } from "@/components/admin/ui";
import { PRODUCTS, SIZE_ORDER } from "@/lib/catalog";
import { money } from "@/lib/format";
import {
  priceLadder,
  RUSH_SURCHARGE,
  SCREEN_SETUP_FREE_FROM,
  SCREEN_SETUP_PER_COLOR,
  TIER_LABELS,
} from "@/lib/pricing";

export const metadata: Metadata = { title: "Precios" };

/**
 * Referencia de precios + cotizador de mostrador.
 *
 * Es de sólo lectura a propósito: la lista de precios vive en
 * `src/lib/pricing.ts` porque es código versionado y el motor tiene que correr
 * igual en el navegador y en el servidor. Un panel que la editara en caliente
 * rompería esa garantía.
 */
export default function AdminPricesPage() {
  /** Precio de referencia: frente, un color, para comparar productos. */
  const reference = PRODUCTS.map((product) => ({
    product,
    serigrafia: priceLadder({
      productId: product.id,
      colorId: product.colors[0].id,
      method: "serigrafia",
      quantities: {},
      locations: [{ location: "frente", colors: 1, areaCm2: 600 }],
    }),
    dtf: priceLadder({
      productId: product.id,
      colorId: product.colors[0].id,
      method: "dtf",
      quantities: {},
      locations: [{ location: "frente", colors: 4, areaCm2: 600 }],
    }),
  }));

  return (
    <>
      <AdminPageHeader
        title="Precios"
        description="El cotizador usa el mismo motor que el diseñador y que el checkout. La lista de precios se edita en src/lib/pricing.ts."
      />

      <Card
        title="Cotizador de mostrador"
        description="Para responder un presupuesto por teléfono o WhatsApp sin armar el diseño."
        className="mb-6"
      >
        <PriceSimulator />
      </Card>

      <Card
        title="Precio por prenda de referencia"
        description="Frente, una estampa de 20 × 30 cm. Serigrafía a 1 color y DTF full color, con la preparación de pantallas prorrateada."
        className="mb-6"
        padded={false}
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-right text-sm">
            <thead className="border-b border-line text-xs uppercase tracking-wide text-ink-muted">
              <tr>
                <th scope="col" className="px-5 py-3 text-left font-semibold">
                  Producto
                </th>
                {TIER_LABELS.map((label) => (
                  <th key={label} scope="col" className="px-3 py-3 font-semibold">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {reference.map((row) => (
                <Fragment key={row.product.id}>
                  <tr className="border-b border-line">
                    <th scope="row" className="px-5 py-2.5 text-left font-medium">
                      {row.product.name}
                      <span className="block text-xs font-normal text-ink-muted">
                        Serigrafía 1 color
                      </span>
                    </th>
                    {row.serigrafia.map((step) => (
                      <td key={step.minQty} className="px-3 py-2.5 tabular-nums">
                        {money(step.unitPrice)}
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b border-line">
                    <th scope="row" className="px-5 py-2.5 text-left font-normal text-ink-muted">
                      <span className="text-xs">DTF full color</span>
                    </th>
                    {row.dtf.map((step) => (
                      <td
                        key={step.minQty}
                        className="px-3 py-2.5 tabular-nums text-ink-muted"
                      >
                        {money(step.unitPrice)}
                      </td>
                    ))}
                  </tr>
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Reglas que aplican a todo">
          <dl>
            <DataRow label="Preparación de pantalla">
              {money(SCREEN_SETUP_PER_COLOR)} por color y ubicación
            </DataRow>
            <DataRow label="Pantallas bonificadas">
              desde {SCREEN_SETUP_FREE_FROM} prendas
            </DataRow>
            <DataRow label="Recargo exprés">
              {Math.round(RUSH_SURCHARGE * 100)}% sobre prenda y estampa
            </DataRow>
            <DataRow label="DTF">
              por cm² de arte, sin costo de preparación
            </DataRow>
          </dl>
        </Card>

        <Card title="Recargo por talle">
          <dl>
            {SIZE_ORDER.map((size) => {
              const upcharge = PRODUCTS[0].sizes.find((entry) => entry.key === size);
              return (
                <DataRow key={size} label={size}>
                  {upcharge && upcharge.upcharge > 0
                    ? `+ ${money(upcharge.upcharge)}`
                    : "sin recargo"}
                </DataRow>
              );
            })}
          </dl>
        </Card>

        <Card title="Mínimos por producto" className="lg:col-span-2">
          <dl>
            {PRODUCTS.map((product) => (
              <DataRow key={product.id} label={product.name}>
                mínimo {product.minQty}{" "}
                {product.minQty === 1 ? "prenda" : "prendas"} · base{" "}
                {money(product.basePrice)} · {product.colors.length} colores ·{" "}
                {product.locations.length} ubicaciones
              </DataRow>
            ))}
          </dl>
        </Card>
      </div>

      <p className="mt-6 rounded-card border border-dashed border-line px-5 py-4 text-sm leading-relaxed text-ink-muted">
        Para cambiar la lista de precios se editan los arrays de arriba de{" "}
        <code>src/lib/pricing.ts</code> y el catálogo en{" "}
        <code>src/lib/catalog.ts</code>. Están en código a propósito: el mismo
        motor corre en el navegador y en el servidor, y el precio que se cobra
        siempre se recalcula en el servidor sobre el diseño guardado.
      </p>
    </>
  );
}

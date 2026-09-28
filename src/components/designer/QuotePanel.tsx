"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { PRINT_METHODS, SIZE_ORDER, type SizeKey } from "@/lib/catalog";
import { useCart } from "@/lib/cart-store";
import { useDesigner } from "@/lib/designer-store";
import { money } from "@/lib/format";
import { RUSH_SURCHARGE, SCREEN_SETUP_FREE_FROM } from "@/lib/pricing";
import { Badge, Button, cx, Segmented } from "@/components/ui";

import { renderArtwork, renderMockup, viewHasArt } from "./render-mockup";
import { useDesignQuote } from "./use-quote";

export function QuotePanel() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showLadder, setShowLadder] = useState(false);

  const method = useDesigner((s) => s.method);
  const setMethod = useDesigner((s) => s.setMethod);
  const rush = useDesigner((s) => s.rush);
  const setRush = useDesigner((s) => s.setRush);
  const quantities = useDesigner((s) => s.quantities);
  const setQuantity = useDesigner((s) => s.setQuantity);

  const addToCartStore = useCart((s) => s.add);
  const { product, color, doc, meta, quote, ladder } = useDesignQuote();

  if (!product || !color || !quote) return null;

  const hasArt = meta.totalObjects > 0;
  const canAdd = hasArt && quote.totalQuantity > 0 && !saving;

  const addToCart = async () => {
    setError(null);
    setSaving(true);
    try {
      const previews: Record<string, string> = {};
      for (const view of ["frente", "espalda"] as const) {
        if (viewHasArt(doc, product, view)) {
          previews[view] = await renderMockup({ doc, product, color, view });
        }
      }

      const artwork: Array<{ location: string; dataUrl: string }> = [];
      for (const location of product.locations) {
        const rendered = await renderArtwork(doc, product, location.key);
        if (rendered) {
          artwork.push({ location: location.key, dataUrl: rendered.dataUrl });
        }
      }

      const response = await fetch("/api/designs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ doc, quantities, previews, artwork }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error ?? "No pudimos guardar el diseño.");
      }

      addToCartStore({
        designId: payload.designId,
        productId: product.id,
        productName: product.name,
        colorId: color.id,
        colorName: color.name,
        method: doc.method,
        rush: doc.rush,
        quantities,
        totalQuantity: payload.quote.totalQuantity,
        previewUrl: payload.previewFrontUrl ?? payload.previewBackUrl ?? null,
        unitPrice: payload.quote.averageUnitPrice,
        subtotal: payload.quote.total,
      });

      router.push("/carrito");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Algo salió mal.");
      setSaving(false);
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="scroll-slim flex-1 overflow-y-auto">
        {/* Método de estampado ------------------------------------------- */}
        <section className="border-b border-line px-4 py-5">
          <h3 className="mb-3 text-sm font-semibold">Técnica de estampado</h3>
          <Segmented
            value={method}
            onChange={setMethod}
            options={[
              { value: "serigrafia", label: "Serigrafía" },
              { value: "dtf", label: "DTF full color" },
            ]}
          />
          <p className="mt-2.5 text-xs leading-relaxed text-ink-muted">
            {PRINT_METHODS[method].description}
          </p>
        </section>

        {/* Ubicaciones ---------------------------------------------------- */}
        {quote.locationLines.length > 0 && (
          <section className="border-b border-line px-4 py-5">
            <h3 className="mb-3 text-sm font-semibold">Estampas</h3>
            <ul className="space-y-2">
              {quote.locationLines.map((line) => {
                const locationMeta = meta.locations.find(
                  (l) => l.location === line.location,
                );
                return (
                  <li
                    key={line.location}
                    className="flex items-start justify-between gap-3 text-xs"
                  >
                    <div>
                      <span className="font-medium text-ink">{line.label}</span>
                      <span className="mt-0.5 block text-ink-muted">
                        {method === "serigrafia"
                          ? `${line.colors} ${line.colors === 1 ? "color" : "colores"}`
                          : `${locationMeta?.widthCm ?? 0} × ${locationMeta?.heightCm ?? 0} cm`}
                      </span>
                      {locationMeta?.overflows && (
                        <span className="mt-1 block text-alerta">
                          El arte se sale del área imprimible.
                        </span>
                      )}
                    </div>
                    <span className="whitespace-nowrap text-ink-soft">
                      {money(line.unitPrice)}/prenda
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {/* Talles --------------------------------------------------------- */}
        <section className="border-b border-line px-4 py-5">
          <div className="mb-3 flex items-baseline justify-between">
            <h3 className="text-sm font-semibold">Talles y cantidades</h3>
            <span className="text-xs text-ink-muted">
              {quote.totalQuantity} {quote.totalQuantity === 1 ? "prenda" : "prendas"}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {SIZE_ORDER.map((size) => {
              const definition = product.sizes.find((s) => s.key === size);
              return (
                <label key={size} className="block">
                  <span className="mb-1 flex items-baseline gap-1 text-xs font-medium">
                    {size}
                    {definition && definition.upcharge > 0 && (
                      <span className="text-[10px] text-ink-muted">
                        +{money(definition.upcharge)}
                      </span>
                    )}
                  </span>
                  <input
                    type="number"
                    min={0}
                    inputMode="numeric"
                    value={quantities[size as SizeKey] ?? ""}
                    placeholder="0"
                    onChange={(event) =>
                      setQuantity(size, Number(event.target.value))
                    }
                    className="h-10 w-full rounded-lg border border-line bg-surface px-2 text-center text-sm outline-none transition-colors focus:border-ink"
                  />
                </label>
              );
            })}
          </div>

          {quote.nextTierAt !== null && quote.nextTierUnitPrice !== null && (
            <p className="mt-3 rounded-lg bg-brote-soft px-3 py-2 text-xs text-brote-dark">
              Llevando {quote.nextTierAt} prendas el precio baja a{" "}
              <strong>{money(quote.nextTierUnitPrice)}</strong> por unidad.
            </p>
          )}

          <button
            type="button"
            onClick={() => setShowLadder((value) => !value)}
            className="mt-3 text-xs font-medium text-ink-soft underline-offset-2 hover:underline"
          >
            {showLadder ? "Ocultar" : "Ver"} precios por cantidad
          </button>

          {showLadder && (
            <table className="mt-2 w-full text-xs">
              <tbody>
                {ladder.map((row) => (
                  <tr
                    key={row.minQty}
                    className={cx(
                      "border-b border-line last:border-0",
                      row.current && "font-semibold text-ink",
                    )}
                  >
                    <td className="py-1.5 text-ink-muted">{row.label}</td>
                    <td className="py-1.5 text-right">{money(row.unitPrice)} c/u</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        {/* Exprés --------------------------------------------------------- */}
        <section className="border-b border-line px-4 py-5">
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={rush}
              onChange={(event) => setRush(event.target.checked)}
              className="mt-0.5 h-4 w-4 accent-ink"
            />
            <span className="text-xs">
              <span className="block text-sm font-medium">Producción exprés</span>
              <span className="text-ink-muted">
                Listo en 48 h hábiles. Recargo del {Math.round(RUSH_SURCHARGE * 100)}%.
              </span>
            </span>
          </label>
        </section>

        {/* Detalle -------------------------------------------------------- */}
        <section className="px-4 py-5">
          <h3 className="mb-3 text-sm font-semibold">Detalle</h3>
          <dl className="space-y-1.5 text-xs">
            <div className="flex justify-between">
              <dt className="text-ink-muted">Prenda ({quote.tierLabel} u.)</dt>
              <dd>{money(quote.garmentUnitPrice)} c/u</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-muted">Estampa</dt>
              <dd>{money(quote.printUnitPrice)} c/u</dd>
            </div>
            {quote.sizeLines.some((line) => line.upcharge > 0) && (
              <div className="flex justify-between">
                <dt className="text-ink-muted">Recargo talles grandes</dt>
                <dd>
                  {money(
                    quote.sizeLines.reduce(
                      (acc, line) => acc + line.upcharge * line.quantity,
                      0,
                    ),
                  )}
                </dd>
              </div>
            )}
            {rush && (
              <div className="flex justify-between">
                <dt className="text-ink-muted">Exprés</dt>
                <dd>{money(quote.rushSurcharge)}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-ink-muted">
                Preparación de pantallas
                {quote.setupTotal === 0 && method === "serigrafia" && (
                  <span className="ml-1">
                    <Badge tone="brote">bonificada</Badge>
                  </span>
                )}
              </dt>
              <dd>{money(quote.setupTotal)}</dd>
            </div>
          </dl>

          {method === "serigrafia" &&
            quote.setupTotal > 0 &&
            quote.totalQuantity > 0 && (
              <p className="mt-2 text-[11px] leading-relaxed text-ink-muted">
                A partir de {SCREEN_SETUP_FREE_FROM} prendas no cobramos la
                preparación de pantallas.
              </p>
            )}

          {quote.warnings.map((warning) => (
            <p key={warning} className="mt-2 text-[11px] text-alerta">
              {warning}
            </p>
          ))}
        </section>
      </div>

      {/* Total + CTA ------------------------------------------------------ */}
      <div className="border-t border-line bg-surface px-4 py-4">
        <div className="flex items-end justify-between">
          <div>
            <span className="block text-xs text-ink-muted">Total</span>
            <span className="font-display text-3xl leading-none">
              {money(quote.total)}
            </span>
          </div>
          {quote.totalQuantity > 0 && (
            <span className="text-right text-xs text-ink-muted">
              {money(quote.averageUnitPrice)}
              <br />
              por prenda
            </span>
          )}
        </div>

        {error && <p className="mt-2 text-xs text-alerta">{error}</p>}

        <Button
          size="lg"
          className="mt-3 w-full"
          disabled={!canAdd}
          onClick={() => void addToCart()}
        >
          {saving ? "Guardando diseño…" : "Agregar al carrito"}
        </Button>
        <p className="mt-2 text-center text-[11px] text-ink-muted">
          Precio final con IVA. Revisás todo antes de pagar.
        </p>
      </div>
    </div>
  );
}

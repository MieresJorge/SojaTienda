"use client";

import { useState } from "react";

import { Field, Segmented, cx, inputClass } from "@/components/ui";
import {
  PRODUCTS,
  SIZE_ORDER,
  type LocationKey,
  type PrintMethod,
  type SizeKey,
} from "@/lib/catalog";
import { money } from "@/lib/format";
import { buildQuote, priceLadder } from "@/lib/pricing";

/**
 * Cotizador de mostrador: para responder "¿cuánto me sale?" por teléfono sin
 * tener que armar el diseño.
 *
 * Usa `buildQuote` de src/lib/pricing.ts, el mismo motor puro que corre en el
 * diseñador y en el servidor. No hay una segunda lista de precios escondida
 * acá: si cambia pricing.ts, esto cambia solo.
 */

interface LocationDraft {
  key: LocationKey;
  label: string;
  active: boolean;
  colors: number;
  widthCm: number;
  heightCm: number;
}

const INITIAL_LOCATIONS: LocationDraft[] = [
  { key: "frente", label: "Frente", active: true, colors: 2, widthCm: 25, heightCm: 30 },
  { key: "espalda", label: "Espalda", active: false, colors: 1, widthCm: 25, heightCm: 30 },
  { key: "manga_izq", label: "Manga izq.", active: false, colors: 1, widthCm: 8, heightCm: 8 },
  { key: "manga_der", label: "Manga der.", active: false, colors: 1, widthCm: 8, heightCm: 8 },
];

export function PriceSimulator() {
  const [productId, setProductId] = useState(PRODUCTS[0].id);
  const [method, setMethod] = useState<PrintMethod>("serigrafia");
  const [rush, setRush] = useState(false);
  const [quantities, setQuantities] = useState<Partial<Record<SizeKey, number>>>({
    M: 12,
  });
  const [locations, setLocations] = useState(INITIAL_LOCATIONS);

  const active = locations.filter((location) => location.active);
  const input = {
    productId,
    colorId: PRODUCTS.find((product) => product.id === productId)!.colors[0].id,
    method,
    rush,
    quantities,
    locations: active.map((location) => ({
      location: location.key,
      colors: location.colors,
      areaCm2: location.widthCm * location.heightCm,
    })),
  };

  const quote = buildQuote(input);
  const ladder = priceLadder(input);

  function setLocation(key: LocationKey, patch: Partial<LocationDraft>) {
    setLocations((current) =>
      current.map((location) =>
        location.key === key ? { ...location, ...patch } : location,
      ),
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
      <div className="space-y-5">
        <Field label="Producto">
          <select
            value={productId}
            onChange={(event) => setProductId(event.target.value)}
            className={inputClass}
          >
            {PRODUCTS.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name} · base {money(product.basePrice)}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Técnica">
          <Segmented
            value={method}
            onChange={setMethod}
            options={[
              { value: "serigrafia", label: "Serigrafía" },
              { value: "dtf", label: "DTF" },
            ]}
          />
        </Field>

        <Field label="Cantidades por talle">
          <div className="grid grid-cols-6 gap-1.5">
            {SIZE_ORDER.map((size) => (
              <label key={size} className="text-center">
                <span className="mb-1 block text-[11px] font-semibold text-ink-muted">
                  {size}
                </span>
                <input
                  type="number"
                  min={0}
                  max={9999}
                  value={quantities[size] ?? 0}
                  onChange={(event) =>
                    setQuantities((current) => ({
                      ...current,
                      [size]: Math.max(0, Number(event.target.value) || 0),
                    }))
                  }
                  className={`${inputClass} px-1 text-center`}
                />
              </label>
            ))}
          </div>
        </Field>

        <fieldset>
          <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">
            Ubicaciones
          </legend>
          <div className="space-y-2">
            {locations.map((location) => (
              <div
                key={location.key}
                className={cx(
                  "rounded-lg border px-3 py-2 transition-colors",
                  location.active ? "border-ink" : "border-line",
                )}
              >
                <label className="flex items-center gap-2 text-sm font-medium">
                  <input
                    type="checkbox"
                    checked={location.active}
                    onChange={(event) =>
                      setLocation(location.key, { active: event.target.checked })
                    }
                  />
                  {location.label}
                </label>

                {location.active && (
                  <div className="mt-2 flex flex-wrap items-end gap-3 text-xs">
                    {method === "serigrafia" ? (
                      <label>
                        <span className="mb-1 block text-ink-muted">Colores</span>
                        <input
                          type="number"
                          min={1}
                          max={12}
                          value={location.colors}
                          onChange={(event) =>
                            setLocation(location.key, {
                              colors: Math.max(1, Number(event.target.value) || 1),
                            })
                          }
                          className={`${inputClass} w-20`}
                        />
                      </label>
                    ) : (
                      <>
                        <label>
                          <span className="mb-1 block text-ink-muted">Ancho (cm)</span>
                          <input
                            type="number"
                            min={1}
                            value={location.widthCm}
                            onChange={(event) =>
                              setLocation(location.key, {
                                widthCm: Math.max(1, Number(event.target.value) || 1),
                              })
                            }
                            className={`${inputClass} w-24`}
                          />
                        </label>
                        <label>
                          <span className="mb-1 block text-ink-muted">Alto (cm)</span>
                          <input
                            type="number"
                            min={1}
                            value={location.heightCm}
                            onChange={(event) =>
                              setLocation(location.key, {
                                heightCm: Math.max(1, Number(event.target.value) || 1),
                              })
                            }
                            className={`${inputClass} w-24`}
                          />
                        </label>
                      </>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </fieldset>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={rush}
            onChange={(event) => setRush(event.target.checked)}
          />
          Producción exprés (48 h hábiles)
        </label>
      </div>

      <div className="space-y-4">
        <div className="rounded-card border border-line bg-paper-alt p-5">
          <span className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
            Total
          </span>
          <p className="mt-1 font-display text-4xl leading-none">{money(quote.total)}</p>
          <p className="mt-2 text-sm text-ink-soft">
            {quote.totalQuantity} {quote.totalQuantity === 1 ? "prenda" : "prendas"} ·{" "}
            {money(quote.averageUnitPrice)} por prenda · escalón {quote.tierLabel}
          </p>
        </div>

        <dl className="space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-ink-muted">Prenda lisa (por unidad)</dt>
            <dd>{money(quote.garmentUnitPrice)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-ink-muted">Estampa (por unidad)</dt>
            <dd>{money(quote.printUnitPrice)}</dd>
          </div>
          {quote.locationLines.map((line) => (
            <div key={line.location} className="flex justify-between pl-4 text-xs">
              <dt className="text-ink-muted">
                {line.label} · {line.colors}{" "}
                {line.colors === 1 ? "color" : "colores"}
                {line.areaCm2 > 0 && method === "dtf" && ` · ${line.areaCm2} cm²`}
              </dt>
              <dd className="text-ink-muted">{money(line.unitPrice)}</dd>
            </div>
          ))}
          <div className="flex justify-between border-t border-line pt-2">
            <dt className="text-ink-muted">Prendas y estampa</dt>
            <dd>{money(quote.itemsSubtotal)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-ink-muted">
              Preparación de pantallas
              {quote.locationLines.some((line) => line.setupWaived) && " (bonificada)"}
            </dt>
            <dd>{money(quote.setupTotal)}</dd>
          </div>
          {rush && (
            <div className="flex justify-between">
              <dt className="text-ink-muted">Incluye recargo exprés</dt>
              <dd>{money(quote.rushSurcharge)}</dd>
            </div>
          )}
        </dl>

        {quote.warnings.length > 0 && (
          <ul className="space-y-2">
            {quote.warnings.map((warning) => (
              <li
                key={warning}
                className="rounded-lg bg-alerta/10 px-3 py-2 text-xs text-alerta"
              >
                {warning}
              </li>
            ))}
          </ul>
        )}

        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">
            Precio por prenda según cantidad
          </h3>
          <ul className="divide-y divide-line rounded-lg border border-line">
            {ladder.map((step) => (
              <li
                key={step.minQty}
                className={cx(
                  "flex justify-between px-3 py-1.5 text-sm",
                  step.current && "bg-brote-soft font-semibold text-brote-dark",
                )}
              >
                <span>{step.label} u.</span>
                <span className="tabular-nums">{money(step.unitPrice)}</span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-ink-muted">
            Incluye la preparación de pantallas prorrateada en cada escalón.
          </p>
        </div>
      </div>
    </div>
  );
}

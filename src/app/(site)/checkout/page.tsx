"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { useCart, useCartHydrated } from "@/lib/cart-store";
import { money } from "@/lib/format";
import { Button, cx, Field, inputClass } from "@/components/ui";

interface ServerTotals {
  itemsSubtotal: number;
  setupTotal: number;
  shippingCost: number;
  freeShippingFrom: number;
  total: number;
}

type ShippingMethod = "pickup" | "envio";

export default function CheckoutPage() {
  const router = useRouter();
  const items = useCart((state) => state.items);
  const hydrated = useCartHydrated();

  const [shippingMethod, setShippingMethod] = useState<ShippingMethod>("pickup");
  const [totals, setTotals] = useState<ServerTotals | null>(null);
  const [loadingTotals, setLoadingTotals] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    doc: "",
    street: "",
    city: "",
    state: "",
    zip: "",
    notes: "",
  });

  const update = (key: keyof typeof form) => (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => setForm((current) => ({ ...current, [key]: event.target.value }));

  useEffect(() => {
    if (!hydrated) return;
    if (items.length === 0) {
      router.replace("/carrito");
      return;
    }

    let cancelled = false;
    void fetch("/api/quote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: items.map((item) => ({
          designId: item.designId,
          quantities: item.quantities,
        })),
        shippingMethod,
      }),
    })
      .then(async (response) => {
        const payload = await response.json();
        if (cancelled) return;
        if (!response.ok) throw new Error(payload?.error ?? "Error al cotizar.");
        setTotals(payload);
        setError(null);
      })
      .catch((cause: unknown) => {
        if (!cancelled) {
          setError(cause instanceof Error ? cause.message : "Error al cotizar.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingTotals(false);
      });

    return () => {
      cancelled = true;
    };
  }, [hydrated, items, shippingMethod, router]);

  /** Cambiar el envío vuelve a pedir los totales al servidor. */
  const chooseShipping = (method: ShippingMethod) => {
    if (method === shippingMethod) return;
    setShippingMethod(method);
    setTotals(null);
    setLoadingTotals(true);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((item) => ({
            designId: item.designId,
            quantities: item.quantities,
          })),
          customer: {
            name: form.name,
            email: form.email,
            phone: form.phone,
            doc: form.doc,
          },
          shipping:
            shippingMethod === "pickup"
              ? { method: "pickup" }
              : {
                  method: "envio",
                  street: form.street,
                  city: form.city,
                  state: form.state,
                  zip: form.zip,
                },
          notes: form.notes,
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error ?? "No pudimos procesar el pedido.");
      }

      // Checkout Pro es un dominio externo; el modo simulado es una ruta interna.
      if (payload.redirectUrl.startsWith("http")) {
        window.location.href = payload.redirectUrl;
      } else {
        router.push(payload.redirectUrl);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Algo salió mal.");
      setSubmitting(false);
    }
  };

  if (!hydrated || items.length === 0) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
        <div className="h-40 animate-pulse rounded-xl bg-paper-alt" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <h1 className="font-display text-4xl">Finalizar compra</h1>

      <form onSubmit={submit} className="mt-8 grid gap-8 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <section className="rounded-card border border-line bg-surface p-5">
            <h2 className="mb-4 text-sm font-semibold">Tus datos</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Nombre y apellido">
                <input
                  required
                  minLength={2}
                  value={form.name}
                  onChange={update("name")}
                  className={inputClass}
                  autoComplete="name"
                />
              </Field>
              <Field label="Email">
                <input
                  required
                  type="email"
                  value={form.email}
                  onChange={update("email")}
                  className={inputClass}
                  autoComplete="email"
                />
              </Field>
              <Field label="WhatsApp">
                <input
                  required
                  value={form.phone}
                  onChange={update("phone")}
                  className={inputClass}
                  placeholder="11 5555 5555"
                  autoComplete="tel"
                />
              </Field>
              <Field label="DNI o CUIT" hint="opcional">
                <input value={form.doc} onChange={update("doc")} className={inputClass} />
              </Field>
            </div>
          </section>

          <section className="rounded-card border border-line bg-surface p-5">
            <h2 className="mb-4 text-sm font-semibold">Entrega</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {(
                [
                  {
                    value: "pickup" as const,
                    title: "Retiro en el taller",
                    detail: "Sin cargo · CABA, lunes a viernes de 10 a 18",
                  },
                  {
                    value: "envio" as const,
                    title: "Envío a domicilio",
                    detail: "A todo el país · 3 a 6 días hábiles",
                  },
                ]
              ).map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => chooseShipping(option.value)}
                  className={cx(
                    "rounded-xl border p-4 text-left transition-colors",
                    shippingMethod === option.value
                      ? "border-ink bg-paper"
                      : "border-line hover:border-ink-muted",
                  )}
                >
                  <span className="block text-sm font-semibold">{option.title}</span>
                  <span className="mt-1 block text-xs text-ink-muted">
                    {option.detail}
                  </span>
                </button>
              ))}
            </div>

            {shippingMethod === "envio" && (
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Field label="Dirección">
                    <input
                      required
                      value={form.street}
                      onChange={update("street")}
                      className={inputClass}
                      placeholder="Calle, número, piso y depto"
                      autoComplete="street-address"
                    />
                  </Field>
                </div>
                <Field label="Localidad">
                  <input
                    required
                    value={form.city}
                    onChange={update("city")}
                    className={inputClass}
                  />
                </Field>
                <Field label="Provincia">
                  <input
                    required
                    value={form.state}
                    onChange={update("state")}
                    className={inputClass}
                  />
                </Field>
                <Field label="Código postal">
                  <input
                    required
                    value={form.zip}
                    onChange={update("zip")}
                    className={inputClass}
                  />
                </Field>
              </div>
            )}
          </section>

          <section className="rounded-card border border-line bg-surface p-5">
            <Field label="Aclaraciones para el taller" hint="opcional">
              <textarea
                rows={3}
                value={form.notes}
                onChange={update("notes")}
                className={cx(inputClass, "resize-none")}
                placeholder="Fecha en la que lo necesitás, referencias de color, etc."
              />
            </Field>
          </section>
        </div>

        <aside className="h-fit rounded-card border border-line bg-surface p-5 lg:sticky lg:top-24">
          <h2 className="text-sm font-semibold">Resumen del pedido</h2>

          {loadingTotals || !totals ? (
            <div className="mt-4 h-24 animate-pulse rounded-lg bg-paper-alt" />
          ) : (
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-ink-muted">Prendas y estampa</dt>
                <dd>{money(totals.itemsSubtotal)}</dd>
              </div>
              {totals.setupTotal > 0 && (
                <div className="flex justify-between">
                  <dt className="text-ink-muted">Preparación de pantallas</dt>
                  <dd>{money(totals.setupTotal)}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-ink-muted">Envío</dt>
                <dd>
                  {totals.shippingCost === 0 ? "Sin cargo" : money(totals.shippingCost)}
                </dd>
              </div>
              <div className="flex justify-between border-t border-line pt-3 text-base font-semibold">
                <dt>Total</dt>
                <dd className="font-display text-2xl">{money(totals.total)}</dd>
              </div>
            </dl>
          )}

          {error && <p className="mt-3 text-xs text-alerta">{error}</p>}

          <Button
            type="submit"
            size="lg"
            className="mt-5 w-full"
            disabled={submitting || loadingTotals}
          >
            {submitting ? "Redirigiendo…" : "Pagar con Mercado Pago"}
          </Button>

          <p className="mt-3 text-[11px] leading-relaxed text-ink-muted">
            Te vamos a llevar a Mercado Pago para completar el pago. Podés pagar
            con tarjeta, dinero en cuenta o transferencia.
          </p>
        </aside>
      </form>
    </div>
  );
}

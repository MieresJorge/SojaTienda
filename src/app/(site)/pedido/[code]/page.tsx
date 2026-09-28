import Link from "next/link";
import { notFound } from "next/navigation";

import { ClearCart } from "@/components/ClearCart";
import { PRINT_METHODS, SIZE_ORDER, type PrintMethod, type SizeKey } from "@/lib/catalog";
import { formatDate, money } from "@/lib/format";
import { getPayment, mapPaymentStatus, paymentsEnabled } from "@/server/mercadopago";
import { getSettings } from "@/server/settings";
import { findOrderByCode, markOrderStatus } from "@/server/orders";
import { Badge } from "@/components/ui";

export const dynamic = "force-dynamic";

const STATUS_COPY: Record<
  string,
  { label: string; tone: "neutral" | "brote" | "alerta"; detail: string }
> = {
  draft: {
    label: "Pendiente de pago",
    tone: "neutral",
    detail: "Todavía no recibimos el pago.",
  },
  pending: {
    label: "Esperando el pago",
    tone: "neutral",
    detail:
      "Si pagaste con transferencia o efectivo puede tardar unos minutos en acreditarse.",
  },
  paid: {
    label: "Pago acreditado",
    tone: "brote",
    detail:
      "Ya estamos preparando tu pedido. Te mandamos el mockup final por mail para que lo apruebes antes de imprimir.",
  },
  in_production: {
    label: "En producción",
    tone: "brote",
    detail: "Tus prendas ya están en el taller.",
  },
  ready: {
    label: "Listo",
    tone: "brote",
    detail:
      "Tu pedido ya está terminado. Si elegiste retiro, pasá cuando quieras; si es envío, lo despachamos en las próximas horas.",
  },
  shipped: {
    label: "Enviado",
    tone: "brote",
    detail: "Tu pedido va en camino.",
  },
  delivered: { label: "Entregado", tone: "brote", detail: "¡Listo! Gracias." },
  failed: {
    label: "Pago rechazado",
    tone: "alerta",
    detail: "El pago no se pudo procesar. Podés intentarlo de nuevo desde el carrito.",
  },
  cancelled: {
    label: "Cancelado",
    tone: "alerta",
    detail: "Este pedido fue cancelado o devuelto.",
  },
};

export default async function PedidoPage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { code } = await params;
  const query = await searchParams;

  let order = await findOrderByCode(code.toUpperCase());
  if (!order) notFound();

  /**
   * En local no hay webhook público, así que si Mercado Pago nos devolvió con
   * un payment_id confirmamos el estado consultando la API directamente.
   */
  const paymentId = typeof query.payment_id === "string" ? query.payment_id : null;
  if (paymentsEnabled() && paymentId && order.status !== "paid") {
    try {
      const payment = await getPayment(paymentId);
      if (payment.external_reference === order.id) {
        await markOrderStatus(order.id, mapPaymentStatus(payment.status), {
          id: String(payment.id ?? paymentId),
          status: payment.status,
          raw: payment,
        });
        order = await findOrderByCode(code.toUpperCase());
      }
    } catch (error) {
      console.error("[pedido] no se pudo confirmar el pago", error);
    }
  }

  if (!order) notFound();
  const status = STATUS_COPY[order.status] ?? STATUS_COPY.pending;
  const paid = order.status === "paid" || order.status === "in_production";
  const settings = await getSettings();

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      {paid && <ClearCart />}

      <div className="rounded-card border border-line bg-surface p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <span className="text-xs uppercase tracking-wider text-ink-muted">
              Pedido
            </span>
            <h1 className="font-display text-4xl">{order.code}</h1>
            <p className="mt-1 text-sm text-ink-muted">
              {formatDate(order.createdAt)}
            </p>
          </div>
          <Badge tone={status.tone}>{status.label}</Badge>
        </div>

        <p className="mt-4 max-w-xl text-sm leading-relaxed text-ink-soft">
          {status.detail}
        </p>

        {order.mpStatus === "simulado" && (
          <p className="mt-4 rounded-lg bg-brote-soft px-4 py-3 text-xs text-brote-dark">
            Este pedido se creó en <strong>modo simulado</strong> porque todavía no
            hay credenciales de Mercado Pago cargadas. Configurá{" "}
            <code>MP_ACCESS_TOKEN</code> para cobrar de verdad.
          </p>
        )}
      </div>

      <section className="mt-6 rounded-card border border-line bg-surface p-6 sm:p-8">
        <h2 className="text-sm font-semibold">Qué pediste</h2>
        <ul className="mt-4 space-y-5">
          {order.items.map((item) => {
            const quantities = JSON.parse(item.quantities) as Partial<
              Record<SizeKey, number>
            >;
            const preview = item.design.previewFrontUrl ?? item.design.previewBackUrl;
            return (
              <li key={item.id} className="flex gap-4">
                <div className="grid h-28 w-24 shrink-0 place-items-center overflow-hidden rounded-lg bg-paper-alt">
                  {preview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={preview}
                      alt={`Mockup de ${item.productName}`}
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <span className="text-xs text-ink-muted">sin vista</span>
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">{item.productName}</h3>
                  <p className="mt-1 text-sm text-ink-soft">
                    {PRINT_METHODS[item.method as PrintMethod]?.name ?? item.method}
                    {item.rush && " · exprés"}
                  </p>
                  <p className="mt-1 text-sm text-ink-muted">
                    {SIZE_ORDER.filter((size) => (quantities[size] ?? 0) > 0)
                      .map((size) => `${size}×${quantities[size]}`)
                      .join(" · ")}
                  </p>
                </div>
                <span className="font-display text-xl">{money(item.subtotal)}</span>
              </li>
            );
          })}
        </ul>

        <dl className="mt-6 space-y-2 border-t border-line pt-5 text-sm">
          <div className="flex justify-between">
            <dt className="text-ink-muted">Prendas y estampa</dt>
            <dd>{money(order.itemsSubtotal)}</dd>
          </div>
          {order.setupTotal > 0 && (
            <div className="flex justify-between">
              <dt className="text-ink-muted">Preparación de pantallas</dt>
              <dd>{money(order.setupTotal)}</dd>
            </div>
          )}
          <div className="flex justify-between">
            <dt className="text-ink-muted">
              {order.shippingMethod === "pickup" ? "Retiro en taller" : "Envío"}
            </dt>
            <dd>
              {order.shippingCost === 0 ? "Sin cargo" : money(order.shippingCost)}
            </dd>
          </div>
          <div className="flex justify-between border-t border-line pt-3 text-base font-semibold">
            <dt>Total</dt>
            <dd className="font-display text-2xl">{money(order.total)}</dd>
          </div>
        </dl>
      </section>

      <section className="mt-6 rounded-card border border-line bg-surface p-6 text-sm sm:p-8">
        <h2 className="mb-4 text-sm font-semibold">Entrega</h2>
        {order.trackingCode && (
          <p className="mb-4 rounded-lg bg-brote-soft px-4 py-3 text-brote-dark">
            <span className="block text-xs font-semibold uppercase tracking-wide">
              Código de seguimiento
            </span>
            <strong className="text-base">{order.trackingCode}</strong>
          </p>
        )}
        {order.shippingMethod === "pickup" ? (
          <p className="text-ink-soft">
            Retirás por el taller
            {settings.pickupAddress ? ` (${settings.pickupAddress})` : ""}. Te avisamos
            por mail y WhatsApp cuando esté listo.
          </p>
        ) : (
          <p className="text-ink-soft">
            {order.addressStreet}
            <br />
            {order.addressCity}, {order.addressState} ({order.addressZip})
          </p>
        )}
        <p className="mt-4 text-ink-muted">
          A nombre de {order.customerName} · {order.customerEmail} ·{" "}
          {order.customerPhone}
        </p>
        {order.notes && (
          <p className="mt-4 rounded-lg bg-paper-alt px-4 py-3 text-ink-soft">
            {order.notes}
          </p>
        )}
      </section>

      <div className="mt-8 text-center text-sm">
        <Link href="/disenar" className="underline underline-offset-2">
          Diseñar otra prenda
        </Link>
      </div>
    </div>
  );
}

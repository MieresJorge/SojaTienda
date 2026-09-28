import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { deleteOrderAction, updateOrderStatusAction } from "@/app/admin/actions";
import { OrderMetaForm, OrderNoteForm } from "@/components/admin/OrderForms";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { AdminPageHeader, Card, DataRow, StatusPill } from "@/components/admin/ui";
import { findColor, PRINT_METHODS, type PrintMethod } from "@/lib/catalog";
import { formatDate, money } from "@/lib/format";
import {
  getOrderDetail,
  ORDER_STATUSES,
  parseDesignMeta,
  parseQuantities,
  parseQuote,
  sizeBreakdown,
  STATUS_BY_KEY,
} from "@/server/admin";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const order = await getOrderDetail(id);
  return { title: order ? `Pedido ${order.code}` : "Pedido" };
}

/** Siguiente paso natural del flujo, para el botón de un click. */
const NEXT_STEP: Record<string, { status: string; label: string }> = {
  paid: { status: "in_production", label: "Mandar a producción" },
  in_production: { status: "ready", label: "Marcar como listo" },
  ready: { status: "shipped", label: "Marcar como enviado" },
  shipped: { status: "delivered", label: "Marcar como entregado" },
};

const LOCATION_LABELS: Record<string, string> = {
  frente: "Frente",
  espalda: "Espalda",
  manga_izq: "Manga izquierda",
  manga_der: "Manga derecha",
};

const EVENT_LABELS: Record<string, string> = {
  status: "Estado",
  note: "Nota",
  payment: "Pago",
  shipping: "Envío",
  system: "Sistema",
};

function toDateInput(value: Date | null): string {
  if (!value) return "";
  const offset = value.getTimezoneOffset() * 60_000;
  return new Date(value.getTime() - offset).toISOString().slice(0, 10);
}

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const order = await getOrderDetail(id);
  if (!order) notFound();

  const status = STATUS_BY_KEY[order.status];
  const next = NEXT_STEP[order.status];
  const units = order.items.reduce((acc, item) => acc + item.quantity, 0);
  const deletable = ["draft", "failed", "cancelled"].includes(order.status);

  return (
    <>
      <p className="mb-4 text-sm">
        <Link href="/admin/pedidos" className="text-ink-muted hover:text-ink">
          ← Pedidos
        </Link>
      </p>

      <AdminPageHeader
        title={order.code}
        description={`${formatDate(order.createdAt)} · ${units} ${units === 1 ? "prenda" : "prendas"} · ${money(order.total)}`}
        action={
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/admin/pedidos/${order.id}/taller`}
              className="rounded-full border border-line bg-surface px-4 py-2 text-sm font-medium transition-colors hover:border-ink"
            >
              Ficha de taller
            </Link>
            <Link
              href={`/pedido/${order.code}`}
              target="_blank"
              className="rounded-full border border-line bg-surface px-4 py-2 text-sm font-medium transition-colors hover:border-ink"
            >
              Ver como cliente
            </Link>
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <div className="space-y-6">
          <Card title="Qué hay que producir" padded={false}>
            <ul>
              {order.items.map((item) => {
                const quantities = parseQuantities(item.quantities);
                const quote = parseQuote(item.quote);
                const meta = parseDesignMeta(item.design.meta);
                const color = findColor(item.colorId);
                const artUrls = meta?.artUrls ?? {};

                return (
                  <li key={item.id} className="border-b border-line p-5 last:border-b-0">
                    <div className="flex flex-wrap gap-5">
                      <div className="flex gap-2">
                        {[item.design.previewFrontUrl, item.design.previewBackUrl]
                          .filter(Boolean)
                          .map((preview) => (
                            <a
                              key={preview}
                              href={preview as string}
                              target="_blank"
                              rel="noreferrer"
                              className="grid h-32 w-28 shrink-0 place-items-center overflow-hidden rounded-lg bg-paper-alt"
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={preview as string}
                                alt={`Mockup de ${item.productName}`}
                                className="h-full w-full object-contain"
                              />
                            </a>
                          ))}
                      </div>

                      <div className="min-w-56 flex-1">
                        <h3 className="font-semibold">{item.productName}</h3>
                        <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-ink-soft">
                          {color && (
                            <span
                              aria-hidden
                              className="h-3.5 w-3.5 rounded-full border border-line"
                              style={{ background: color.hex }}
                            />
                          )}
                          {color?.name ?? item.colorId} ·{" "}
                          {PRINT_METHODS[item.method as PrintMethod]?.name ?? item.method}
                          {item.rush && (
                            <span className="rounded-full bg-alerta/10 px-2 py-0.5 text-[11px] font-semibold text-alerta">
                              exprés
                            </span>
                          )}
                        </p>
                        <p className="mt-2 text-sm">
                          <span className="text-ink-muted">Talles: </span>
                          {sizeBreakdown(quantities) || "—"}{" "}
                          <span className="text-ink-muted">({item.quantity} u.)</span>
                        </p>

                        {meta && (
                          <ul className="mt-3 space-y-1 text-xs text-ink-soft">
                            {meta.locations
                              .filter((location) => location.objectCount > 0)
                              .map((location) => (
                                <li key={location.location}>
                                  <span className="font-semibold">
                                    {LOCATION_LABELS[location.location] ??
                                      location.location}
                                    :
                                  </span>{" "}
                                  {location.widthCm} × {location.heightCm} cm ·{" "}
                                  {location.colorCount}{" "}
                                  {location.colorCount === 1 ? "color" : "colores"}
                                  {location.overflows && (
                                    <span className="ml-2 font-semibold text-alerta">
                                      el arte se sale del área imprimible
                                    </span>
                                  )}
                                  {artUrls[location.location] && (
                                    <a
                                      href={artUrls[location.location]}
                                      target="_blank"
                                      rel="noreferrer"
                                      download
                                      className="ml-2 underline underline-offset-2"
                                    >
                                      descargar arte
                                    </a>
                                  )}
                                </li>
                              ))}
                          </ul>
                        )}

                        {quote && quote.warnings.length > 0 && (
                          <ul className="mt-3 space-y-1">
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
                      </div>

                      <div className="text-right">
                        <span className="font-display text-2xl">
                          {money(item.subtotal)}
                        </span>
                        {quote && (
                          <p className="mt-1 text-xs text-ink-muted">
                            {money(quote.averageUnitPrice)} por prenda
                            <br />
                            escalón {quote.tierLabel}
                          </p>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>

            <dl className="border-t border-line px-5 py-4 text-sm">
              <DataRow label="Prendas y estampa">{money(order.itemsSubtotal)}</DataRow>
              {order.setupTotal > 0 && (
                <DataRow label="Preparación de pantallas">
                  {money(order.setupTotal)}
                </DataRow>
              )}
              <DataRow
                label={order.shippingMethod === "pickup" ? "Retiro" : "Envío"}
              >
                {order.shippingCost === 0 ? "Sin cargo" : money(order.shippingCost)}
              </DataRow>
              <DataRow label="Total">
                <span className="font-display text-xl">{money(order.total)}</span>
              </DataRow>
            </dl>
          </Card>

          <Card
            title="Bitácora"
            description="Todo lo que le pasó a este pedido. No se edita ni se borra."
          >
            <OrderNoteForm orderId={order.id} />

            <ol className="mt-6 space-y-4">
              {order.events.map((event) => (
                <li key={event.id} className="flex gap-3 text-sm">
                  <span
                    aria-hidden
                    className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-line"
                  />
                  <div className="min-w-0">
                    <p className="text-ink-soft">{event.message}</p>
                    <p className="mt-0.5 text-xs text-ink-muted">
                      {EVENT_LABELS[event.kind] ?? event.kind} · {event.actor} ·{" "}
                      {formatDate(event.createdAt)}
                    </p>
                  </div>
                </li>
              ))}
              {order.events.length === 0 && (
                <li className="text-sm text-ink-muted">Todavía no hay movimientos.</li>
              )}
            </ol>
          </Card>
        </div>

        <div className="space-y-6">
          <Card title="Estado">
            <div className="mb-4 flex items-center gap-3">
              <StatusPill label={status?.label ?? order.status} tone={status?.tone} />
              <span className="text-xs text-ink-muted">{status?.hint}</span>
            </div>

            {next && (
              <form action={updateOrderStatusAction} className="mb-4">
                <input type="hidden" name="orderId" value={order.id} />
                <input type="hidden" name="status" value={next.status} />
                <SubmitButton className="w-full" pendingLabel="Cambiando…">
                  {next.label}
                </SubmitButton>
              </form>
            )}

            <form action={updateOrderStatusAction} className="flex gap-2">
              <input type="hidden" name="orderId" value={order.id} />
              <select
                name="status"
                defaultValue={order.status}
                aria-label="Cambiar el estado del pedido"
                className="h-10 min-w-0 flex-1 rounded-lg border border-line bg-surface px-3 text-sm outline-none focus:border-ink"
              >
                {ORDER_STATUSES.map((option) => (
                  <option key={option.key} value={option.key}>
                    {option.label}
                  </option>
                ))}
              </select>
              <SubmitButton variant="secondary" pendingLabel="…">
                Cambiar
              </SubmitButton>
            </form>
          </Card>

          <Card title="Cliente">
            <dl>
              <DataRow label="Nombre">{order.customerName}</DataRow>
              <DataRow label="Mail">
                <a
                  href={`mailto:${order.customerEmail}?subject=${encodeURIComponent(`Tu pedido ${order.code} en SOJA`)}`}
                  className="underline underline-offset-2"
                >
                  {order.customerEmail}
                </a>
              </DataRow>
              <DataRow label="Teléfono">
                <a
                  href={`https://wa.me/${order.customerPhone.replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noreferrer"
                  className="underline underline-offset-2"
                >
                  {order.customerPhone}
                </a>
              </DataRow>
              {order.customerDoc && <DataRow label="Documento">{order.customerDoc}</DataRow>}
              <DataRow label="Otros pedidos">
                <Link
                  href={`/admin/pedidos?q=${encodeURIComponent(order.customerEmail)}`}
                  className="underline underline-offset-2"
                >
                  Ver historial
                </Link>
              </DataRow>
            </dl>
          </Card>

          <Card title="Entrega">
            {order.shippingMethod === "pickup" ? (
              <p className="text-sm text-ink-soft">Retira por el taller.</p>
            ) : (
              <p className="text-sm leading-relaxed text-ink-soft">
                {order.addressStreet}
                <br />
                {order.addressCity}, {order.addressState} ({order.addressZip})
              </p>
            )}
            {order.notes && (
              <p className="mt-4 rounded-lg bg-paper-alt px-3 py-2 text-sm text-ink-soft">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-ink-muted">
                  Comentario del cliente
                </span>
                {order.notes}
              </p>
            )}
          </Card>

          <Card title="Gestión">
            <OrderMetaForm
              orderId={order.id}
              trackingCode={order.trackingCode ?? ""}
              dueDate={toDateInput(order.dueDate)}
              adminNotes={order.adminNotes ?? ""}
            />
          </Card>

          <Card title="Pago">
            <dl>
              <DataRow label="Estado en MP">{order.mpStatus ?? "—"}</DataRow>
              <DataRow label="Pago">{order.mpPaymentId ?? "—"}</DataRow>
              <DataRow label="Preferencia">{order.mpPreferenceId ?? "—"}</DataRow>
              <DataRow label="Cobrado el">
                {order.paidAt ? formatDate(order.paidAt) : "—"}
              </DataRow>
            </dl>
            {order.mpStatus === "simulado" && (
              <p className="mt-4 rounded-lg bg-brote-soft px-3 py-2 text-xs text-brote-dark">
                Pedido de prueba: se marcó como pagado sin pasar por Mercado Pago
                porque no hay <code>MP_ACCESS_TOKEN</code> configurado.
              </p>
            )}
          </Card>

          {deletable && (
            <Card title="Borrar pedido" description="Sólo se puede borrar lo que nunca se cobró.">
              <form action={deleteOrderAction}>
                <input type="hidden" name="orderId" value={order.id} />
                <SubmitButton
                  variant="danger"
                  size="sm"
                  pendingLabel="Borrando…"
                  confirm={`¿Borrar el pedido ${order.code}? No se puede deshacer.`}
                >
                  Borrar definitivamente
                </SubmitButton>
              </form>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}

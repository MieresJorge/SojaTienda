import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { findColor, PRINT_METHODS, SIZE_ORDER, type PrintMethod } from "@/lib/catalog";
import { formatDate } from "@/lib/format";
import {
  getOrderDetail,
  parseDesignMeta,
  parseQuantities,
  statusLabel,
} from "@/server/admin";
import { getSettings } from "@/server/settings";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const order = await getOrderDetail(id);
  return { title: order ? `Ficha ${order.code}` : "Ficha de taller" };
}

const LOCATION_LABELS: Record<string, string> = {
  frente: "Frente",
  espalda: "Espalda",
  manga_izq: "Manga izq.",
  manga_der: "Manga der.",
};

/**
 * Orden de trabajo para imprimir y colgar al lado de la pulpo.
 *
 * A propósito no muestra precios: al taller le importan talles, colores,
 * medidas y cuántas tintas lleva cada ubicación. La cáscara del panel se
 * oculta al imprimir (`print:hidden` en el layout).
 */
export default async function TallerSheetPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [order, settings] = await Promise.all([getOrderDetail(id), getSettings()]);
  if (!order) notFound();

  const units = order.items.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link
          href={`/admin/pedidos/${order.id}`}
          className="text-sm text-ink-muted hover:text-ink"
        >
          ← Volver al pedido
        </Link>
        <p className="text-sm text-ink-muted">
          Imprimí esta página (Ctrl+P) y va sin el menú del panel.
        </p>
      </div>

      <article className="rounded-card border border-line bg-surface p-8 print:rounded-none print:border-0 print:p-0">
        <header className="flex flex-wrap items-start justify-between gap-4 border-b-2 border-ink pb-4">
          <div>
            <h1 className="font-display text-4xl leading-none">{order.code}</h1>
            <p className="mt-2 text-sm text-ink-soft">
              {order.customerName} · {order.customerPhone}
            </p>
          </div>
          <div className="text-right text-sm">
            <p className="font-display text-2xl leading-none">{units} prendas</p>
            <p className="mt-1 text-ink-muted">Estado: {statusLabel(order.status)}</p>
            <p className="text-ink-muted">
              Entrega:{" "}
              {order.dueDate
                ? formatDate(order.dueDate)
                : `a coordinar (${settings.leadTimeDays} días hábiles)`}
            </p>
          </div>
        </header>

        {order.items.map((item) => {
          const quantities = parseQuantities(item.quantities);
          const meta = parseDesignMeta(item.design.meta);
          const color = findColor(item.colorId);
          const artUrls = meta?.artUrls ?? {};

          return (
            <section key={item.id} className="print-sheet border-b border-line py-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold">{item.productName}</h2>
                  <p className="mt-1 text-sm text-ink-soft">
                    Color: {color?.name ?? item.colorId}
                    {color && ` (${color.hex})`} ·{" "}
                    {PRINT_METHODS[item.method as PrintMethod]?.name ?? item.method}
                    {item.rush && " · EXPRÉS"}
                  </p>
                </div>
                <span className="font-display text-2xl">{item.quantity} u.</span>
              </div>

              <table className="mt-4 w-full border border-line text-center text-sm">
                <thead className="bg-paper-alt">
                  <tr>
                    {SIZE_ORDER.map((size) => (
                      <th key={size} scope="col" className="border border-line px-2 py-1">
                        {size}
                      </th>
                    ))}
                    <th scope="col" className="border border-line px-2 py-1">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    {SIZE_ORDER.map((size) => (
                      <td
                        key={size}
                        className="border border-line px-2 py-2 font-display text-lg"
                      >
                        {quantities[size] ?? "—"}
                      </td>
                    ))}
                    <td className="border border-line px-2 py-2 font-display text-lg">
                      {item.quantity}
                    </td>
                  </tr>
                </tbody>
              </table>

              <div className="mt-4 flex flex-wrap gap-5">
                <div className="flex gap-2">
                  {[item.design.previewFrontUrl, item.design.previewBackUrl]
                    .filter(Boolean)
                    .map((preview) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={preview}
                        src={preview as string}
                        alt={`Mockup de ${item.productName}`}
                        className="h-40 w-32 rounded-lg bg-paper-alt object-contain"
                      />
                    ))}
                </div>

                <ul className="min-w-56 flex-1 space-y-2 text-sm">
                  {meta?.locations
                    .filter((location) => location.objectCount > 0)
                    .map((location) => (
                      <li
                        key={location.location}
                        className="border-b border-line pb-2 last:border-b-0"
                      >
                        <span className="font-semibold">
                          {LOCATION_LABELS[location.location] ?? location.location}
                        </span>
                        <span className="text-ink-soft">
                          {" "}
                          · {location.widthCm} × {location.heightCm} cm ·{" "}
                          {location.colorCount}{" "}
                          {location.colorCount === 1 ? "tinta" : "tintas"}
                        </span>
                        {location.colors.length > 0 && (
                          <span className="ml-2 inline-flex gap-1 align-middle">
                            {location.colors.map((hex) => (
                              <span
                                key={hex}
                                title={hex}
                                className="inline-block h-3 w-3 rounded-full border border-line"
                                style={{ background: hex }}
                              />
                            ))}
                          </span>
                        )}
                        {location.overflows && (
                          <span className="ml-2 font-semibold text-alerta">
                            ¡revisar: se sale del área!
                          </span>
                        )}
                        {artUrls[location.location] && (
                          <a
                            href={artUrls[location.location]}
                            className="ml-2 text-xs underline underline-offset-2 print:hidden"
                            target="_blank"
                            rel="noreferrer"
                            download
                          >
                            arte
                          </a>
                        )}
                      </li>
                    ))}
                </ul>
              </div>
            </section>
          );
        })}

        <footer className="pt-6 text-sm">
          <p>
            <strong>Entrega:</strong>{" "}
            {order.shippingMethod === "pickup"
              ? `Retira por el taller${settings.pickupAddress ? ` · ${settings.pickupAddress}` : ""}`
              : `${order.addressStreet}, ${order.addressCity}, ${order.addressState} (${order.addressZip})`}
          </p>
          {order.notes && (
            <p className="mt-2">
              <strong>Pidió el cliente:</strong> {order.notes}
            </p>
          )}
          {order.adminNotes && (
            <p className="mt-2">
              <strong>Notas internas:</strong> {order.adminNotes}
            </p>
          )}
          <p className="mt-6 text-xs text-ink-muted">
            Pedido del {formatDate(order.createdAt)} · impreso el{" "}
            {formatDate(new Date())}
          </p>
        </footer>
      </article>
    </div>
  );
}

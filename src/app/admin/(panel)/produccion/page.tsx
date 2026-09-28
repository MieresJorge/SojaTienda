import type { Metadata } from "next";
import Link from "next/link";

import { updateOrderStatusAction } from "@/app/admin/actions";
import { SubmitButton } from "@/components/admin/SubmitButton";
import {
  AdminPageHeader,
  Card,
  EmptyState,
  RankBars,
  StatusPill,
} from "@/components/admin/ui";
import { findColor, PRINT_METHODS, SIZE_ORDER, type PrintMethod } from "@/lib/catalog";
import { formatDate } from "@/lib/format";
import { getProductionQueue, sizeBreakdown, parseQuantities, STATUS_BY_KEY } from "@/server/admin";

export const metadata: Metadata = { title: "Taller" };
export const dynamic = "force-dynamic";

const NEXT_STEP: Record<string, { status: string; label: string }> = {
  paid: { status: "in_production", label: "A producción" },
  in_production: { status: "ready", label: "Marcar listo" },
  ready: { status: "shipped", label: "Marcar enviado" },
};

/** Días hasta la fecha comprometida. Negativo = atrasado. */
function daysUntil(date: Date): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

export default async function AdminProductionPage() {
  const queue = await getProductionQueue();

  return (
    <>
      <AdminPageHeader
        title="Taller"
        description="Los pedidos cobrados que todavía tienen trabajo pendiente, ordenados por fecha de entrega."
      />

      {queue.orders.length === 0 ? (
        <EmptyState
          title="No hay nada en producción"
          description="Cuando se cobre un pedido va a aparecer en esta cola."
          action={
            <Link href="/admin/pedidos" className="underline underline-offset-2">
              Ver todos los pedidos
            </Link>
          }
        />
      ) : (
        <>
          <div className="mb-6 grid gap-6 lg:grid-cols-[2fr_1fr]">
            <Card
              title="Prendas a comprar"
              description={`Total de la cola: ${queue.units} ${queue.units === 1 ? "prenda" : "prendas"}.`}
            >
              <table className="w-full text-center text-sm">
                <thead className="text-xs uppercase tracking-wide text-ink-muted">
                  <tr>
                    {SIZE_ORDER.map((size) => (
                      <th key={size} scope="col" className="py-1 font-semibold">
                        {size}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    {SIZE_ORDER.map((size) => (
                      <td key={size} className="py-2 font-display text-2xl">
                        {queue.sizeTotals[size] ?? "—"}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </Card>

            <Card title="Por color">
              <RankBars
                rows={queue.colorTotals.map((color) => ({
                  label: findColor(color.colorId)?.name ?? color.colorId,
                  value: color.units,
                  swatch: findColor(color.colorId)?.hex,
                }))}
              />
            </Card>
          </div>

          <ul className="space-y-4">
            {queue.orders.map((order) => {
              const status = STATUS_BY_KEY[order.status];
              const next = NEXT_STEP[order.status];
              const units = order.items.reduce((acc, item) => acc + item.quantity, 0);
              const due = order.dueDate ? daysUntil(order.dueDate) : null;

              return (
                <li key={order.id} className="rounded-card border border-line bg-surface">
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-line px-5 py-3">
                    <Link
                      href={`/admin/pedidos/${order.id}`}
                      className="font-semibold underline-offset-2 hover:underline"
                    >
                      {order.code}
                    </Link>
                    <StatusPill label={status?.label ?? order.status} tone={status?.tone} />
                    <span className="min-w-0 flex-1 truncate text-sm text-ink-soft">
                      {order.customerName} · {units}{" "}
                      {units === 1 ? "prenda" : "prendas"}
                    </span>

                    {due !== null && (
                      <span
                        className={
                          due < 0
                            ? "rounded-full bg-alerta/10 px-2 py-0.5 text-[11px] font-semibold text-alerta"
                            : "text-xs text-ink-muted"
                        }
                      >
                        {due < 0
                          ? `atrasado ${Math.abs(due)} ${Math.abs(due) === 1 ? "día" : "días"}`
                          : due === 0
                            ? "entrega hoy"
                            : `entrega en ${due} ${due === 1 ? "día" : "días"}`}
                      </span>
                    )}
                    {due === null && (
                      <span className="text-xs text-ink-muted">
                        sin fecha · cobrado {formatDate(order.paidAt ?? order.createdAt)}
                      </span>
                    )}

                    <div className="flex gap-2">
                      <Link
                        href={`/admin/pedidos/${order.id}/taller`}
                        className="rounded-full border border-line px-3 py-1 text-xs font-medium transition-colors hover:border-ink"
                      >
                        Ficha
                      </Link>
                      {next && (
                        <form action={updateOrderStatusAction}>
                          <input type="hidden" name="orderId" value={order.id} />
                          <input type="hidden" name="status" value={next.status} />
                          <SubmitButton size="sm" pendingLabel="…">
                            {next.label}
                          </SubmitButton>
                        </form>
                      )}
                    </div>
                  </div>

                  <ul className="divide-y divide-line">
                    {order.items.map((item) => {
                      const color = findColor(item.colorId);
                      return (
                        <li
                          key={item.id}
                          className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3 text-sm"
                        >
                          {color && (
                            <span
                              aria-hidden
                              className="h-3.5 w-3.5 shrink-0 rounded-full border border-line"
                              style={{ background: color.hex }}
                            />
                          )}
                          <span className="font-medium">{item.productName}</span>
                          <span className="text-ink-soft">
                            {color?.name ?? item.colorId} ·{" "}
                            {PRINT_METHODS[item.method as PrintMethod]?.name ??
                              item.method}
                            {item.rush && " · exprés"}
                          </span>
                          <span className="ml-auto text-ink-muted">
                            {sizeBreakdown(parseQuantities(item.quantities))}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </>
  );
}

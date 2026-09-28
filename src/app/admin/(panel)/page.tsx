import type { Metadata } from "next";
import Link from "next/link";

import { RevenueChart } from "@/components/admin/RevenueChart";
import {
  AdminPageHeader,
  Card,
  DataRow,
  EmptyState,
  RankBars,
  StatCard,
  StatusPill,
} from "@/components/admin/ui";
import { findColor, PRINT_METHODS, type PrintMethod } from "@/lib/catalog";
import { formatDate, money } from "@/lib/format";
import { getDashboard, STATUS_BY_KEY } from "@/server/admin";

export const metadata: Metadata = { title: "Tablero" };
export const dynamic = "force-dynamic";

/** Variación porcentual contra el período anterior. null si no hay con qué comparar. */
function delta(current: number, previous: number): number | null {
  if (previous <= 0) return null;
  return ((current - previous) / previous) * 100;
}

export default async function AdminDashboardPage() {
  const data = await getDashboard();
  const monthName = new Intl.DateTimeFormat("es-AR", { month: "long" }).format(
    new Date(),
  );

  return (
    <>
      <AdminPageHeader
        title="Tablero"
        description="Lo que pasó con la tienda, con la plata ya cobrada. Los pedidos sin pagar no suman a la facturación."
      />

      {data.alerts.length > 0 && (
        <ul className="mb-6 space-y-2">
          {data.alerts.map((alert) => (
            <li
              key={alert}
              className="flex items-center gap-2 rounded-lg border border-line bg-surface px-4 py-3 text-sm"
            >
              <span aria-hidden className="text-base leading-none">
                •
              </span>
              {alert}
            </li>
          ))}
        </ul>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Hoy"
          value={money(data.today.revenue)}
          hint={`${data.today.orders} ${data.today.orders === 1 ? "pedido" : "pedidos"} · ${data.today.units} prendas`}
        />
        <StatCard
          label={`${monthName} (mes en curso)`}
          value={money(data.month.revenue)}
          delta={delta(data.month.revenue, data.previousMonth.revenue)}
          hint={`${data.month.orders} ${data.month.orders === 1 ? "pedido" : "pedidos"}`}
        />
        <StatCard
          label="Ticket promedio"
          value={money(data.allTime.averageTicket)}
          hint={`sobre ${data.allTime.orders} ${data.allTime.orders === 1 ? "pedido cobrado" : "pedidos cobrados"}`}
        />
        <StatCard
          label="Esperando pago"
          value={money(data.pendingPayment.amount)}
          hint={`${data.pendingPayment.count} ${data.pendingPayment.count === 1 ? "pedido" : "pedidos"} sin cobrar`}
          href="/admin/pedidos?status=pending"
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[2fr_1fr]">
        <Card
          title="Facturación de los últimos 30 días"
          description="Se cuenta por fecha de cobro, no por fecha del pedido."
        >
          <RevenueChart series={data.series} />
        </Card>

        <Card
          title="En el taller"
          description="Cuántos pedidos hay en cada etapa."
          padded={false}
        >
          <ul>
            {data.workload
              .filter((row) => row.count > 0)
              .map((row) => (
                <li key={row.status.key}>
                  <Link
                    href={`/admin/pedidos?status=${row.status.key}`}
                    className="flex items-center justify-between gap-3 border-b border-line px-5 py-3 text-sm transition-colors last:border-b-0 hover:bg-paper-alt"
                  >
                    <StatusPill label={row.status.label} tone={row.status.tone} />
                    <span className="tabular-nums text-ink-muted">
                      {row.count} · {row.units} prendas
                    </span>
                  </Link>
                </li>
              ))}
            {data.workload.every((row) => row.count === 0) && (
              <li className="px-5 py-8 text-center text-sm text-ink-muted">
                Todavía no entró ningún pedido.
              </li>
            )}
          </ul>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card title="Productos más vendidos">
          {data.topProducts.length > 0 ? (
            <RankBars
              rows={data.topProducts.map((product) => ({
                label: product.name,
                value: product.units,
                secondary: product.revenue,
              }))}
            />
          ) : (
            <p className="text-sm text-ink-muted">Sin ventas todavía.</p>
          )}
        </Card>

        <Card title="Colores más pedidos">
          {data.topColors.length > 0 ? (
            <RankBars
              rows={data.topColors.map((color) => ({
                label: findColor(color.colorId)?.name ?? color.colorId,
                value: color.units,
                swatch: findColor(color.colorId)?.hex,
              }))}
            />
          ) : (
            <p className="text-sm text-ink-muted">Sin ventas todavía.</p>
          )}
        </Card>

        <Card title="Técnica de estampa">
          {data.methodSplit.length > 0 ? (
            <RankBars
              rows={data.methodSplit.map((method) => ({
                label: PRINT_METHODS[method.method as PrintMethod]?.name ?? method.method,
                value: method.units,
                secondary: method.revenue,
              }))}
            />
          ) : (
            <p className="text-sm text-ink-muted">Sin ventas todavía.</p>
          )}
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[2fr_1fr]">
        <Card
          title="Últimos pedidos"
          action={
            <Link
              href="/admin/pedidos"
              className="text-xs underline underline-offset-2 hover:text-ink"
            >
              Ver todos
            </Link>
          }
          padded={false}
        >
          {data.latest.length > 0 ? (
            <ul>
              {data.latest.map((order) => {
                const status = STATUS_BY_KEY[order.status];
                return (
                  <li key={order.id}>
                    <Link
                      href={`/admin/pedidos/${order.id}`}
                      className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-line px-5 py-3 text-sm transition-colors last:border-b-0 hover:bg-paper-alt"
                    >
                      <span className="font-semibold">{order.code}</span>
                      <span className="min-w-0 flex-1 truncate text-ink-soft">
                        {order.customerName}
                      </span>
                      <StatusPill
                        label={status?.label ?? order.status}
                        tone={status?.tone}
                      />
                      <span className="tabular-nums">{money(order.total)}</span>
                      <span className="w-full text-xs text-ink-muted sm:w-auto">
                        {formatDate(order.createdAt)}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="p-5">
              <EmptyState
                title="Todavía no hay pedidos"
                description="Cuando alguien compre desde el diseñador, va a aparecer acá."
              />
            </div>
          )}
        </Card>

        <Card title="Acumulado histórico">
          <dl>
            <DataRow label="Facturado">{money(data.allTime.revenue)}</DataRow>
            <DataRow label="Pedidos cobrados">{data.allTime.orders}</DataRow>
            <DataRow label="Prendas producidas">{data.allTime.units}</DataRow>
            <DataRow label="Ticket promedio">{money(data.allTime.averageTicket)}</DataRow>
            <DataRow label="Mes pasado">{money(data.previousMonth.revenue)}</DataRow>
          </dl>
        </Card>
      </div>
    </>
  );
}

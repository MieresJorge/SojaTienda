import type { Metadata } from "next";
import Link from "next/link";

import { AdminPageHeader, Card, EmptyState, StatusPill } from "@/components/admin/ui";
import { inputClass } from "@/components/ui";
import { formatDate, money } from "@/lib/format";
import { listOrders, ORDER_STATUSES, ORDERS_PAGE_SIZE, STATUS_BY_KEY } from "@/server/admin";

export const metadata: Metadata = { title: "Pedidos" };
export const dynamic = "force-dynamic";

type Query = Record<string, string | string[] | undefined>;

function read(query: Query, key: string): string {
  const value = query[key];
  return typeof value === "string" ? value : "";
}

/** Rearma la query manteniendo los filtros y cambiando sólo lo que se pide. */
function link(query: Query, changes: Record<string, string | number | undefined>): string {
  const params = new URLSearchParams();
  for (const key of ["status", "q", "from", "to", "page"]) {
    const value = read(query, key);
    if (value) params.set(key, value);
  }
  for (const [key, value] of Object.entries(changes)) {
    if (value === undefined || value === "") params.delete(key);
    else params.set(key, String(value));
  }
  const search = params.toString();
  return search ? `/admin/pedidos?${search}` : "/admin/pedidos";
}

const QUICK_FILTERS = [
  { value: "", label: "Todos" },
  { value: "abiertos", label: "En curso" },
  { value: "cobrados", label: "Cobrados" },
  ...ORDER_STATUSES.map((status) => ({ value: status.key, label: status.label })),
];

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<Query>;
}) {
  const query = await searchParams;
  const filters = {
    status: read(query, "status"),
    q: read(query, "q"),
    from: read(query, "from"),
    to: read(query, "to"),
    page: Number(read(query, "page")) || 1,
  };

  const { rows, total, page, pages, filteredRevenue } = await listOrders(filters);
  // Ruta aparte para no tapar /admin/pedidos/[id].
  const exportHref = link(query, { page: undefined }).replace(
    "/admin/pedidos",
    "/admin/exportar",
  );

  return (
    <>
      <AdminPageHeader
        title="Pedidos"
        description="Todo lo que entró por la web, en orden de llegada."
        action={
          <Link
            href={exportHref}
            prefetch={false}
            className="rounded-full border border-line bg-surface px-4 py-2 text-sm font-medium transition-colors hover:border-ink"
          >
            Exportar CSV
          </Link>
        }
      />

      {/* GET puro: los filtros quedan en la URL y andan sin JavaScript. */}
      <form
        method="get"
        action="/admin/pedidos"
        className="mb-4 flex flex-wrap items-end gap-3 rounded-card border border-line bg-surface p-4"
      >
        <label className="min-w-48 flex-1">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-ink-muted">
            Buscar
          </span>
          <input
            name="q"
            defaultValue={filters.q}
            placeholder="Código, nombre, mail o teléfono"
            className={inputClass}
          />
        </label>
        <label>
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-ink-muted">
            Desde
          </span>
          <input type="date" name="from" defaultValue={filters.from} className={inputClass} />
        </label>
        <label>
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-ink-muted">
            Hasta
          </span>
          <input type="date" name="to" defaultValue={filters.to} className={inputClass} />
        </label>
        <input type="hidden" name="status" value={filters.status} />
        <button
          type="submit"
          className="h-10 rounded-full bg-ink px-5 text-sm font-semibold text-paper transition-colors hover:bg-brote-dark"
        >
          Filtrar
        </button>
        {(filters.q || filters.from || filters.to) && (
          <Link
            href={link(query, { q: "", from: "", to: "", page: undefined })}
            className="h-10 self-end px-2 text-sm text-ink-muted underline underline-offset-2 hover:text-ink"
          >
            Limpiar
          </Link>
        )}
      </form>

      <div className="mb-5 flex flex-wrap gap-2">
        {QUICK_FILTERS.map((filter) => {
          const active = filters.status === filter.value;
          return (
            <Link
              key={filter.value || "todos"}
              href={link(query, { status: filter.value, page: undefined })}
              className={
                active
                  ? "rounded-full bg-ink px-3 py-1 text-xs font-semibold text-paper"
                  : "rounded-full border border-line bg-surface px-3 py-1 text-xs font-medium text-ink-soft transition-colors hover:border-ink hover:text-ink"
              }
            >
              {filter.label}
            </Link>
          );
        })}
      </div>

      <p className="mb-3 text-sm text-ink-muted">
        {total} {total === 1 ? "pedido" : "pedidos"} · {money(filteredRevenue)} cobrados
        en este filtro
      </p>

      {rows.length === 0 ? (
        <EmptyState
          title="No hay pedidos con estos filtros"
          description="Probá con otro estado o limpiá la búsqueda."
        />
      ) : (
        <Card padded={false}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-line text-xs uppercase tracking-wide text-ink-muted">
                <tr>
                  <th scope="col" className="px-5 py-3 font-semibold">
                    Pedido
                  </th>
                  <th scope="col" className="px-5 py-3 font-semibold">
                    Cliente
                  </th>
                  <th scope="col" className="px-5 py-3 font-semibold">
                    Estado
                  </th>
                  <th scope="col" className="px-5 py-3 text-right font-semibold">
                    Prendas
                  </th>
                  <th scope="col" className="px-5 py-3 text-right font-semibold">
                    Total
                  </th>
                  <th scope="col" className="px-5 py-3 font-semibold">
                    Fecha
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((order) => {
                  const status = STATUS_BY_KEY[order.status];
                  const units = order.items.reduce((acc, item) => acc + item.quantity, 0);
                  return (
                    <tr
                      key={order.id}
                      className="border-b border-line last:border-b-0 hover:bg-paper-alt"
                    >
                      <td className="px-5 py-3">
                        <Link
                          href={`/admin/pedidos/${order.id}`}
                          className="font-semibold underline-offset-2 hover:underline"
                        >
                          {order.code}
                        </Link>
                        {order.shippingMethod === "envio" && (
                          <span className="ml-2 text-xs text-ink-muted">envío</span>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        <span className="block">{order.customerName}</span>
                        <span className="block text-xs text-ink-muted">
                          {order.customerEmail}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <StatusPill
                          label={status?.label ?? order.status}
                          tone={status?.tone}
                        />
                      </td>
                      <td className="px-5 py-3 text-right tabular-nums">{units}</td>
                      <td className="px-5 py-3 text-right tabular-nums">
                        {money(order.total)}
                      </td>
                      <td className="px-5 py-3 text-xs text-ink-muted">
                        {formatDate(order.createdAt)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {pages > 1 && (
        <nav className="mt-5 flex items-center justify-between text-sm" aria-label="Paginación">
          {page > 1 ? (
            <Link
              href={link(query, { page: page - 1 })}
              className="rounded-full border border-line bg-surface px-4 py-2 transition-colors hover:border-ink"
            >
              Anteriores
            </Link>
          ) : (
            <span />
          )}
          <span className="text-ink-muted">
            Página {page} de {pages} · {ORDERS_PAGE_SIZE} por página
          </span>
          {page < pages ? (
            <Link
              href={link(query, { page: page + 1 })}
              className="rounded-full border border-line bg-surface px-4 py-2 transition-colors hover:border-ink"
            >
              Siguientes
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </>
  );
}

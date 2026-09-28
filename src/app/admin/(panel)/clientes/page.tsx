import type { Metadata } from "next";
import Link from "next/link";

import { AdminPageHeader, Card, EmptyState, StatCard } from "@/components/admin/ui";
import { inputClass } from "@/components/ui";
import { formatDate, money } from "@/lib/format";
import { listCustomers } from "@/server/admin";

export const metadata: Metadata = { title: "Clientes" };
export const dynamic = "force-dynamic";

/**
 * No hay tabla de clientes: se arma agrupando pedidos por mail. Es suficiente
 * para el caso real (saber quién repite y cuánto gastó) y evita inventar una
 * entidad que nadie mantiene.
 */
export default async function AdminCustomersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  const term = typeof query.q === "string" ? query.q : "";
  const customers = await listCustomers(term);

  const repeat = customers.filter((customer) => customer.paidOrders > 1).length;
  const spent = customers.reduce((acc, customer) => acc + customer.spent, 0);

  return (
    <>
      <AdminPageHeader
        title="Clientes"
        description="Agrupados por mail. Sólo cuenta la plata de los pedidos cobrados."
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Clientes" value={String(customers.length)} />
        <StatCard
          label="Compraron más de una vez"
          value={String(repeat)}
          hint={
            customers.length > 0
              ? `${Math.round((repeat / customers.length) * 100)}% del total`
              : undefined
          }
        />
        <StatCard label="Facturado a estos clientes" value={money(spent)} />
      </div>

      <form
        method="get"
        action="/admin/clientes"
        className="mb-5 flex flex-wrap gap-3 rounded-card border border-line bg-surface p-4"
      >
        <input
          name="q"
          defaultValue={term}
          placeholder="Nombre, mail o teléfono"
          className={`${inputClass} min-w-48 flex-1`}
        />
        <button
          type="submit"
          className="h-10 rounded-full bg-ink px-5 text-sm font-semibold text-paper transition-colors hover:bg-brote-dark"
        >
          Buscar
        </button>
      </form>

      {customers.length === 0 ? (
        <EmptyState
          title="No hay clientes con esa búsqueda"
          description="Probá con otro nombre o mail."
        />
      ) : (
        <Card padded={false}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-line text-xs uppercase tracking-wide text-ink-muted">
                <tr>
                  <th scope="col" className="px-5 py-3 font-semibold">
                    Cliente
                  </th>
                  <th scope="col" className="px-5 py-3 text-right font-semibold">
                    Pedidos
                  </th>
                  <th scope="col" className="px-5 py-3 text-right font-semibold">
                    Prendas
                  </th>
                  <th scope="col" className="px-5 py-3 text-right font-semibold">
                    Gastado
                  </th>
                  <th scope="col" className="px-5 py-3 font-semibold">
                    Último pedido
                  </th>
                </tr>
              </thead>
              <tbody>
                {customers.map((customer) => (
                  <tr
                    key={customer.email}
                    className="border-b border-line last:border-b-0 hover:bg-paper-alt"
                  >
                    <td className="px-5 py-3">
                      <Link
                        href={`/admin/pedidos?q=${encodeURIComponent(customer.email)}`}
                        className="font-medium underline-offset-2 hover:underline"
                      >
                        {customer.name}
                      </Link>
                      <span className="block text-xs text-ink-muted">
                        {customer.email} · {customer.phone}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right tabular-nums">
                      {customer.paidOrders}
                      {customer.orders > customer.paidOrders && (
                        <span className="text-ink-muted">
                          {" "}
                          / {customer.orders}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right tabular-nums">
                      {customer.units}
                    </td>
                    <td className="px-5 py-3 text-right tabular-nums">
                      {money(customer.spent)}
                    </td>
                    <td className="px-5 py-3 text-xs text-ink-muted">
                      {formatDate(customer.lastAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </>
  );
}

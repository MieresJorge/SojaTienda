import type { Metadata } from "next";
import Link from "next/link";

import { AdminPageHeader, Card, EmptyState, StatusPill } from "@/components/admin/ui";
import { findColor, PRINT_METHODS, type PrintMethod } from "@/lib/catalog";
import { formatDate } from "@/lib/format";
import { listDesigns, parseDesignMeta, STATUS_BY_KEY } from "@/server/admin";

export const metadata: Metadata = { title: "Diseños" };
export const dynamic = "force-dynamic";

/**
 * Galería de todo lo que se diseñó, haya terminado en compra o no.
 *
 * Los diseños sin pedido son la parte interesante: son carritos abandonados
 * con el arte ya hecho. Sirven para ver qué se intenta y qué no se cierra.
 */
export default async function AdminDesignsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  const page = Number(typeof query.page === "string" ? query.page : "1") || 1;
  const onlyOrdered = query.filtro === "comprados";

  const { rows, total, pages } = await listDesigns(page, onlyOrdered);

  /** Mantiene el filtro al paginar. */
  const linkFor = (nextPage: number) => {
    const params = new URLSearchParams();
    if (onlyOrdered) params.set("filtro", "comprados");
    if (nextPage > 1) params.set("page", String(nextPage));
    const search = params.toString();
    return search ? `/admin/disenos?${search}` : "/admin/disenos";
  };

  return (
    <>
      <AdminPageHeader
        title="Diseños"
        description="Cada vez que alguien agrega algo al carrito se guarda un diseño nuevo e inmutable. Estos son todos."
      />

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <Link
          href="/admin/disenos"
          className={
            onlyOrdered
              ? "rounded-full border border-line bg-surface px-3 py-1 text-xs font-medium text-ink-soft transition-colors hover:border-ink"
              : "rounded-full bg-ink px-3 py-1 text-xs font-semibold text-paper"
          }
        >
          Todos
        </Link>
        <Link
          href="/admin/disenos?filtro=comprados"
          className={
            onlyOrdered
              ? "rounded-full bg-ink px-3 py-1 text-xs font-semibold text-paper"
              : "rounded-full border border-line bg-surface px-3 py-1 text-xs font-medium text-ink-soft transition-colors hover:border-ink"
          }
        >
          Sólo los que se compraron
        </Link>
        <span className="ml-auto text-sm text-ink-muted">
          {total} {total === 1 ? "diseño" : "diseños"}
        </span>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          title="Todavía no hay diseños"
          description="Se guardan cuando alguien agrega una prenda al carrito."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {rows.map((design) => {
            const preview = design.previewFrontUrl ?? design.previewBackUrl;
            const meta = parseDesignMeta(design.meta);
            const color = findColor(design.colorId);
            const order = design.orderItems[0]?.order;
            const status = order ? STATUS_BY_KEY[order.status] : null;
            const printed =
              meta?.locations.filter((location) => location.objectCount > 0) ?? [];

            return (
              <Card key={design.id} padded={false}>
                <div className="grid aspect-[4/5] place-items-center overflow-hidden bg-paper-alt">
                  {preview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={preview}
                      alt="Mockup del diseño"
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <span className="text-xs text-ink-muted">sin vista previa</span>
                  )}
                </div>

                <div className="space-y-2 p-4 text-sm">
                  <p className="flex items-center gap-2">
                    {color && (
                      <span
                        aria-hidden
                        className="h-3 w-3 shrink-0 rounded-full border border-line"
                        style={{ background: color.hex }}
                      />
                    )}
                    <span className="truncate">
                      {color?.name ?? design.colorId} ·{" "}
                      {PRINT_METHODS[design.method as PrintMethod]?.name ?? design.method}
                    </span>
                  </p>

                  <p className="text-xs text-ink-muted">
                    {printed.length > 0
                      ? `${printed.length} ${printed.length === 1 ? "ubicación" : "ubicaciones"} · hasta ${meta?.maxColors ?? 1} ${(meta?.maxColors ?? 1) === 1 ? "color" : "colores"}`
                      : "sin arte"}
                  </p>

                  <p className="text-xs text-ink-muted">{formatDate(design.createdAt)}</p>

                  {order ? (
                    <Link
                      href={`/admin/pedidos/${order.id}`}
                      className="flex items-center gap-2 text-xs font-medium underline-offset-2 hover:underline"
                    >
                      {order.code}
                      {status && <StatusPill label={status.label} tone={status.tone} />}
                    </Link>
                  ) : (
                    <span className="text-xs text-ink-muted">
                      Nunca se compró (carrito abandonado)
                    </span>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {pages > 1 && (
        <nav className="mt-6 flex items-center justify-between text-sm" aria-label="Paginación">
          {page > 1 ? (
            <Link
              href={linkFor(page - 1)}
              className="rounded-full border border-line bg-surface px-4 py-2 transition-colors hover:border-ink"
            >
              Anteriores
            </Link>
          ) : (
            <span />
          )}
          <span className="text-ink-muted">
            Página {page} de {pages}
          </span>
          {page < pages ? (
            <Link
              href={linkFor(page + 1)}
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

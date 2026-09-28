import { money } from "@/lib/format";

/**
 * Facturación diaria de los últimos 30 días.
 *
 * Una sola serie, así que no lleva leyenda: el título la nombra. Las barras
 * van en `--color-brote-dark` y no en el verde de marca porque el verde claro
 * da 2,49:1 sobre blanco y no llega al 3:1 mínimo para una marca gráfica.
 *
 * El tooltip es sólo CSS: cada barra lleva su propio cartel anclado arriba a
 * la izquierda del gráfico y se muestra al pasar el mouse. Sin estado, sin
 * JS y sin recortes contra el borde de la tarjeta.
 */

const DAY_FORMAT = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit",
  month: "short",
});

/** Eje corto: 1,2 M / 340 k. En el tooltip va el número completo. */
function compact(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1).replace(".", ",")} M`;
  if (value >= 1_000) return `$${Math.round(value / 1_000)} k`;
  return `$${value}`;
}

export function RevenueChart({
  series,
}: {
  series: Array<{ date: Date; revenue: number; orders: number }>;
}) {
  const max = Math.max(...series.map((point) => point.revenue), 0);
  const peakIndex = max > 0 ? series.findIndex((point) => point.revenue === max) : -1;
  const total = series.reduce((acc, point) => acc + point.revenue, 0);

  if (total === 0) {
    return (
      <p className="py-10 text-center text-sm text-ink-muted">
        Todavía no hay ventas cobradas en los últimos 30 días.
      </p>
    );
  }

  return (
    <figure className="m-0">
      <div className="relative">
        {/* Grilla de fondo, deliberadamente tenue. */}
        <div aria-hidden className="absolute inset-x-0 top-0 h-44">
          {[0, 0.5, 1].map((fraction) => (
            <div
              key={fraction}
              className="absolute inset-x-0 border-t border-line"
              style={{ top: `${fraction * 100}%` }}
            />
          ))}
          <span className="absolute -top-2 right-0 bg-surface pl-1 text-[10px] text-ink-muted">
            {compact(max)}
          </span>
        </div>

        <div className="relative flex h-44 items-end gap-[2px]">
          {series.map((point, index) => {
            const height = max > 0 ? (point.revenue / max) * 100 : 0;
            const label = DAY_FORMAT.format(point.date);
            return (
              <div
                key={point.date.toISOString()}
                className="group/bar relative flex h-full flex-1 items-end"
                tabIndex={0}
                aria-label={`${label}: ${money(point.revenue)} en ${point.orders} ${
                  point.orders === 1 ? "pedido" : "pedidos"
                }`}
              >
                {point.revenue > 0 ? (
                  <div
                    className="w-full rounded-t-[4px] bg-[#5e8226] transition-opacity group-hover/bar:opacity-80 group-focus/bar:opacity-80"
                    style={{ height: `${Math.max(2, height)}%` }}
                  />
                ) : (
                  <div className="h-[2px] w-full rounded-full bg-line" />
                )}

                {/* Un cartel por barra, todos en el mismo lugar. */}
                <div className="pointer-events-none absolute -top-1 left-0 z-10 hidden whitespace-nowrap rounded-lg border border-line bg-surface px-3 py-2 text-left shadow-[0_2px_10px_rgba(20,21,26,0.12)] group-hover/bar:block group-focus/bar:block">
                  <span className="block text-[11px] uppercase tracking-wide text-ink-muted">
                    {label}
                  </span>
                  <span className="block font-display text-lg leading-tight">
                    {money(point.revenue)}
                  </span>
                  <span className="block text-[11px] text-ink-muted">
                    {point.orders} {point.orders === 1 ? "pedido" : "pedidos"}
                  </span>
                </div>

                {/* Único valor rotulado directamente: el pico. */}
                {index === peakIndex && (
                  <span
                    aria-hidden
                    className="pointer-events-none absolute inset-x-0 text-center text-[10px] font-semibold text-ink-soft"
                    style={{ bottom: `calc(${Math.max(2, height)}% + 3px)` }}
                  >
                    {compact(point.revenue)}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-2 flex justify-between text-[11px] text-ink-muted">
        <span>{DAY_FORMAT.format(series[0].date)}</span>
        <span>{DAY_FORMAT.format(series[Math.floor(series.length / 2)].date)}</span>
        <span>{DAY_FORMAT.format(series[series.length - 1].date)}</span>
      </div>

      <details className="mt-4 text-sm">
        <summary className="cursor-pointer text-xs text-ink-muted hover:text-ink">
          Ver los datos en tabla
        </summary>
        <table className="mt-3 w-full text-left text-xs">
          <thead className="text-ink-muted">
            <tr>
              <th scope="col" className="py-1 font-medium">
                Día
              </th>
              <th scope="col" className="py-1 text-right font-medium">
                Pedidos
              </th>
              <th scope="col" className="py-1 text-right font-medium">
                Facturado
              </th>
            </tr>
          </thead>
          <tbody>
            {series
              .filter((point) => point.revenue > 0)
              .map((point) => (
                <tr key={point.date.toISOString()} className="border-t border-line">
                  <td className="py-1">{DAY_FORMAT.format(point.date)}</td>
                  <td className="py-1 text-right tabular-nums">{point.orders}</td>
                  <td className="py-1 text-right tabular-nums">{money(point.revenue)}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}

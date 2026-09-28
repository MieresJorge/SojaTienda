import Link from "next/link";
import type { ReactNode } from "react";

import { cx } from "@/components/ui";
import { money } from "@/lib/format";

/**
 * Piezas visuales del panel. Son server components a propósito: el panel es
 * casi todo lectura, y lo que necesita interacción vive en su propio archivo
 * "use client".
 */

export function AdminPageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-display text-3xl leading-none sm:text-4xl">{title}</h1>
        {description && (
          <p className="mt-2 max-w-2xl text-sm text-ink-soft">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}

export function Card({
  title,
  description,
  action,
  children,
  className,
  padded = true,
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    <section
      className={cx("rounded-card border border-line bg-surface", className)}
    >
      {(title || action) && (
        <header className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-5 py-4">
          <div>
            {title && <h2 className="text-sm font-semibold">{title}</h2>}
            {description && (
              <p className="mt-0.5 text-xs leading-relaxed text-ink-muted">
                {description}
              </p>
            )}
          </div>
          {action}
        </header>
      )}
      <div className={padded ? "p-5" : undefined}>{children}</div>
    </section>
  );
}

export function StatCard({
  label,
  value,
  hint,
  delta,
  href,
}: {
  label: string;
  value: string;
  hint?: string;
  /** Variación contra el período anterior, en porcentaje. */
  delta?: number | null;
  href?: string;
}) {
  const body = (
    <>
      <span className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
        {label}
      </span>
      <span className="mt-2 block font-display text-3xl leading-none">{value}</span>
      <span className="mt-2 flex flex-wrap items-center gap-2 text-xs text-ink-muted">
        {typeof delta === "number" && Number.isFinite(delta) && (
          <span
            className={cx(
              "inline-flex items-center rounded-full px-1.5 py-0.5 font-semibold",
              delta >= 0 ? "bg-brote-soft text-brote-dark" : "bg-alerta/10 text-alerta",
            )}
          >
            {delta >= 0 ? "▲" : "▼"} {Math.abs(Math.round(delta))}%
          </span>
        )}
        {hint}
      </span>
    </>
  );

  const className =
    "block rounded-card border border-line bg-surface p-5 transition-colors";

  return href ? (
    <Link href={href} className={cx(className, "hover:border-ink")}>
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  );
}

const TONES = {
  neutral: "bg-paper-alt text-ink-soft",
  brote: "bg-brote-soft text-brote-dark",
  alerta: "bg-alerta/10 text-alerta",
} as const;

export function StatusPill({
  label,
  tone = "neutral",
}: {
  label: string;
  tone?: keyof typeof TONES;
}) {
  return (
    <span
      className={cx(
        "inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold",
        TONES[tone],
      )}
    >
      {label}
    </span>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-card border border-dashed border-line px-6 py-14 text-center">
      <p className="font-semibold">{title}</p>
      {description && (
        <p className="mx-auto mt-2 max-w-sm text-sm text-ink-muted">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

/** Barras horizontales para rankings (productos, colores, métodos). */
export function RankBars({
  rows,
  unit = "u.",
}: {
  rows: Array<{ label: string; value: number; secondary?: number; swatch?: string }>;
  unit?: string;
}) {
  const max = Math.max(1, ...rows.map((row) => row.value));
  return (
    <ul className="space-y-3">
      {rows.map((row) => (
        <li key={row.label}>
          <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
            <span className="flex min-w-0 items-center gap-2">
              {row.swatch && (
                <span
                  aria-hidden
                  className="h-3 w-3 shrink-0 rounded-full border border-line"
                  style={{ background: row.swatch }}
                />
              )}
              <span className="truncate">{row.label}</span>
            </span>
            <span className="shrink-0 tabular-nums text-ink-muted">
              {row.value} {unit}
              {typeof row.secondary === "number" && (
                <span className="ml-2 text-ink-muted">{money(row.secondary)}</span>
              )}
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-paper-alt">
            <div
              className="h-full rounded-full bg-brote"
              style={{ width: `${Math.max(3, (row.value / max) * 100)}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Fila etiqueta/valor, para las fichas de datos. */
export function DataRow({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-line py-2.5 last:border-b-0">
      <dt className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
        {label}
      </dt>
      <dd className="text-right text-sm">{children}</dd>
    </div>
  );
}

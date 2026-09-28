import "server-only";

import { SIZE_ORDER, type SizeKey } from "@/lib/catalog";
import type { DesignMeta } from "@/lib/design";
import type { Quote } from "@/lib/pricing";

import { requireAdmin } from "./admin-auth";
import { prisma } from "./db";

/**
 * Consultas del panel. Todas empiezan con `requireAdmin()`: ninguna se puede
 * usar desde una página pública ni desde un action sin sesión, aunque alguien
 * se saltee el proxy.
 */

// ---------------------------------------------------------------------------
// Estados
// ---------------------------------------------------------------------------

export type OrderStatus =
  | "draft"
  | "pending"
  | "paid"
  | "in_production"
  | "ready"
  | "shipped"
  | "delivered"
  | "failed"
  | "cancelled";

export interface StatusMeta {
  key: OrderStatus;
  label: string;
  tone: "neutral" | "brote" | "alerta";
  /** Qué significa para el taller. */
  hint: string;
}

/** Orden del flujo real del taller, de arriba a abajo. */
export const ORDER_STATUSES: StatusMeta[] = [
  {
    key: "draft",
    label: "Sin pagar",
    tone: "neutral",
    hint: "Se creó el pedido pero nunca se pagó.",
  },
  {
    key: "pending",
    label: "Esperando pago",
    tone: "neutral",
    hint: "El link de pago está abierto.",
  },
  {
    key: "paid",
    label: "Pagado",
    tone: "brote",
    hint: "Cobrado. Falta aprobar el arte y mandarlo al taller.",
  },
  { key: "in_production", label: "En producción", tone: "brote", hint: "Estampando." },
  {
    key: "ready",
    label: "Listo",
    tone: "brote",
    hint: "Terminado, esperando retiro o despacho.",
  },
  { key: "shipped", label: "Enviado", tone: "brote", hint: "Despachado al cliente." },
  { key: "delivered", label: "Entregado", tone: "brote", hint: "Cerrado." },
  {
    key: "failed",
    label: "Pago rechazado",
    tone: "alerta",
    hint: "Mercado Pago rechazó el pago.",
  },
  { key: "cancelled", label: "Cancelado", tone: "alerta", hint: "Anulado o devuelto." },
];

export const STATUS_BY_KEY: Record<string, StatusMeta> = Object.fromEntries(
  ORDER_STATUSES.map((status) => [status.key, status]),
);

/** Estados que cuentan como plata cobrada. */
export const PAID_STATUSES: OrderStatus[] = [
  "paid",
  "in_production",
  "ready",
  "shipped",
  "delivered",
];

/** Estados que todavía tienen trabajo pendiente en el taller. */
export const OPEN_STATUSES: OrderStatus[] = ["paid", "in_production", "ready"];

export function statusLabel(status: string): string {
  return STATUS_BY_KEY[status]?.label ?? status;
}

// ---------------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------------

function startOfDay(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function daysAgo(days: number): Date {
  return startOfDay(new Date(Date.now() - days * 86_400_000));
}

/** Fecha que cuenta para facturar: la del cobro, no la de creación. */
function billingDate(order: { paidAt: Date | null; createdAt: Date }): Date {
  return order.paidAt ?? order.createdAt;
}

export function parseQuantities(raw: string): Partial<Record<SizeKey, number>> {
  try {
    return JSON.parse(raw) as Partial<Record<SizeKey, number>>;
  } catch {
    return {};
  }
}

export function parseQuote(raw: string): Quote | null {
  try {
    return JSON.parse(raw) as Quote;
  } catch {
    return null;
  }
}

export function parseDesignMeta(
  raw: string,
): (DesignMeta & { artUrls?: Record<string, string> }) | null {
  try {
    return JSON.parse(raw) as DesignMeta & { artUrls?: Record<string, string> };
  } catch {
    return null;
  }
}

export function sizeBreakdown(quantities: Partial<Record<SizeKey, number>>): string {
  return SIZE_ORDER.filter((size) => (quantities[size] ?? 0) > 0)
    .map((size) => `${size}×${quantities[size]}`)
    .join(" · ");
}

// ---------------------------------------------------------------------------
// Tablero
// ---------------------------------------------------------------------------

export interface DashboardTotals {
  revenue: number;
  orders: number;
  units: number;
}

export interface DashboardData {
  today: DashboardTotals;
  month: DashboardTotals;
  previousMonth: DashboardTotals;
  allTime: DashboardTotals & { averageTicket: number };
  pendingPayment: { count: number; amount: number };
  workload: Array<{ status: StatusMeta; count: number; units: number }>;
  series: Array<{ date: Date; revenue: number; orders: number }>;
  topProducts: Array<{ name: string; units: number; revenue: number }>;
  methodSplit: Array<{ method: string; units: number; revenue: number }>;
  topColors: Array<{ colorId: string; units: number }>;
  latest: Array<{
    id: string;
    code: string;
    status: string;
    customerName: string;
    total: number;
    units: number;
    createdAt: Date;
  }>;
  alerts: string[];
}

const SERIES_DAYS = 30;

export async function getDashboard(): Promise<DashboardData> {
  await requireAdmin();

  const since = daysAgo(SERIES_DAYS - 1);
  const todayStart = startOfDay(new Date());
  const monthStart = startOfDay(new Date());
  monthStart.setDate(1);
  const previousMonthStart = new Date(monthStart);
  previousMonthStart.setMonth(previousMonthStart.getMonth() - 1);

  const orders = await prisma.order.findMany({
    select: {
      id: true,
      code: true,
      status: true,
      customerName: true,
      total: true,
      createdAt: true,
      paidAt: true,
      items: {
        select: {
          productName: true,
          colorId: true,
          method: true,
          quantity: true,
          subtotal: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const paid = orders.filter((order) =>
    PAID_STATUSES.includes(order.status as OrderStatus),
  );

  const sum = (list: typeof paid): DashboardTotals => ({
    revenue: list.reduce((acc, order) => acc + order.total, 0),
    orders: list.length,
    units: list.reduce(
      (acc, order) => acc + order.items.reduce((n, item) => n + item.quantity, 0),
      0,
    ),
  });

  const today = sum(paid.filter((order) => billingDate(order) >= todayStart));
  const month = sum(paid.filter((order) => billingDate(order) >= monthStart));
  const previousMonth = sum(
    paid.filter(
      (order) =>
        billingDate(order) >= previousMonthStart && billingDate(order) < monthStart,
    ),
  );
  const allTime = sum(paid);

  // Serie diaria de los últimos 30 días, con los días vacíos incluidos.
  const buckets = new Map<string, { date: Date; revenue: number; orders: number }>();
  for (let i = 0; i < SERIES_DAYS; i++) {
    const date = daysAgo(SERIES_DAYS - 1 - i);
    buckets.set(date.toDateString(), { date, revenue: 0, orders: 0 });
  }
  for (const order of paid) {
    const date = startOfDay(billingDate(order));
    if (date < since) continue;
    const bucket = buckets.get(date.toDateString());
    if (!bucket) continue;
    bucket.revenue += order.total;
    bucket.orders += 1;
  }

  const productTotals = new Map<string, { units: number; revenue: number }>();
  const methodTotals = new Map<string, { units: number; revenue: number }>();
  const colorTotals = new Map<string, number>();

  for (const order of paid) {
    for (const item of order.items) {
      const product = productTotals.get(item.productName) ?? { units: 0, revenue: 0 };
      product.units += item.quantity;
      product.revenue += item.subtotal;
      productTotals.set(item.productName, product);

      const method = methodTotals.get(item.method) ?? { units: 0, revenue: 0 };
      method.units += item.quantity;
      method.revenue += item.subtotal;
      methodTotals.set(item.method, method);

      colorTotals.set(item.colorId, (colorTotals.get(item.colorId) ?? 0) + item.quantity);
    }
  }

  const workload = ORDER_STATUSES.map((status) => {
    const list = orders.filter((order) => order.status === status.key);
    return {
      status,
      count: list.length,
      units: list.reduce(
        (acc, order) => acc + order.items.reduce((n, item) => n + item.quantity, 0),
        0,
      ),
    };
  });

  const waiting = orders.filter(
    (order) => order.status === "pending" || order.status === "draft",
  );

  const alerts: string[] = [];
  const toProduce = orders.filter((order) => order.status === "paid").length;
  if (toProduce > 0) {
    alerts.push(
      toProduce === 1
        ? "1 pedido pagado espera entrar a producción."
        : `${toProduce} pedidos pagados esperan entrar a producción.`,
    );
  }
  const readyToShip = orders.filter((order) => order.status === "ready").length;
  if (readyToShip > 0) {
    alerts.push(
      readyToShip === 1
        ? "1 pedido está listo para entregar."
        : `${readyToShip} pedidos están listos para entregar.`,
    );
  }
  const stale = orders.filter(
    (order) =>
      order.status === "pending" &&
      Date.now() - order.createdAt.getTime() > 3 * 86_400_000,
  ).length;
  if (stale > 0) {
    alerts.push(
      stale === 1
        ? "1 pedido lleva más de 3 días esperando el pago."
        : `${stale} pedidos llevan más de 3 días esperando el pago.`,
    );
  }

  return {
    today,
    month,
    previousMonth,
    allTime: {
      ...allTime,
      averageTicket: allTime.orders > 0 ? Math.round(allTime.revenue / allTime.orders) : 0,
    },
    pendingPayment: {
      count: waiting.length,
      amount: waiting.reduce((acc, order) => acc + order.total, 0),
    },
    workload,
    series: [...buckets.values()],
    topProducts: [...productTotals.entries()]
      .map(([name, totals]) => ({ name, ...totals }))
      .sort((a, b) => b.units - a.units)
      .slice(0, 5),
    methodSplit: [...methodTotals.entries()]
      .map(([method, totals]) => ({ method, ...totals }))
      .sort((a, b) => b.units - a.units),
    topColors: [...colorTotals.entries()]
      .map(([colorId, units]) => ({ colorId, units }))
      .sort((a, b) => b.units - a.units)
      .slice(0, 6),
    latest: orders.slice(0, 8).map((order) => ({
      id: order.id,
      code: order.code,
      status: order.status,
      customerName: order.customerName,
      total: order.total,
      units: order.items.reduce((acc, item) => acc + item.quantity, 0),
      createdAt: order.createdAt,
    })),
    alerts,
  };
}

// ---------------------------------------------------------------------------
// Listado de pedidos
// ---------------------------------------------------------------------------

export interface OrderFilters {
  status?: string;
  q?: string;
  from?: string;
  to?: string;
  page?: number;
}

export const ORDERS_PAGE_SIZE = 25;

function whereFrom(filters: OrderFilters) {
  const where: Record<string, unknown> = {};

  if (filters.status === "abiertos") {
    where.status = { in: OPEN_STATUSES };
  } else if (filters.status === "cobrados") {
    where.status = { in: PAID_STATUSES };
  } else if (filters.status && STATUS_BY_KEY[filters.status]) {
    where.status = filters.status;
  }

  const term = filters.q?.trim();
  if (term) {
    // `mode: "insensitive"` es de Postgres: sin esto buscar "jorge" no
    // encontraría a "Jorge", porque el LIKE de Postgres distingue mayúsculas.
    where.OR = [
      { code: { contains: term, mode: "insensitive" } },
      { customerName: { contains: term, mode: "insensitive" } },
      { customerEmail: { contains: term, mode: "insensitive" } },
      { customerPhone: { contains: term } },
    ];
  }

  const createdAt: Record<string, Date> = {};
  if (filters.from) {
    const from = new Date(`${filters.from}T00:00:00`);
    if (!Number.isNaN(from.getTime())) createdAt.gte = from;
  }
  if (filters.to) {
    const to = new Date(`${filters.to}T23:59:59.999`);
    if (!Number.isNaN(to.getTime())) createdAt.lte = to;
  }
  if (Object.keys(createdAt).length > 0) where.createdAt = createdAt;

  return where;
}

export async function listOrders(filters: OrderFilters) {
  await requireAdmin();
  const page = Math.max(1, filters.page ?? 1);
  const where = whereFrom(filters);

  const [total, rows, matched] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * ORDERS_PAGE_SIZE,
      take: ORDERS_PAGE_SIZE,
      include: {
        items: { select: { quantity: true, productName: true, method: true } },
      },
    }),
    prisma.order.findMany({ where, select: { total: true, status: true } }),
  ]);

  return {
    rows,
    total,
    page,
    pages: Math.max(1, Math.ceil(total / ORDERS_PAGE_SIZE)),
    /** Lo cobrado dentro del filtro actual, no de toda la tabla. */
    filteredRevenue: matched
      .filter((order) => PAID_STATUSES.includes(order.status as OrderStatus))
      .reduce((acc, order) => acc + order.total, 0),
  };
}

export async function getOrderDetail(id: string) {
  await requireAdmin();
  return prisma.order.findUnique({
    where: { id },
    include: {
      items: { include: { design: true } },
      events: { orderBy: { createdAt: "desc" } },
    },
  });
}

export async function ordersForExport(filters: OrderFilters) {
  await requireAdmin();
  return prisma.order.findMany({
    where: whereFrom(filters),
    orderBy: { createdAt: "desc" },
    take: 5000,
    include: {
      items: {
        select: { quantity: true, productName: true, method: true, quantities: true },
      },
    },
  });
}

// ---------------------------------------------------------------------------
// Cola de taller
// ---------------------------------------------------------------------------

export async function getProductionQueue() {
  await requireAdmin();
  const orders = await prisma.order.findMany({
    where: { status: { in: OPEN_STATUSES } },
    orderBy: [{ dueDate: "asc" }, { paidAt: "asc" }, { createdAt: "asc" }],
    include: { items: { include: { design: true } } },
  });

  /** Totales por talle de toda la cola: lo que hay que tener en stock. */
  const sizeTotals: Partial<Record<SizeKey, number>> = {};
  const colorTotals = new Map<string, number>();
  for (const order of orders) {
    for (const item of order.items) {
      const quantities = parseQuantities(item.quantities);
      for (const size of SIZE_ORDER) {
        const quantity = quantities[size] ?? 0;
        if (quantity > 0) sizeTotals[size] = (sizeTotals[size] ?? 0) + quantity;
      }
      colorTotals.set(item.colorId, (colorTotals.get(item.colorId) ?? 0) + item.quantity);
    }
  }

  return {
    orders,
    sizeTotals,
    colorTotals: [...colorTotals.entries()]
      .map(([colorId, units]) => ({ colorId, units }))
      .sort((a, b) => b.units - a.units),
    units: orders.reduce(
      (acc, order) => acc + order.items.reduce((n, item) => n + item.quantity, 0),
      0,
    ),
  };
}

// ---------------------------------------------------------------------------
// Clientes
// ---------------------------------------------------------------------------

export interface CustomerRow {
  email: string;
  name: string;
  phone: string;
  orders: number;
  paidOrders: number;
  units: number;
  spent: number;
  firstAt: Date;
  lastAt: Date;
}

export async function listCustomers(query?: string): Promise<CustomerRow[]> {
  await requireAdmin();
  const orders = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    include: { items: { select: { quantity: true } } },
  });

  const byEmail = new Map<string, CustomerRow>();
  for (const order of orders) {
    const email = order.customerEmail.toLowerCase();
    const units = order.items.reduce((acc, item) => acc + item.quantity, 0);
    const isPaid = PAID_STATUSES.includes(order.status as OrderStatus);
    const existing = byEmail.get(email);

    if (!existing) {
      byEmail.set(email, {
        email,
        name: order.customerName,
        phone: order.customerPhone,
        orders: 1,
        paidOrders: isPaid ? 1 : 0,
        units: isPaid ? units : 0,
        spent: isPaid ? order.total : 0,
        firstAt: order.createdAt,
        lastAt: order.createdAt,
      });
      continue;
    }

    existing.orders += 1;
    if (isPaid) {
      existing.paidOrders += 1;
      existing.units += units;
      existing.spent += order.total;
    }
    if (order.createdAt < existing.firstAt) existing.firstAt = order.createdAt;
    if (order.createdAt > existing.lastAt) existing.lastAt = order.createdAt;
  }

  const rows = [...byEmail.values()].sort((a, b) => b.spent - a.spent);
  const term = query?.trim().toLowerCase();
  if (!term) return rows;
  return rows.filter(
    (row) =>
      row.email.includes(term) ||
      row.name.toLowerCase().includes(term) ||
      row.phone.includes(term),
  );
}

// ---------------------------------------------------------------------------
// Diseños
// ---------------------------------------------------------------------------

export const DESIGNS_PAGE_SIZE = 24;

export async function listDesigns(page = 1, onlyOrdered = false) {
  await requireAdmin();
  const current = Math.max(1, page);
  const where = onlyOrdered ? { orderItems: { some: {} } } : {};

  const [total, rows] = await Promise.all([
    prisma.design.count({ where }),
    prisma.design.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (current - 1) * DESIGNS_PAGE_SIZE,
      take: DESIGNS_PAGE_SIZE,
      include: {
        orderItems: {
          select: { id: true, order: { select: { id: true, code: true, status: true } } },
        },
      },
    }),
  ]);

  return {
    rows,
    total,
    page: current,
    pages: Math.max(1, Math.ceil(total / DESIGNS_PAGE_SIZE)),
  };
}

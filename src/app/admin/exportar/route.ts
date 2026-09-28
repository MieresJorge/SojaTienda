import { getAdminSession } from "@/server/admin-auth";
import {
  ordersForExport,
  parseQuantities,
  sizeBreakdown,
  statusLabel,
} from "@/server/admin";
import { PRINT_METHODS, type PrintMethod } from "@/lib/catalog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Exporta los pedidos filtrados a CSV, para abrirlo en Excel o mandárselo al
 * contador. Respeta exactamente los mismos filtros que la pantalla.
 *
 * Un route handler es un endpoint público: la sesión se verifica acá, no
 * alcanza con que el proxy cubra /admin.
 */

/** Excel en es-AR espera `;` como separador y coma decimal. */
const SEPARATOR = ";";

function cell(value: string | number | null | undefined): string {
  const text = String(value ?? "");
  return /[";\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

const DATE_FORMAT = new Intl.DateTimeFormat("es-AR", {
  dateStyle: "short",
  timeStyle: "short",
});

export async function GET(request: Request) {
  const session = await getAdminSession();
  if (!session) {
    return new Response("No autorizado", { status: 401 });
  }

  const url = new URL(request.url);
  const orders = await ordersForExport({
    status: url.searchParams.get("status") ?? undefined,
    q: url.searchParams.get("q") ?? undefined,
    from: url.searchParams.get("from") ?? undefined,
    to: url.searchParams.get("to") ?? undefined,
  });

  const header = [
    "Codigo",
    "Fecha",
    "Fecha de cobro",
    "Estado",
    "Cliente",
    "Email",
    "Telefono",
    "Documento",
    "Entrega",
    "Direccion",
    "Prendas",
    "Detalle",
    "Talles",
    "Subtotal prendas",
    "Preparacion",
    "Envio",
    "Total",
    "Seguimiento",
    "Notas del cliente",
    "Notas internas",
  ];

  const lines = [header.join(SEPARATOR)];

  for (const order of orders) {
    const units = order.items.reduce((acc, item) => acc + item.quantity, 0);
    const detail = order.items
      .map(
        (item) =>
          `${item.productName} (${PRINT_METHODS[item.method as PrintMethod]?.name ?? item.method})`,
      )
      .join(" + ");
    const sizes = order.items
      .map((item) => sizeBreakdown(parseQuantities(item.quantities)))
      .filter(Boolean)
      .join(" + ");
    const address =
      order.shippingMethod === "envio"
        ? [order.addressStreet, order.addressCity, order.addressState, order.addressZip]
            .filter(Boolean)
            .join(", ")
        : "";

    lines.push(
      [
        order.code,
        DATE_FORMAT.format(order.createdAt),
        order.paidAt ? DATE_FORMAT.format(order.paidAt) : "",
        statusLabel(order.status),
        order.customerName,
        order.customerEmail,
        order.customerPhone,
        order.customerDoc ?? "",
        order.shippingMethod === "envio" ? "Envío" : "Retiro",
        address,
        units,
        detail,
        sizes,
        order.itemsSubtotal,
        order.setupTotal,
        order.shippingCost,
        order.total,
        order.trackingCode ?? "",
        order.notes ?? "",
        order.adminNotes ?? "",
      ]
        .map(cell)
        .join(SEPARATOR),
    );
  }

  const today = new Date().toISOString().slice(0, 10);
  // BOM para que Excel reconozca UTF-8 y no rompa los acentos.
  const csv = `﻿${lines.join("\r\n")}\r\n`;

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="soja-pedidos-${today}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}

import "server-only";

import { z } from "zod";

import { PRINT_METHODS } from "@/lib/catalog";
import { nanoid, orderCode } from "@/lib/id";

import { prisma } from "./db";
import { quantitiesSchema, quoteStoredDesign, QuoteError } from "./quote";
import { getSettings, shippingCostWith } from "./settings";

export const checkoutSchema = z.object({
  items: z
    .array(
      z.object({
        designId: z.string().min(1).max(64),
        quantities: quantitiesSchema,
      }),
    )
    .min(1)
    .max(20),
  customer: z.object({
    name: z.string().trim().min(2).max(120),
    email: z.string().trim().email().max(160),
    phone: z.string().trim().min(6).max(40),
    doc: z.string().trim().max(20).optional().or(z.literal("")),
  }),
  shipping: z.discriminatedUnion("method", [
    z.object({ method: z.literal("pickup") }),
    z.object({
      method: z.literal("envio"),
      street: z.string().trim().min(4).max(160),
      city: z.string().trim().min(2).max(80),
      state: z.string().trim().min(2).max(80),
      zip: z.string().trim().min(3).max(12),
    }),
  ]),
  notes: z.string().trim().max(600).optional().or(z.literal("")),
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;

/** La tienda está en pausa desde el panel: no se aceptan pedidos nuevos. */
export class StorePausedError extends Error {}

/**
 * Anota un hecho en la bitácora del pedido. Es sólo append: el panel muestra
 * esta lista como historial y nada la edita.
 */
export async function recordOrderEvent(
  orderId: string,
  kind: "status" | "note" | "payment" | "shipping" | "system",
  message: string,
  actor: "admin" | "cliente" | "mercadopago" | "sistema" = "admin",
): Promise<void> {
  try {
    await prisma.orderEvent.create({
      data: { id: nanoid(), orderId, kind, message: message.slice(0, 600), actor },
    });
  } catch (error) {
    // La bitácora nunca puede tumbar un cobro.
    console.error("[orders] no se pudo registrar el evento", error);
  }
}

export interface CreatedOrder {
  id: string;
  code: string;
  total: number;
  itemsSubtotal: number;
  setupTotal: number;
  shippingCost: number;
  lines: Array<{
    designId: string;
    title: string;
    description: string;
    quantity: number;
    subtotal: number;
  }>;
}

/**
 * Crea el pedido recalculando TODOS los precios desde los diseños guardados.
 * Lo que mandó el navegador sólo aporta qué diseño y cuántas unidades.
 */
export async function createOrder(input: CheckoutInput): Promise<CreatedOrder> {
  const settings = await getSettings();
  if (settings.storePaused) {
    throw new StorePausedError(
      settings.storeNotice ||
        "Estamos con los pedidos pausados por unos días. Escribinos y te avisamos cuando reabrimos.",
    );
  }

  const priced = [];
  for (const item of input.items) {
    const { doc, quote, productName } = await quoteStoredDesign(
      item.designId,
      item.quantities,
    );
    priced.push({ item, doc, quote, productName });
  }

  if (priced.length === 0) {
    throw new QuoteError("El carrito está vacío.");
  }

  const itemsSubtotal = priced.reduce((acc, line) => acc + line.quote.itemsSubtotal, 0);
  const setupTotal = priced.reduce((acc, line) => acc + line.quote.setupTotal, 0);
  const shippingCost = shippingCostWith(
    settings,
    input.shipping.method,
    itemsSubtotal + setupTotal,
  );
  const total = itemsSubtotal + setupTotal + shippingCost;

  const id = nanoid();
  const code = orderCode();

  await prisma.order.create({
    data: {
      id,
      code,
      status: "draft",
      customerName: input.customer.name,
      customerEmail: input.customer.email,
      customerPhone: input.customer.phone,
      customerDoc: input.customer.doc || null,
      shippingMethod: input.shipping.method,
      shippingCost,
      addressStreet: input.shipping.method === "envio" ? input.shipping.street : null,
      addressCity: input.shipping.method === "envio" ? input.shipping.city : null,
      addressState: input.shipping.method === "envio" ? input.shipping.state : null,
      addressZip: input.shipping.method === "envio" ? input.shipping.zip : null,
      notes: input.notes || null,
      itemsSubtotal,
      setupTotal,
      total,
      items: {
        create: priced.map((line) => ({
          id: nanoid(),
          designId: line.item.designId,
          productId: line.doc.productId,
          productName: line.productName,
          colorId: line.doc.colorId,
          method: line.doc.method,
          rush: line.doc.rush,
          quantities: JSON.stringify(line.item.quantities),
          quote: JSON.stringify(line.quote),
          quantity: line.quote.totalQuantity,
          subtotal: line.quote.total,
        })),
      },
    },
  });

  await recordOrderEvent(
    id,
    "system",
    `Pedido creado desde la web · ${priced.reduce((acc, line) => acc + line.quote.totalQuantity, 0)} prendas.`,
    "cliente",
  );

  return {
    id,
    code,
    total,
    itemsSubtotal,
    setupTotal,
    shippingCost,
    lines: priced.map((line) => ({
      designId: line.item.designId,
      title: `${line.productName} · ${line.quote.totalQuantity} u.`,
      description: `${PRINT_METHODS[line.doc.method].name}${
        line.doc.rush ? " · exprés" : ""
      }`,
      quantity: 1,
      subtotal: line.quote.total,
    })),
  };
}

export async function markOrderStatus(
  orderId: string,
  status: string,
  payment?: { id?: string; status?: string; raw?: unknown },
) {
  const previous = await prisma.order.findUnique({
    where: { id: orderId },
    select: { status: true, paidAt: true },
  });

  await prisma.order.update({
    where: { id: orderId },
    data: {
      status,
      // La fecha de cobro se sella una sola vez: es la que se factura.
      paidAt:
        status === "paid" && !previous?.paidAt ? new Date() : (previous?.paidAt ?? undefined),
      mpPaymentId: payment?.id ?? undefined,
      mpStatus: payment?.status ?? undefined,
      mpRaw: payment?.raw ? JSON.stringify(payment.raw).slice(0, 20000) : undefined,
    },
  });

  if (previous && previous.status !== status) {
    await recordOrderEvent(
      orderId,
      payment ? "payment" : "status",
      `Estado: ${previous.status} -> ${status}${payment?.status ? ` (Mercado Pago: ${payment.status})` : ""}.`,
      payment ? "mercadopago" : "sistema",
    );
  }
}

export async function findOrderByCode(code: string) {
  return prisma.order.findUnique({
    where: { code },
    include: { items: { include: { design: true } } },
  });
}

import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/server/db";
import { createPreference, paymentsEnabled } from "@/server/mercadopago";
import {
  checkoutSchema,
  createOrder,
  markOrderStatus,
  recordOrderEvent,
  StorePausedError,
} from "@/server/orders";
import { QuoteError } from "@/server/quote";

export const runtime = "nodejs";

/**
 * Crea el pedido y devuelve a dónde mandar al cliente.
 *
 * Sin credenciales de Mercado Pago el pedido queda en modo simulado (pagado),
 * para poder recorrer todo el flujo en desarrollo.
 */
export async function POST(request: Request) {
  try {
    const input = checkoutSchema.parse(await request.json());
    const order = await createOrder(input);

    if (!paymentsEnabled()) {
      await markOrderStatus(order.id, "paid", { status: "simulado" });
      return NextResponse.json({
        orderCode: order.code,
        redirectUrl: `/pedido/${order.code}?simulado=1`,
        simulated: true,
      });
    }

    const items = order.lines.map((line) => ({
      id: line.designId,
      title: line.title,
      description: line.description,
      quantity: 1,
      unitPrice: line.subtotal,
    }));

    if (order.shippingCost > 0) {
      items.push({
        id: "envio",
        title: "Envío a domicilio",
        description: "Correo Argentino / Andreani",
        quantity: 1,
        unitPrice: order.shippingCost,
      });
    }

    const { preferenceId, redirectUrl } = await createPreference({
      orderId: order.id,
      orderCode: order.code,
      items,
      payer: {
        name: input.customer.name,
        email: input.customer.email,
        phone: input.customer.phone,
      },
    });

    await prisma.order.update({
      where: { id: order.id },
      data: { status: "pending", mpPreferenceId: preferenceId },
    });
    await recordOrderEvent(
      order.id,
      "payment",
      "Se generó el link de pago de Mercado Pago.",
      "sistema",
    );

    return NextResponse.json({
      orderCode: order.code,
      redirectUrl,
      simulated: false,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Revisá los datos del formulario.", detail: error.issues },
        { status: 400 },
      );
    }
    if (error instanceof StorePausedError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    if (error instanceof QuoteError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("[checkout]", error);
    return NextResponse.json(
      { error: "No pudimos iniciar el pago. Probá de nuevo en un momento." },
      { status: 500 },
    );
  }
}

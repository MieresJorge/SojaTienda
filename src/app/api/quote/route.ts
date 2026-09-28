import { NextResponse } from "next/server";
import { z } from "zod";

import { quantitiesSchema, quoteStoredDesign, QuoteError } from "@/server/quote";

export const runtime = "nodejs";

const bodySchema = z.object({
  items: z
    .array(
      z.object({
        designId: z.string().min(1).max(64),
        quantities: quantitiesSchema,
      }),
    )
    .min(1)
    .max(20),
  shippingMethod: z.enum(["pickup", "envio"]).default("pickup"),
});

/**
 * Totales autoritativos del carrito, calculados en el servidor.
 * El checkout los muestra para que el importe a pagar no sorprenda a nadie.
 */
export async function POST(request: Request) {
  try {
    const body = bodySchema.parse(await request.json());

    const lines = [];
    for (const item of body.items) {
      const { quote, productName } = await quoteStoredDesign(
        item.designId,
        item.quantities,
      );
      lines.push({
        designId: item.designId,
        productName,
        quantity: quote.totalQuantity,
        itemsSubtotal: quote.itemsSubtotal,
        setupTotal: quote.setupTotal,
        total: quote.total,
        averageUnitPrice: quote.averageUnitPrice,
      });
    }

    const itemsSubtotal = lines.reduce((acc, line) => acc + line.itemsSubtotal, 0);
    const setupTotal = lines.reduce((acc, line) => acc + line.setupTotal, 0);
    const flat = Number(process.env.SOJA_SHIPPING_FLAT ?? 6500);
    const freeFrom = Number(process.env.SOJA_FREE_SHIPPING_FROM ?? 250000);
    const merchandise = itemsSubtotal + setupTotal;
    const shippingCost =
      body.shippingMethod === "envio" && merchandise < freeFrom ? flat : 0;

    return NextResponse.json({
      lines,
      itemsSubtotal,
      setupTotal,
      shippingCost,
      freeShippingFrom: freeFrom,
      total: merchandise + shippingCost,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Carrito inválido." }, { status: 400 });
    }
    if (error instanceof QuoteError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("[quote]", error);
    return NextResponse.json(
      { error: "No pudimos calcular el total." },
      { status: 500 },
    );
  }
}

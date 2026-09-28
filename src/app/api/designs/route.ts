import { NextResponse } from "next/server";
import { z } from "zod";

import { getProduct } from "@/lib/catalog";
import { computeDesignMeta, designDocSchema, LOCATION_KEYS } from "@/lib/design";
import { nanoid } from "@/lib/id";
import { prisma } from "@/server/db";
import { quantitiesSchema, quoteDoc, QuoteError } from "@/server/quote";
import { putDataUrl, StorageError } from "@/server/storage";

export const runtime = "nodejs";

const bodySchema = z.object({
  doc: designDocSchema,
  quantities: quantitiesSchema.default({}),
  previews: z
    .object({
      frente: z.string().optional(),
      espalda: z.string().optional(),
    })
    .default({}),
  artwork: z
    .array(
      z.object({
        location: z.enum(LOCATION_KEYS),
        dataUrl: z.string(),
      }),
    )
    .max(4)
    .default([]),
});

/**
 * Guarda el diseño y devuelve la cotización calculada en el servidor.
 * El diseño es inmutable: cada vez que se agrega al carrito se crea uno nuevo.
 */
export async function POST(request: Request) {
  try {
    const body = bodySchema.parse(await request.json());
    const product = getProduct(body.doc.productId);
    if (!product) {
      return NextResponse.json(
        { error: "El producto no está disponible." },
        { status: 400 },
      );
    }

    const { quote } = quoteDoc(body.doc, body.quantities);
    const meta = computeDesignMeta(body.doc, product);

    const previewFrontUrl = body.previews.frente
      ? (await putDataUrl(body.previews.frente, "mockups")).url
      : null;
    const previewBackUrl = body.previews.espalda
      ? (await putDataUrl(body.previews.espalda, "mockups")).url
      : null;

    // Archivos de arte en alta, listos para el taller.
    const artUrls: Record<string, string> = {};
    for (const item of body.artwork) {
      artUrls[item.location] = (await putDataUrl(item.dataUrl, "produccion")).url;
    }

    const design = await prisma.design.create({
      data: {
        id: nanoid(),
        productId: body.doc.productId,
        colorId: body.doc.colorId,
        method: body.doc.method,
        doc: JSON.stringify(body.doc),
        meta: JSON.stringify({ ...meta, artUrls }),
        previewFrontUrl,
        previewBackUrl,
      },
    });

    return NextResponse.json({
      designId: design.id,
      previewFrontUrl,
      previewBackUrl,
      quote,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "El diseño tiene datos inválidos.", detail: error.issues },
        { status: 400 },
      );
    }
    if (error instanceof QuoteError || error instanceof StorageError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("[designs]", error);
    return NextResponse.json(
      { error: "No pudimos guardar el diseño." },
      { status: 500 },
    );
  }
}

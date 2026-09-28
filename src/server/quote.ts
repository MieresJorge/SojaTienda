import "server-only";

import { z } from "zod";

import { getProduct, SIZE_ORDER, type SizeKey } from "@/lib/catalog";
import {
  computeDesignMeta,
  designDocSchema,
  quoteLocationsFromMeta,
  type DesignDoc,
} from "@/lib/design";
import { buildQuote, type Quote } from "@/lib/pricing";

import { prisma } from "./db";

/** Cantidades por talle. Todos los talles son opcionales. */
export const quantitiesSchema = z.partialRecord(
  z.enum(SIZE_ORDER as [SizeKey, ...SizeKey[]]),
  z.number().int().min(0).max(9999),
);

export type Quantities = z.infer<typeof quantitiesSchema>;

export class QuoteError extends Error {}

/**
 * Cotiza un diseño guardado. Es la única función que usa el checkout:
 * el precio siempre sale del documento que está en la base, nunca del cliente.
 */
export async function quoteStoredDesign(
  designId: string,
  quantities: Quantities,
): Promise<{ doc: DesignDoc; quote: Quote; productName: string }> {
  const design = await prisma.design.findUnique({ where: { id: designId } });
  if (!design) {
    throw new QuoteError("El diseño ya no está disponible. Volvé a crearlo.");
  }

  const doc = designDocSchema.parse(JSON.parse(design.doc));
  return { ...quoteDoc(doc, quantities) };
}

export function quoteDoc(
  doc: DesignDoc,
  quantities: Quantities,
): { doc: DesignDoc; quote: Quote; productName: string } {
  const product = getProduct(doc.productId);
  if (!product) {
    throw new QuoteError("El producto ya no está en el catálogo.");
  }

  const meta = computeDesignMeta(doc, product);
  const quote = buildQuote({
    productId: doc.productId,
    colorId: doc.colorId,
    method: doc.method,
    rush: doc.rush,
    locations: quoteLocationsFromMeta(meta),
    quantities,
  });

  if (quote.totalQuantity < product.minQty) {
    throw new QuoteError(
      `El mínimo para ${product.name} es de ${product.minQty} prendas.`,
    );
  }

  return { doc, quote, productName: product.name };
}

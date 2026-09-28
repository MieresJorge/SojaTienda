"use client";

import { useMemo } from "react";

import { getColor, getProduct } from "@/lib/catalog";
import { computeDesignMeta, quoteLocationsFromMeta, type DesignDoc } from "@/lib/design";
import { useDesigner } from "@/lib/designer-store";
import { buildQuote, priceLadder, type Quote } from "@/lib/pricing";

/** Cotización en vivo del diseño actual. El servidor la recalcula al cobrar. */
export function useDesignQuote() {
  const productId = useDesigner((s) => s.productId);
  const colorId = useDesigner((s) => s.colorId);
  const method = useDesigner((s) => s.method);
  const rush = useDesigner((s) => s.rush);
  const objects = useDesigner((s) => s.objects);
  const quantities = useDesigner((s) => s.quantities);

  const product = getProduct(productId);
  const color = product ? getColor(product, colorId) : undefined;

  const doc = useMemo<DesignDoc>(
    () => ({ version: 1, productId, colorId, method, rush, objects }),
    [productId, colorId, method, rush, objects],
  );

  const meta = useMemo(() => computeDesignMeta(doc, product), [doc, product]);

  const quoteInput = useMemo(
    () => ({
      productId,
      colorId,
      method,
      rush,
      locations: quoteLocationsFromMeta(meta),
      quantities,
    }),
    [productId, colorId, method, rush, meta, quantities],
  );

  const quote = useMemo<Quote | null>(() => {
    if (!product) return null;
    return buildQuote(quoteInput);
  }, [product, quoteInput]);

  const ladder = useMemo(
    () => (product ? priceLadder(quoteInput) : []),
    [product, quoteInput],
  );

  return { product, color, doc, meta, quote, ladder };
}

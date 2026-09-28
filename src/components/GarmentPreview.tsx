import { MOCKUP_HEIGHT, MOCKUP_WIDTH, type Product, type ViewKey } from "@/lib/catalog";
import { garmentInnerSvg } from "@/lib/garment-svg";

/** Mockup estático de una prenda, para catálogo y páginas de contenido. */
export function GarmentPreview({
  product,
  colorHex,
  shade,
  seam,
  view = "frente",
  className,
  id,
}: {
  product: Product;
  colorHex: string;
  shade: "clara" | "oscura";
  seam?: string;
  view?: ViewKey;
  className?: string;
  id: string;
}) {
  return (
    <svg
      viewBox={`0 0 ${MOCKUP_WIDTH} ${MOCKUP_HEIGHT}`}
      className={className}
      role="img"
      aria-label={`${product.name}, vista ${view}`}
      dangerouslySetInnerHTML={{
        __html: garmentInnerSvg({
          silhouette: product.silhouette,
          view,
          color: colorHex,
          seam,
          shade,
          idPrefix: id,
        }),
      }}
    />
  );
}

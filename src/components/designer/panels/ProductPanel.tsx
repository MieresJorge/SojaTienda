"use client";

import { getProduct, PRODUCTS } from "@/lib/catalog";
import { useDesigner } from "@/lib/designer-store";
import { money } from "@/lib/format";
import { cx, PanelSection } from "@/components/ui";

export function ProductPanel() {
  const productId = useDesigner((s) => s.productId);
  const colorId = useDesigner((s) => s.colorId);
  const activeLocation = useDesigner((s) => s.activeLocation);
  const setProduct = useDesigner((s) => s.setProduct);
  const setColor = useDesigner((s) => s.setColor);
  const setActiveLocation = useDesigner((s) => s.setActiveLocation);

  const product = getProduct(productId);
  if (!product) return null;

  return (
    <>
      <PanelSection title="Prenda" description="Todas en talles S al 3XL.">
        <div className="space-y-2">
          {PRODUCTS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setProduct(item.id)}
              className={cx(
                "w-full rounded-xl border p-3 text-left transition-colors",
                item.id === productId
                  ? "border-ink bg-surface"
                  : "border-line bg-surface/60 hover:border-ink-muted",
              )}
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-sm font-semibold">{item.shortName}</span>
                <span className="text-xs text-ink-muted">
                  desde {money(item.basePrice)}
                </span>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-ink-muted">
                {item.fabric}
              </p>
            </button>
          ))}
        </div>
      </PanelSection>

      <PanelSection
        title="Color de la prenda"
        description={product.colors.find((c) => c.id === colorId)?.name}
      >
        <div className="grid grid-cols-8 gap-1.5">
          {product.colors.map((color) => (
            <button
              key={color.id}
              type="button"
              title={color.name}
              onClick={() => setColor(color.id)}
              style={{ backgroundColor: color.hex }}
              className={cx(
                "aspect-square rounded-full border transition-transform hover:scale-110",
                color.id === colorId
                  ? "border-ink ring-2 ring-ink/25"
                  : "border-line",
              )}
            >
              <span className="sr-only">{color.name}</span>
            </button>
          ))}
        </div>
      </PanelSection>

      <PanelSection
        title="Dónde estampar"
        description="Elegí la zona y después agregá texto o arte."
      >
        <div className="grid grid-cols-2 gap-2">
          {product.locations.map((location) => (
            <button
              key={location.key}
              type="button"
              onClick={() => setActiveLocation(location.key)}
              className={cx(
                "rounded-lg border px-3 py-2 text-left text-xs transition-colors",
                location.key === activeLocation
                  ? "border-ink bg-surface font-semibold"
                  : "border-line bg-surface/60 text-ink-soft hover:border-ink-muted",
              )}
            >
              {location.label}
              <span className="mt-0.5 block text-[11px] font-normal text-ink-muted">
                {location.realWidthCm}×{location.realHeightCm} cm
              </span>
            </button>
          ))}
        </div>
      </PanelSection>
    </>
  );
}

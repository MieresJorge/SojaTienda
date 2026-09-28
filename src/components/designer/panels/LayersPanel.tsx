"use client";

import { getProduct } from "@/lib/catalog";
import { computeDesignMeta } from "@/lib/design";
import { useDesigner } from "@/lib/designer-store";
import { Badge, Button, cx, PanelSection } from "@/components/ui";

function describe(kind: string, label: string): string {
  if (kind === "text") return `Texto · ${label}`;
  if (kind === "image") return `Imagen · ${label || "archivo"}`;
  return `Forma · ${label}`;
}

export function LayersPanel() {
  const productId = useDesigner((s) => s.productId);
  const objects = useDesigner((s) => s.objects);
  const selectedId = useDesigner((s) => s.selectedId);
  const select = useDesigner((s) => s.select);
  const reorder = useDesigner((s) => s.reorder);
  const duplicateObject = useDesigner((s) => s.duplicateObject);
  const removeObject = useDesigner((s) => s.removeObject);
  const setActiveLocation = useDesigner((s) => s.setActiveLocation);
  const resetDesign = useDesigner((s) => s.resetDesign);

  const product = getProduct(productId);
  if (!product) return null;

  const meta = computeDesignMeta(
    { version: 1, productId, colorId: "x", method: "serigrafia", rush: false, objects },
    product,
  );

  return (
    <>
      {product.locations.map((location) => {
        const inLocation = objects.filter((o) => o.location === location.key);
        const locationMeta = meta.locations.find((l) => l.location === location.key);
        if (inLocation.length === 0) return null;

        return (
          <PanelSection
            key={location.key}
            title={location.label}
            description={
              locationMeta && locationMeta.objectCount > 0
                ? `${locationMeta.widthCm} × ${locationMeta.heightCm} cm · ${locationMeta.colorCount} ${
                    locationMeta.colorCount === 1 ? "color" : "colores"
                  }`
                : undefined
            }
            action={
              locationMeta?.overflows ? <Badge tone="alerta">Se pasa</Badge> : null
            }
          >
            <ul className="space-y-1.5">
              {/* El último del array se dibuja arriba: lo mostramos primero. */}
              {[...inLocation].reverse().map((object) => (
                <li
                  key={object.id}
                  className={cx(
                    "flex items-center gap-2 rounded-lg border px-2.5 py-2 text-xs transition-colors",
                    object.id === selectedId
                      ? "border-ink bg-surface"
                      : "border-line bg-surface/60",
                  )}
                >
                  <button
                    type="button"
                    className="flex-1 truncate text-left"
                    onClick={() => {
                      setActiveLocation(object.location);
                      select(object.id);
                    }}
                  >
                    {describe(
                      object.kind,
                      object.kind === "text"
                        ? object.text
                        : object.kind === "image"
                          ? object.name
                          : object.shape,
                    )}
                  </button>
                  <button
                    type="button"
                    title="Subir"
                    className="px-1 text-ink-muted hover:text-ink"
                    onClick={() => reorder(object.id, "adelante")}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    title="Bajar"
                    className="px-1 text-ink-muted hover:text-ink"
                    onClick={() => reorder(object.id, "atras")}
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    title="Duplicar"
                    className="px-1 text-ink-muted hover:text-ink"
                    onClick={() => duplicateObject(object.id)}
                  >
                    ⧉
                  </button>
                  <button
                    type="button"
                    title="Eliminar"
                    className="px-1 text-ink-muted hover:text-alerta"
                    onClick={() => removeObject(object.id)}
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          </PanelSection>
        );
      })}

      {objects.length === 0 ? (
        <PanelSection title="Capas">
          <p className="text-xs leading-relaxed text-ink-muted">
            Todavía no hay nada en la prenda. Agregá texto, elegí una forma de la
            galería o subí tu propio archivo.
          </p>
        </PanelSection>
      ) : (
        <PanelSection title="Empezar de nuevo">
          <Button variant="secondary" size="sm" onClick={resetDesign}>
            Borrar todo el diseño
          </Button>
        </PanelSection>
      )}
    </>
  );
}

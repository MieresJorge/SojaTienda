"use client";

import { useState } from "react";

import { CLIPART, CLIPART_CATEGORIES } from "@/lib/clipart";
import { getLocation, getProduct } from "@/lib/catalog";
import { useDesigner, useSelectedObject } from "@/lib/designer-store";
import { Button, cx, Field, PanelSection } from "@/components/ui";
import { buildShapeModel } from "@/components/designer/add-object";
import { ColorSwatches } from "@/components/designer/ColorSwatches";

export function ArtPanel() {
  const [category, setCategory] = useState<(typeof CLIPART_CATEGORIES)[number]>(
    "Formas",
  );
  const productId = useDesigner((s) => s.productId);
  const activeLocation = useDesigner((s) => s.activeLocation);
  const addObject = useDesigner((s) => s.addObject);
  const updateObject = useDesigner((s) => s.updateObject);
  const removeObject = useDesigner((s) => s.removeObject);
  const selected = useSelectedObject();

  const product = getProduct(productId);
  const location = product ? getLocation(product, activeLocation) : undefined;
  const shape = selected?.kind === "shape" ? selected : null;

  const add = (shapeId: string) => {
    if (!location) return;
    const model = buildShapeModel(shapeId, location, "#ffffff");
    if (model) addObject(model);
  };

  return (
    <>
      <PanelSection
        title="Galería"
        description={location ? `Se agrega en: ${location.label}` : undefined}
      >
        <div className="mb-3 flex flex-wrap gap-1.5">
          {CLIPART_CATEGORIES.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setCategory(item)}
              className={cx(
                "rounded-full px-3 py-1 text-xs transition-colors",
                item === category
                  ? "bg-ink text-paper"
                  : "bg-paper-alt text-ink-soft hover:text-ink",
              )}
            >
              {item}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-4 gap-2">
          {CLIPART.filter((item) => item.category === category).map((item) => (
            <button
              key={item.id}
              type="button"
              title={item.name}
              onClick={() => add(item.id)}
              className="aspect-square rounded-lg border border-line bg-surface p-2 transition-colors hover:border-ink"
            >
              <svg viewBox="0 0 100 100" className="h-full w-full">
                <path
                  d={item.path}
                  fill="#14151a"
                  fillRule={item.fillRule ?? "nonzero"}
                />
              </svg>
              <span className="sr-only">{item.name}</span>
            </button>
          ))}
        </div>
      </PanelSection>

      {shape && (
        <PanelSection title="Forma seleccionada">
          <Field label="Relleno">
            <ColorSwatches
              value={shape.fill}
              onChange={(hex) => updateObject(shape.id, { fill: hex })}
            />
          </Field>
          <div className="mt-4">
            <Field label="Contorno">
              <ColorSwatches
                value={shape.stroke}
                allowNone
                onNone={() => updateObject(shape.id, { stroke: null, strokeWidth: 0 })}
                onChange={(hex) =>
                  updateObject(shape.id, {
                    stroke: hex,
                    strokeWidth: shape.strokeWidth || 2,
                  })
                }
                size={22}
              />
            </Field>
            {shape.stroke && (
              <input
                type="range"
                min={0.5}
                max={10}
                step={0.5}
                value={shape.strokeWidth}
                onChange={(event) =>
                  updateObject(
                    shape.id,
                    { strokeWidth: Number(event.target.value) },
                    { history: false },
                  )
                }
                className="mt-2 w-full accent-ink"
              />
            )}
          </div>
          <Button
            variant="danger"
            size="sm"
            className="mt-4"
            onClick={() => removeObject(shape.id)}
          >
            Eliminar forma
          </Button>
        </PanelSection>
      )}
    </>
  );
}

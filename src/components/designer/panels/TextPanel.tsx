"use client";

import { getLocation, getProduct } from "@/lib/catalog";
import { useDesigner, useSelectedObject } from "@/lib/designer-store";
import { DESIGN_FONTS } from "@/lib/fonts";
import { Button, cx, Field, inputClass, PanelSection } from "@/components/ui";
import { buildTextModel } from "@/components/designer/add-object";
import { ColorSwatches } from "@/components/designer/ColorSwatches";

/** Los sliders no apilan historial en cada pixel: sólo al soltar. */
const LIVE = { history: false } as const;

export function TextPanel() {
  const productId = useDesigner((s) => s.productId);
  const activeLocation = useDesigner((s) => s.activeLocation);
  const addObject = useDesigner((s) => s.addObject);
  const updateObject = useDesigner((s) => s.updateObject);
  const removeObject = useDesigner((s) => s.removeObject);
  const selected = useSelectedObject();

  const product = getProduct(productId);
  const location = product ? getLocation(product, activeLocation) : undefined;
  const text = selected?.kind === "text" ? selected : null;

  const addText = () => {
    if (!location) return;
    addObject(buildTextModel("TU TEXTO", location));
  };

  return (
    <>
      <PanelSection
        title="Texto"
        description={
          location ? `Se agrega en: ${location.label}` : "Elegí una ubicación"
        }
      >
        <Button onClick={addText} className="w-full" disabled={!location}>
          + Agregar texto
        </Button>
        {!text && (
          <p className="mt-3 text-xs leading-relaxed text-ink-muted">
            Tocá un texto del diseño para editarlo. También podés hacer doble
            click sobre la prenda para escribir directo.
          </p>
        )}
      </PanelSection>

      {text && (
        <>
          <PanelSection title="Contenido">
            <textarea
              value={text.text}
              rows={2}
              maxLength={200}
              onChange={(event) =>
                updateObject(text.id, { text: event.target.value || " " }, LIVE)
              }
              className={cx(inputClass, "resize-none")}
            />
            <div className="mt-2 flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() =>
                  updateObject(text.id, { text: text.text.toUpperCase() })
                }
              >
                MAYÚSCULAS
              </Button>
              <Button
                variant="danger"
                size="sm"
                className="ml-auto"
                onClick={() => removeObject(text.id)}
              >
                Eliminar
              </Button>
            </div>
          </PanelSection>

          <PanelSection title="Tipografía">
            <div className="scroll-slim grid max-h-64 grid-cols-2 gap-1.5 overflow-y-auto pr-1">
              {DESIGN_FONTS.map((font) => (
                <button
                  key={font.id}
                  type="button"
                  onClick={() => updateObject(text.id, { fontFamily: font.family })}
                  style={{ fontFamily: `"${font.family}", sans-serif` }}
                  className={cx(
                    "truncate rounded-lg border px-2 py-2 text-base transition-colors",
                    font.family === text.fontFamily
                      ? "border-ink bg-surface"
                      : "border-line bg-surface/60 hover:border-ink-muted",
                  )}
                >
                  {font.family}
                </button>
              ))}
            </div>

            <div className="mt-3 flex gap-1.5">
              <Button
                variant={text.fontWeight === "bold" ? "primary" : "secondary"}
                size="sm"
                className="flex-1 font-bold"
                onClick={() =>
                  updateObject(text.id, {
                    fontWeight: text.fontWeight === "bold" ? "normal" : "bold",
                  })
                }
              >
                B
              </Button>
              <Button
                variant={text.fontStyle === "italic" ? "primary" : "secondary"}
                size="sm"
                className="flex-1 italic"
                onClick={() =>
                  updateObject(text.id, {
                    fontStyle: text.fontStyle === "italic" ? "normal" : "italic",
                  })
                }
              >
                I
              </Button>
              <Button
                variant={text.underline ? "primary" : "secondary"}
                size="sm"
                className="flex-1 underline"
                onClick={() => updateObject(text.id, { underline: !text.underline })}
              >
                U
              </Button>
            </div>
          </PanelSection>

          <PanelSection title="Color de la tinta">
            <ColorSwatches
              value={text.fill}
              onChange={(hex) => updateObject(text.id, { fill: hex })}
            />
            <div className="mt-4">
              <Field label="Contorno">
                <ColorSwatches
                  value={text.stroke}
                  allowNone
                  onNone={() =>
                    updateObject(text.id, { stroke: null, strokeWidth: 0 })
                  }
                  onChange={(hex) =>
                    updateObject(text.id, {
                      stroke: hex,
                      strokeWidth: text.strokeWidth || 2,
                    })
                  }
                  size={22}
                />
              </Field>
              {text.stroke && (
                <input
                  type="range"
                  min={0.5}
                  max={8}
                  step={0.5}
                  value={text.strokeWidth}
                  onChange={(event) =>
                    updateObject(
                      text.id,
                      { strokeWidth: Number(event.target.value) },
                      LIVE,
                    )
                  }
                  className="mt-2 w-full accent-ink"
                />
              )}
            </div>
          </PanelSection>

          <PanelSection title="Forma">
            <Field label="Curvatura" hint={`${text.curve}`}>
              <input
                type="range"
                min={-100}
                max={100}
                step={1}
                value={text.curve}
                onChange={(event) =>
                  updateObject(text.id, { curve: Number(event.target.value) }, LIVE)
                }
                className="w-full accent-ink"
              />
            </Field>
            <div className="mt-3">
              <Field label="Espaciado entre letras" hint={`${text.charSpacing}`}>
                <input
                  type="range"
                  min={-100}
                  max={600}
                  step={10}
                  value={text.charSpacing}
                  onChange={(event) =>
                    updateObject(
                      text.id,
                      { charSpacing: Number(event.target.value) },
                      LIVE,
                    )
                  }
                  className="w-full accent-ink"
                />
              </Field>
            </div>
            <div className="mt-3">
              <Field label="Interlineado" hint={text.lineHeight.toFixed(2)}>
                <input
                  type="range"
                  min={0.7}
                  max={2}
                  step={0.05}
                  value={text.lineHeight}
                  onChange={(event) =>
                    updateObject(
                      text.id,
                      { lineHeight: Number(event.target.value) },
                      LIVE,
                    )
                  }
                  className="w-full accent-ink"
                />
              </Field>
            </div>
          </PanelSection>
        </>
      )}
    </>
  );
}

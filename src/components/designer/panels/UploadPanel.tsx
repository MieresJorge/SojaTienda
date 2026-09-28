"use client";

import { useRef, useState } from "react";

import { getLocation, getProduct } from "@/lib/catalog";
import { useDesigner, useSelectedObject } from "@/lib/designer-store";
import { Button, cx, Field, PanelSection } from "@/components/ui";
import { buildImageModel } from "@/components/designer/add-object";

const COLOR_OPTIONS = [
  { value: 1, label: "1 color" },
  { value: 2, label: "2 colores" },
  { value: 3, label: "3 colores" },
  { value: 4, label: "Full color / foto" },
];

export function UploadPanel() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const productId = useDesigner((s) => s.productId);
  const activeLocation = useDesigner((s) => s.activeLocation);
  const method = useDesigner((s) => s.method);
  const addObject = useDesigner((s) => s.addObject);
  const updateObject = useDesigner((s) => s.updateObject);
  const removeObject = useDesigner((s) => s.removeObject);
  const selected = useSelectedObject();

  const product = getProduct(productId);
  const location = product ? getLocation(product, activeLocation) : undefined;
  const image = selected?.kind === "image" ? selected : null;

  const upload = async (file: File) => {
    if (!location) return;
    setError(null);
    setUploading(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const response = await fetch("/api/upload", { method: "POST", body });
      const payload = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || !payload.url) {
        throw new Error(payload.error ?? "No pudimos subir el archivo.");
      }
      addObject(await buildImageModel(payload.url, file.name, location));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Error al subir el archivo.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      <PanelSection
        title="Subir tu diseño"
        description={location ? `Se agrega en: ${location.label}` : undefined}
      >
        <div
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            const file = event.dataTransfer.files?.[0];
            if (file) void upload(file);
          }}
          className={cx(
            "rounded-xl border-2 border-dashed p-6 text-center transition-colors",
            dragging ? "border-ink bg-brote-soft" : "border-line bg-surface/60",
          )}
        >
          <p className="text-sm font-medium">Arrastrá tu archivo acá</p>
          <p className="mt-1 text-xs text-ink-muted">PNG, JPG o WEBP · hasta 15 MB</p>
          <Button
            variant="secondary"
            size="sm"
            className="mt-3"
            disabled={uploading || !location}
            onClick={() => inputRef.current?.click()}
          >
            {uploading ? "Subiendo…" : "Elegir archivo"}
          </Button>
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void upload(file);
              event.target.value = "";
            }}
          />
        </div>

        {error && <p className="mt-3 text-xs text-alerta">{error}</p>}

        <ul className="mt-4 space-y-1.5 text-xs leading-relaxed text-ink-muted">
          <li>· Ideal: PNG con fondo transparente, 300 dpi al tamaño final.</li>
          <li>· Si mandás un JPG con fondo blanco, el blanco se imprime.</li>
          <li>· ¿Tenés el vector (AI, EPS, PDF)? Subí un PNG acá y adjuntamos el vector después de la compra: te escribimos por mail.</li>
        </ul>
      </PanelSection>

      {image && (
        <PanelSection title="Imagen seleccionada" description={image.name || undefined}>
          {method === "serigrafia" && (
            <Field
              label="Colores del archivo"
              hint="Define cuántas pantallas usamos"
            >
              <div className="grid grid-cols-2 gap-1.5">
                {COLOR_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() =>
                      updateObject(image.id, { colorCount: option.value })
                    }
                    className={cx(
                      "rounded-lg border px-2 py-2 text-xs transition-colors",
                      image.colorCount === option.value
                        ? "border-ink bg-surface font-semibold"
                        : "border-line bg-surface/60 text-ink-soft hover:border-ink-muted",
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </Field>
          )}

          <div className="mt-4">
            <Field label="Opacidad" hint={`${Math.round(image.opacity * 100)}%`}>
              <input
                type="range"
                min={0.1}
                max={1}
                step={0.05}
                value={image.opacity}
                onChange={(event) =>
                  updateObject(
                    image.id,
                    { opacity: Number(event.target.value) },
                    { history: false },
                  )
                }
                className="w-full accent-ink"
              />
            </Field>
          </div>

          <Button
            variant="danger"
            size="sm"
            className="mt-4"
            onClick={() => removeObject(image.id)}
          >
            Quitar imagen
          </Button>
        </PanelSection>
      )}
    </>
  );
}

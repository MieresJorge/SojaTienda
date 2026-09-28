"use client";

import * as fabric from "fabric";
import { useEffect, useRef, useState } from "react";

import {
  getColor,
  getProduct,
  MOCKUP_HEIGHT,
  MOCKUP_WIDTH,
  type LocationKey,
} from "@/lib/catalog";
import { computeDesignMeta } from "@/lib/design";
import { useDesigner } from "@/lib/designer-store";
import { waitForDesignFonts } from "@/lib/fonts";
import { garmentInnerSvg } from "@/lib/garment-svg";

import {
  applyModel,
  createFabricObject,
  readGeometry,
  sojaIdOf,
  type SojaFabricObject,
} from "./fabric-objects";

// Estética de los manejadores de selección, alineada con la marca.
try {
  fabric.InteractiveFabricObject.ownDefaults = {
    ...fabric.InteractiveFabricObject.ownDefaults,
    cornerStyle: "circle",
    cornerColor: "#ffffff",
    cornerStrokeColor: "#111827",
    borderColor: "#111827",
    borderScaleFactor: 1.5,
    transparentCorners: false,
    cornerSize: 12,
    touchCornerSize: 28,
    padding: 4,
  };
} catch {
  // Versiones futuras de Fabric pueden mover esta API; no es crítico.
}

export function DesignCanvas() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasElRef = useRef<HTMLCanvasElement | null>(null);
  const canvasRef = useRef<fabric.Canvas | null>(null);
  const [zoom, setZoom] = useState(0.72);
  const [fontsReady, setFontsReady] = useState(false);

  const productId = useDesigner((s) => s.productId);
  const colorId = useDesigner((s) => s.colorId);
  const objects = useDesigner((s) => s.objects);
  const activeView = useDesigner((s) => s.activeView);
  const activeLocation = useDesigner((s) => s.activeLocation);
  const selectedId = useDesigner((s) => s.selectedId);

  const product = getProduct(productId);
  const color = product ? getColor(product, colorId) : undefined;

  // Sin useMemo: el React Compiler memoiza esto solo, y el cálculo es barato.
  const viewLocations = product?.locations.filter((l) => l.view === activeView) ?? [];

  const meta = product
    ? computeDesignMeta(
        {
          version: 1,
          productId,
          colorId,
          method: "serigrafia",
          rush: false,
          objects,
        },
        product,
      )
    : null;

  useEffect(() => {
    void waitForDesignFonts().then(() => setFontsReady(true));
  }, []);

  // --- Creación del canvas -------------------------------------------------
  useEffect(() => {
    if (!canvasElRef.current) return;
    const canvas = new fabric.Canvas(canvasElRef.current, {
      width: MOCKUP_WIDTH,
      height: MOCKUP_HEIGHT,
      backgroundColor: undefined,
      preserveObjectStacking: true,
      // Sin selección múltiple: el modelo del store maneja un objeto por vez.
      selection: false,
      stopContextMenu: true,
      fireRightClick: false,
    });
    canvasRef.current = canvas;

    const store = useDesigner.getState;

    const syncFromCanvas = (object: fabric.FabricObject | undefined, history: boolean) => {
      const id = object ? sojaIdOf(object) : undefined;
      if (!object || !id) return;
      store().updateObject(id, readGeometry(object as SojaFabricObject), { history });
    };

    canvas.on("object:modified", (event) => syncFromCanvas(event.target, true));
    canvas.on("text:changed", (event) => {
      const target = event.target;
      const id = sojaIdOf(target);
      if (!id) return;
      store().updateObject(
        id,
        { text: target.text, ...readGeometry(target as SojaFabricObject) },
        { history: false },
      );
    });
    canvas.on("selection:created", (event) =>
      store().select(sojaIdOf(event.selected?.[0] as fabric.FabricObject) ?? null),
    );
    canvas.on("selection:updated", (event) =>
      store().select(sojaIdOf(event.selected?.[0] as fabric.FabricObject) ?? null),
    );
    canvas.on("selection:cleared", () => store().select(null));

    return () => {
      canvasRef.current = null;
      void canvas.dispose();
    };
  }, []);

  // --- Zoom responsivo -----------------------------------------------------
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width ?? MOCKUP_WIDTH;
      setZoom(Math.max(0.3, width / MOCKUP_WIDTH));
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.setDimensions({
      width: MOCKUP_WIDTH * zoom,
      height: MOCKUP_HEIGHT * zoom,
    });
    canvas.setZoom(zoom);
    canvas.requestRenderAll();
  }, [zoom]);

  // --- Reconciliación store -> canvas -------------------------------------
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !product) return;
    let cancelled = false;

    const visible = objects.filter(
      (object) =>
        product.locations.find((l) => l.key === object.location)?.view === activeView,
    );
    const wanted = new Map(visible.map((model) => [model.id, model]));

    for (const object of [...canvas.getObjects()]) {
      const id = sojaIdOf(object);
      if (!id || !wanted.has(id)) canvas.remove(object);
    }

    void (async () => {
      for (let index = 0; index < visible.length; index++) {
        if (cancelled) return;
        const model = visible[index];
        const existing = canvas
          .getObjects()
          .find((object) => sojaIdOf(object) === model.id) as
          | SojaFabricObject
          | undefined;

        if (existing) {
          // No pisar el texto mientras el usuario está escribiendo en el canvas.
          const editing =
            existing instanceof fabric.IText && existing.isEditing === true;
          if (!editing) applyModel(existing, model);
          canvas.moveObjectTo(existing, index);
        } else {
          const created = await createFabricObject(model);
          if (cancelled) return;
          canvas.add(created);
          canvas.moveObjectTo(created, index);
        }
      }
      if (!cancelled) canvas.requestRenderAll();
    })();

    return () => {
      cancelled = true;
    };
  }, [objects, activeView, product, fontsReady]);

  // --- Selección store -> canvas ------------------------------------------
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const current = canvas.getActiveObject();
    if (sojaIdOf(current ?? ({} as fabric.FabricObject)) === selectedId) return;

    if (!selectedId) {
      canvas.discardActiveObject();
    } else {
      const target = canvas
        .getObjects()
        .find((object) => sojaIdOf(object) === selectedId);
      if (target) canvas.setActiveObject(target);
    }
    canvas.requestRenderAll();
  }, [selectedId, objects]);

  // --- Atajos de teclado ---------------------------------------------------
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable;
      const editingOnCanvas = canvasRef.current
        ?.getObjects()
        .some((object) => object instanceof fabric.IText && object.isEditing);
      if (typing || editingOnCanvas) return;

      const state = useDesigner.getState();

      if ((event.key === "Delete" || event.key === "Backspace") && state.selectedId) {
        event.preventDefault();
        state.removeObject(state.selectedId);
        return;
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") {
        event.preventDefault();
        if (event.shiftKey) state.redo();
        else state.undo();
        return;
      }
      if (state.selectedId && event.key.startsWith("Arrow")) {
        event.preventDefault();
        const step = event.shiftKey ? 10 : 1;
        const object = state.objects.find((o) => o.id === state.selectedId);
        if (!object) return;
        const delta = {
          ArrowUp: { y: -step },
          ArrowDown: { y: step },
          ArrowLeft: { x: -step },
          ArrowRight: { x: step },
        }[event.key];
        if (!delta) return;
        state.updateObject(object.id, {
          x: object.x + (delta.x ?? 0),
          y: object.y + (delta.y ?? 0),
        });
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  if (!product || !color) return null;

  const garmentMarkup = garmentInnerSvg({
    silhouette: product.silhouette,
    view: activeView,
    color: color.hex,
    seam: color.seam,
    shade: color.shade,
    idPrefix: `live-${activeView}`,
  });

  const overflowing = new Set<LocationKey>(
    meta?.locations.filter((l) => l.overflows).map((l) => l.location) ?? [],
  );

  return (
    <div
      ref={containerRef}
      className="relative mx-auto w-full max-w-[560px] select-none"
      style={{ aspectRatio: `${MOCKUP_WIDTH} / ${MOCKUP_HEIGHT}` }}
    >
      <svg
        viewBox={`0 0 ${MOCKUP_WIDTH} ${MOCKUP_HEIGHT}`}
        className="pointer-events-none absolute inset-0 h-full w-full"
        aria-label={`${product.name} color ${color.name}, vista ${activeView}`}
        dangerouslySetInnerHTML={{ __html: garmentMarkup }}
      />

      {/* Las guías se dibujan en claro u oscuro según el color de la prenda. */}
      {viewLocations.map((location) => {
        const isActive = location.key === activeLocation;
        const overflows = overflowing.has(location.key);
        const dark = color.shade === "oscura";
        const borderColor = overflows
          ? "rgba(239, 68, 68, 0.95)"
          : dark
            ? `rgba(255, 255, 255, ${isActive ? 0.5 : 0.18})`
            : `rgba(20, 21, 26, ${isActive ? 0.45 : 0.16})`;

        return (
          <div
            key={location.key}
            className="pointer-events-none absolute rounded-[3px] border border-dashed transition-colors"
            style={{
              borderColor,
              left: `${(location.area.x / MOCKUP_WIDTH) * 100}%`,
              top: `${(location.area.y / MOCKUP_HEIGHT) * 100}%`,
              width: `${(location.area.width / MOCKUP_WIDTH) * 100}%`,
              height: `${(location.area.height / MOCKUP_HEIGHT) * 100}%`,
            }}
          >
            {isActive && (
              <span
                className="absolute -top-5 left-0 text-[10px] font-medium uppercase tracking-wide"
                style={{ color: dark ? "rgba(255,255,255,0.62)" : "#71757f" }}
              >
                {location.label} · {location.realWidthCm}×{location.realHeightCm} cm
              </span>
            )}
          </div>
        );
      })}

      {/* Fabric envuelve el <canvas> en su propio .canvas-container; el CSS
          global lo fija a este contenedor para que quede sobre la prenda. */}
      <div className="soja-canvas-host absolute inset-0">
        <canvas ref={canvasElRef} />
      </div>
    </div>
  );
}

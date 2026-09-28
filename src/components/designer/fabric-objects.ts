"use client";

/**
 * Puente entre nuestro modelo de diseño (src/lib/design.ts) y Fabric.js.
 *
 * Regla: el modelo del store manda. Fabric es sólo el motor de dibujo y de
 * manipulación directa; cuando el usuario arrastra o escala, leemos la
 * geometría de vuelta al modelo con `readGeometry`.
 */

import * as fabric from "fabric";

import { getClipart } from "@/lib/clipart";
import type { DesignObject, ImageObject, ShapeObject, TextObject } from "@/lib/design";

export type SojaFabricObject = fabric.FabricObject & { sojaId?: string };

export function sojaIdOf(object: fabric.FabricObject): string | undefined {
  return (object as SojaFabricObject).sojaId;
}

/** Arco sobre el que se acomoda el texto curvo. */
export function arcPathFor(width: number, curve: number): fabric.Path | null {
  if (!curve) return null;
  const intensity = Math.min(100, Math.abs(curve)) / 100;
  const theta = intensity * Math.PI * 0.95;
  const radius = width / Math.max(theta, 0.05);
  const chord = 2 * radius * Math.sin(theta / 2);
  const sweep = curve > 0 ? 0 : 1;
  const path = new fabric.Path(
    `M ${-chord / 2} 0 A ${radius} ${radius} 0 0 ${sweep} ${chord / 2} 0`,
    { visible: false, fill: "", stroke: "" },
  );
  return path;
}

function commonOptions(model: DesignObject): Partial<fabric.FabricObject> {
  return {
    left: model.x,
    top: model.y,
    originX: "center",
    originY: "center",
    angle: model.angle,
    scaleX: model.scaleX,
    scaleY: model.scaleY,
    flipX: model.flipX,
    flipY: model.flipY,
    opacity: model.opacity,
  };
}

function textOptions(model: TextObject) {
  return {
    fontFamily: model.fontFamily,
    fontSize: model.fontSize,
    fontWeight: model.fontWeight,
    fontStyle: model.fontStyle,
    underline: model.underline,
    textAlign: model.textAlign,
    charSpacing: model.charSpacing,
    lineHeight: model.lineHeight,
    fill: model.fill,
    stroke: model.stroke ?? undefined,
    strokeWidth: model.stroke ? model.strokeWidth : 0,
    paintFirst: "stroke" as const,
    strokeLineJoin: "round" as const,
  };
}

export function createText(model: TextObject): fabric.IText {
  const text = new fabric.IText(model.text, {
    ...commonOptions(model),
    ...textOptions(model),
  });
  applyCurve(text, model);
  return text;
}

/** `initDimensions` es interno de Fabric pero es la única forma de re-medir. */
function remeasure(text: fabric.IText) {
  (text as unknown as { initDimensions?: () => void }).initDimensions?.();
}

function applyCurve(text: fabric.IText, model: TextObject) {
  // El radio del arco se calcula sobre el ancho del texto recto, así que
  // primero sacamos el path anterior y volvemos a medir.
  if (text.path) {
    text.set({ path: undefined });
    remeasure(text);
  }
  if (!model.curve) return;

  const path = arcPathFor(text.width, model.curve);
  if (!path) return;
  text.set({ path, pathAlign: "center", pathSide: "left" });
  remeasure(text);
}

export function createShape(model: ShapeObject): fabric.Path {
  const clipart = getClipart(model.shape);
  const path = new fabric.Path(clipart?.path ?? "M0 0 L100 0 L100 100 L0 100 Z", {
    ...commonOptions(model),
    fill: model.fill,
    stroke: model.stroke ?? undefined,
    strokeWidth: model.stroke ? model.strokeWidth : 0,
    strokeUniform: true,
    fillRule: clipart?.fillRule ?? "nonzero",
    objectCaching: false,
  });
  return path;
}

export async function createImage(model: ImageObject): Promise<fabric.FabricImage> {
  const image = await fabric.FabricImage.fromURL(model.src, {
    crossOrigin: "anonymous",
  });
  image.set(commonOptions(model));
  return image;
}

export async function createFabricObject(
  model: DesignObject,
): Promise<SojaFabricObject> {
  let object: fabric.FabricObject;
  switch (model.kind) {
    case "text":
      object = createText(model);
      break;
    case "shape":
      object = createShape(model);
      break;
    case "image":
      object = await createImage(model);
      break;
  }
  (object as SojaFabricObject).sojaId = model.id;
  object.setCoords();
  return object as SojaFabricObject;
}

/** Sincroniza un objeto ya existente en el canvas con el modelo. */
export function applyModel(object: SojaFabricObject, model: DesignObject): void {
  object.set(commonOptions(model));

  if (model.kind === "text" && object instanceof fabric.IText) {
    if (object.text !== model.text) object.set({ text: model.text });
    object.set(textOptions(model));
    applyCurve(object, model);
  }

  if (model.kind === "shape" && object instanceof fabric.Path) {
    object.set({
      fill: model.fill,
      stroke: model.stroke ?? undefined,
      strokeWidth: model.stroke ? model.strokeWidth : 0,
    });
  }

  object.setCoords();
}

/** Geometría (y medidas reales del texto) de vuelta al modelo. */
export function readGeometry(object: SojaFabricObject): Partial<DesignObject> {
  return {
    x: Math.round((object.left ?? 0) * 100) / 100,
    y: Math.round((object.top ?? 0) * 100) / 100,
    width: Math.max(1, object.width ?? 1),
    height: Math.max(1, object.height ?? 1),
    scaleX: object.scaleX ?? 1,
    scaleY: object.scaleY ?? 1,
    angle: Math.round((object.angle ?? 0) * 100) / 100,
    flipX: Boolean(object.flipX),
    flipY: Boolean(object.flipY),
  };
}

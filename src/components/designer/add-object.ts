"use client";

/**
 * Construcción de objetos nuevos: mide el tamaño natural con Fabric y lo
 * encaja dentro del área imprimible activa, para que nada nazca desbordado.
 */

import * as fabric from "fabric";

import { getClipart } from "@/lib/clipart";
import type { PrintLocation } from "@/lib/catalog";
import type { ImageObject, ShapeObject, TextObject } from "@/lib/design";
import { DEFAULT_FONT } from "@/lib/fonts";

type NewObject<T> = Omit<T, "id" | "location">;

interface FitResult {
  x: number;
  y: number;
  scaleX: number;
  scaleY: number;
}

/** Centra el objeto en el área y lo escala para ocupar `coverage` del ancho. */
function fitInArea(
  location: PrintLocation,
  naturalWidth: number,
  naturalHeight: number,
  coverage = 0.72,
): FitResult {
  const targetWidth = location.area.width * coverage;
  const targetHeight = location.area.height * coverage;
  const scale = Math.min(
    targetWidth / Math.max(naturalWidth, 1),
    targetHeight / Math.max(naturalHeight, 1),
  );
  return {
    x: location.area.x + location.area.width / 2,
    y: location.area.y + location.area.height / 2,
    scaleX: scale,
    scaleY: scale,
  };
}

const TEXT_DEFAULTS = {
  fontFamily: DEFAULT_FONT,
  fontSize: 64,
  fontWeight: "normal",
  fontStyle: "normal",
  underline: false,
  textAlign: "center",
  charSpacing: 0,
  lineHeight: 1.1,
  stroke: null,
  strokeWidth: 0,
  curve: 0,
  flipX: false,
  flipY: false,
  opacity: 1,
  angle: 0,
} as const;

export function buildTextModel(
  text: string,
  location: PrintLocation,
  options: Partial<NewObject<TextObject>> = {},
): NewObject<TextObject> {
  const draft = {
    kind: "text" as const,
    text,
    fill: "#ffffff",
    ...TEXT_DEFAULTS,
    ...options,
  };

  const measured = new fabric.IText(draft.text, {
    fontFamily: draft.fontFamily,
    fontSize: draft.fontSize,
    fontWeight: draft.fontWeight,
    fontStyle: draft.fontStyle,
    charSpacing: draft.charSpacing,
    lineHeight: draft.lineHeight,
    textAlign: draft.textAlign,
  });

  const fit = fitInArea(location, measured.width, measured.height, 0.8);
  return {
    ...draft,
    width: measured.width,
    height: measured.height,
    ...fit,
  };
}

export function buildShapeModel(
  shapeId: string,
  location: PrintLocation,
  fill = "#ffffff",
): NewObject<ShapeObject> | null {
  const clipart = getClipart(shapeId);
  if (!clipart) return null;

  const measured = new fabric.Path(clipart.path);
  const fit = fitInArea(location, measured.width, measured.height, 0.55);

  return {
    kind: "shape",
    shape: clipart.id,
    fill,
    stroke: null,
    strokeWidth: 0,
    width: measured.width,
    height: measured.height,
    angle: 0,
    flipX: false,
    flipY: false,
    opacity: 1,
    ...fit,
  };
}

export async function buildImageModel(
  src: string,
  name: string,
  location: PrintLocation,
): Promise<NewObject<ImageObject>> {
  const image = await fabric.FabricImage.fromURL(src, { crossOrigin: "anonymous" });
  const width = image.width || 300;
  const height = image.height || 300;
  const fit = fitInArea(location, width, height, 0.8);

  return {
    kind: "image",
    src,
    name,
    colorCount: 4,
    width,
    height,
    angle: 0,
    flipX: false,
    flipY: false,
    opacity: 1,
    ...fit,
  };
}

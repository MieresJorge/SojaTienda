/**
 * Modelo del diseño.
 *
 * Deliberadamente NO guardamos el JSON crudo de Fabric.js: definimos nuestro
 * propio modelo normalizado. Eso nos permite (a) validarlo con zod antes de
 * persistirlo, (b) recalcular colores y cm² en el servidor sin necesidad de
 * correr Fabric en Node, y (c) cambiar de motor de canvas sin migrar datos.
 */

import { z } from "zod";

import {
  cmPerPixel,
  getProduct,
  type LocationKey,
  type PrintMethod,
  type Product,
} from "./catalog";
import type { QuoteLocationInput } from "./pricing";

export const LOCATION_KEYS = [
  "frente",
  "espalda",
  "manga_izq",
  "manga_der",
] as const satisfies readonly LocationKey[];

const locationKeySchema = z.enum(LOCATION_KEYS);

const baseObjectSchema = z.object({
  id: z.string().min(1).max(64),
  location: locationKeySchema,
  /** Centro del objeto, en coordenadas del mockup. */
  x: z.number().finite(),
  y: z.number().finite(),
  /** Tamaño natural, antes de escalar. */
  width: z.number().positive().max(4000),
  height: z.number().positive().max(4000),
  scaleX: z.number().positive().max(50),
  scaleY: z.number().positive().max(50),
  angle: z.number().finite(),
  flipX: z.boolean().default(false),
  flipY: z.boolean().default(false),
  opacity: z.number().min(0.05).max(1).default(1),
});

const hexColor = z
  .string()
  .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, "Color inválido");

export const textObjectSchema = baseObjectSchema.extend({
  kind: z.literal("text"),
  text: z.string().min(1).max(200),
  fontFamily: z.string().min(1).max(60),
  fontSize: z.number().min(4).max(400),
  fontWeight: z.enum(["normal", "bold"]).default("normal"),
  fontStyle: z.enum(["normal", "italic"]).default("normal"),
  underline: z.boolean().default(false),
  textAlign: z.enum(["left", "center", "right"]).default("center"),
  charSpacing: z.number().min(-200).max(1000).default(0),
  lineHeight: z.number().min(0.5).max(3).default(1.1),
  fill: hexColor,
  stroke: hexColor.nullable().default(null),
  strokeWidth: z.number().min(0).max(20).default(0),
  /** Curvatura del texto en arco, -100 a 100. 0 = recto. */
  curve: z.number().min(-100).max(100).default(0),
});

export const shapeObjectSchema = baseObjectSchema.extend({
  kind: z.literal("shape"),
  shape: z.string().min(1).max(40),
  fill: hexColor,
  stroke: hexColor.nullable().default(null),
  strokeWidth: z.number().min(0).max(20).default(0),
});

export const imageObjectSchema = baseObjectSchema.extend({
  kind: z.literal("image"),
  /** Siempre una URL de nuestro propio storage (/uploads/...). */
  src: z.string().regex(/^\/uploads\/[A-Za-z0-9/_\-.]+$/, "Origen de imagen inválido"),
  name: z.string().max(160).default(""),
  /** Colores declarados para serigrafía (4 = full color / fotográfico). */
  colorCount: z.number().int().min(1).max(12).default(4),
});

export const designObjectSchema = z.discriminatedUnion("kind", [
  textObjectSchema,
  shapeObjectSchema,
  imageObjectSchema,
]);

export const designDocSchema = z.object({
  version: z.literal(1),
  productId: z.string().min(1).max(60),
  colorId: z.string().min(1).max(60),
  method: z.enum(["serigrafia", "dtf"]),
  rush: z.boolean().default(false),
  objects: z.array(designObjectSchema).max(60),
});

export type TextObject = z.infer<typeof textObjectSchema>;
export type ShapeObject = z.infer<typeof shapeObjectSchema>;
export type ImageObject = z.infer<typeof imageObjectSchema>;
export type DesignObject = z.infer<typeof designObjectSchema>;
export type DesignDoc = z.infer<typeof designDocSchema>;

export interface LocationMeta {
  location: LocationKey;
  objectCount: number;
  colors: string[];
  colorCount: number;
  /** Bounding box del arte, en píxeles de mockup. */
  bbox: { x: number; y: number; width: number; height: number } | null;
  widthCm: number;
  heightCm: number;
  areaCm2: number;
  /** El arte se sale del área imprimible. */
  overflows: boolean;
}

export interface DesignMeta {
  locations: LocationMeta[];
  totalObjects: number;
  /** Máximo de colores entre ubicaciones, para mostrar en la UI. */
  maxColors: number;
}

/** Esquinas del objeto ya escalado y rotado, en coordenadas de mockup. */
function corners(object: DesignObject): Array<{ x: number; y: number }> {
  const halfWidth = (object.width * object.scaleX) / 2;
  const halfHeight = (object.height * object.scaleY) / 2;
  const radians = (object.angle * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  return [
    [-halfWidth, -halfHeight],
    [halfWidth, -halfHeight],
    [halfWidth, halfHeight],
    [-halfWidth, halfHeight],
  ].map(([dx, dy]) => ({
    x: object.x + dx * cos - dy * sin,
    y: object.y + dx * sin + dy * cos,
  }));
}

function normalizeHex(value: string): string {
  const hex = value.trim().toLowerCase();
  if (hex.length === 4) {
    return `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`;
  }
  return hex;
}

/**
 * Recalcula colores y superficie de arte por ubicación.
 * Es la única fuente de verdad para cotizar: el servidor la vuelve a correr.
 */
export function computeDesignMeta(doc: DesignDoc, product?: Product): DesignMeta {
  const resolved = product ?? getProduct(doc.productId);
  const locations: LocationMeta[] = [];

  for (const locationKey of LOCATION_KEYS) {
    const objects = doc.objects.filter((o) => o.location === locationKey);
    const printLocation = resolved?.locations.find((l) => l.key === locationKey);

    if (objects.length === 0) {
      locations.push({
        location: locationKey,
        objectCount: 0,
        colors: [],
        colorCount: 0,
        bbox: null,
        widthCm: 0,
        heightCm: 0,
        areaCm2: 0,
        overflows: false,
      });
      continue;
    }

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    const colors = new Set<string>();
    let imageColorBudget = 0;

    for (const object of objects) {
      for (const corner of corners(object)) {
        minX = Math.min(minX, corner.x);
        minY = Math.min(minY, corner.y);
        maxX = Math.max(maxX, corner.x);
        maxY = Math.max(maxY, corner.y);
      }
      if (object.kind === "image") {
        imageColorBudget = Math.max(imageColorBudget, object.colorCount);
      } else {
        colors.add(normalizeHex(object.fill));
        if (object.stroke && object.strokeWidth > 0) {
          colors.add(normalizeHex(object.stroke));
        }
      }
    }

    const scale = printLocation ? cmPerPixel(printLocation) : 0.15;
    const widthPx = maxX - minX;
    const heightPx = maxY - minY;
    const widthCm = Math.round(widthPx * scale * 10) / 10;
    const heightCm = Math.round(heightPx * scale * 10) / 10;

    const overflows = printLocation
      ? minX < printLocation.area.x - 0.5 ||
        minY < printLocation.area.y - 0.5 ||
        maxX > printLocation.area.x + printLocation.area.width + 0.5 ||
        maxY > printLocation.area.y + printLocation.area.height + 0.5
      : false;

    locations.push({
      location: locationKey,
      objectCount: objects.length,
      colors: [...colors],
      colorCount: Math.max(colors.size + imageColorBudget, 1),
      bbox: { x: minX, y: minY, width: widthPx, height: heightPx },
      widthCm,
      heightCm,
      areaCm2: Math.round(widthCm * heightCm * 10) / 10,
      overflows,
    });
  }

  return {
    locations,
    totalObjects: doc.objects.length,
    maxColors: locations.reduce((acc, l) => Math.max(acc, l.colorCount), 0),
  };
}

/** Pasa el meta del diseño a las líneas que entiende el motor de precios. */
export function quoteLocationsFromMeta(meta: DesignMeta): QuoteLocationInput[] {
  return meta.locations
    .filter((l) => l.objectCount > 0)
    .map((l) => ({
      location: l.location,
      colors: l.colorCount,
      areaCm2: l.areaCm2,
    }));
}

export function emptyDesignDoc(
  productId: string,
  colorId: string,
  method: PrintMethod = "serigrafia",
): DesignDoc {
  return { version: 1, productId, colorId, method, rush: false, objects: [] };
}

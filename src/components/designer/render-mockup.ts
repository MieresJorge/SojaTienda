"use client";

/**
 * Renderizado de imágenes a partir del diseño:
 *  - mockups (prenda + arte) para el carrito, el checkout y el mail al cliente
 *  - archivos de arte por ubicación, en alta, para el taller
 *
 * Todo pasa por el navegador: es donde ya están cargadas las tipografías y el
 * motor de canvas. El servidor recibe PNG y sólo los guarda.
 */

import * as fabric from "fabric";

import {
  MOCKUP_HEIGHT,
  MOCKUP_WIDTH,
  type LocationKey,
  type Product,
  type ProductColor,
  type ViewKey,
} from "@/lib/catalog";
import type { DesignDoc } from "@/lib/design";
import { garmentSvgDataUrl } from "@/lib/garment-svg";

import { createFabricObject } from "./fabric-objects";

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`No se pudo cargar la imagen: ${src}`));
    image.src = src;
  });
}

async function staticCanvasFor(
  doc: DesignDoc,
  product: Product,
  filter: (location: LocationKey) => boolean,
): Promise<fabric.StaticCanvas> {
  const canvas = new fabric.StaticCanvas(undefined, {
    width: MOCKUP_WIDTH,
    height: MOCKUP_HEIGHT,
    enableRetinaScaling: false,
  });
  const objects = doc.objects.filter((object) => {
    const location = product.locations.find((l) => l.key === object.location);
    return location ? filter(location.key) : false;
  });
  for (const model of objects) {
    canvas.add(await createFabricObject(model));
  }
  canvas.renderAll();
  return canvas;
}

export interface MockupOptions {
  doc: DesignDoc;
  product: Product;
  color: ProductColor;
  view: ViewKey;
  /** 2 = 1200x1400 px. Suficiente para el carrito y para imprimir la orden. */
  multiplier?: number;
  /** Color de fondo del PNG. Por defecto transparente. */
  background?: string;
}

/** Mockup completo: prenda teñida + arte de esa vista. */
export async function renderMockup({
  doc,
  product,
  color,
  view,
  multiplier = 2,
  background,
}: MockupOptions): Promise<string> {
  const width = MOCKUP_WIDTH * multiplier;
  const height = MOCKUP_HEIGHT * multiplier;

  const output = document.createElement("canvas");
  output.width = width;
  output.height = height;
  const context = output.getContext("2d");
  if (!context) throw new Error("No se pudo crear el canvas de salida.");

  if (background) {
    context.fillStyle = background;
    context.fillRect(0, 0, width, height);
  }

  const garment = await loadImage(
    garmentSvgDataUrl({
      silhouette: product.silhouette,
      view,
      color: color.hex,
      seam: color.seam,
      shade: color.shade,
      idPrefix: `mockup-${view}`,
    }),
  );
  context.drawImage(garment, 0, 0, width, height);

  const canvas = await staticCanvasFor(
    doc,
    product,
    (key) => product.locations.find((l) => l.key === key)?.view === view,
  );
  const art = canvas.toCanvasElement(multiplier);
  context.drawImage(art, 0, 0);
  canvas.dispose();

  return output.toDataURL("image/png");
}

/** ¿Hay arte en esta vista? Evita guardar mockups vacíos. */
export function viewHasArt(doc: DesignDoc, product: Product, view: ViewKey): boolean {
  return doc.objects.some(
    (object) =>
      product.locations.find((l) => l.key === object.location)?.view === view,
  );
}

/**
 * Arte solo, recortado a su bounding box y en alta resolución.
 * Es el archivo que usa el taller para hacer los fotolitos o el film DTF.
 */
export async function renderArtwork(
  doc: DesignDoc,
  product: Product,
  location: LocationKey,
  targetDpi = 300,
): Promise<{ dataUrl: string; widthPx: number; heightPx: number } | null> {
  const objects = doc.objects.filter((object) => object.location === location);
  if (objects.length === 0) return null;

  const printLocation = product.locations.find((l) => l.key === location);
  if (!printLocation) return null;

  const canvas = await staticCanvasFor(doc, product, (key) => key === location);
  const group = canvas.getObjects();
  if (group.length === 0) {
    canvas.dispose();
    return null;
  }

  // Bounding box real del arte en coordenadas de mockup.
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const object of group) {
    const bounds = object.getBoundingRect();
    minX = Math.min(minX, bounds.left);
    minY = Math.min(minY, bounds.top);
    maxX = Math.max(maxX, bounds.left + bounds.width);
    maxY = Math.max(maxY, bounds.top + bounds.height);
  }

  const cmPerPx = printLocation.realWidthCm / printLocation.area.width;
  const widthCm = (maxX - minX) * cmPerPx;
  // 1 cm = targetDpi / 2.54 px
  const multiplier = Math.min(
    12,
    Math.max(2, ((widthCm * targetDpi) / 2.54) / Math.max(1, maxX - minX)),
  );

  const element = canvas.toCanvasElement(multiplier, {
    left: minX,
    top: minY,
    width: maxX - minX,
    height: maxY - minY,
  });
  canvas.dispose();

  return {
    dataUrl: element.toDataURL("image/png"),
    widthPx: element.width,
    heightPx: element.height,
  };
}

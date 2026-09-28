/**
 * Mockup de la prenda dibujado como SVG vectorial.
 *
 * No usamos fotos de producto: la silueta se dibuja y se tiñe con el color
 * elegido. Ventajas: cualquier color del catálogo se ve al instante, no hay
 * assets que mantener, y el mismo markup sirve para la pantalla y para
 * rasterizar el mockup que se guarda con el pedido.
 *
 * El volumen se logra sólo con gradientes y sombras difuminadas: nada de
 * polígonos de pliegue, que a estos tamaños se ven como manchas.
 */

import { MOCKUP_HEIGHT, MOCKUP_WIDTH, type ViewKey } from "./catalog";

export interface GarmentSvgOptions {
  silhouette: "tshirt" | "tshirt-oversize";
  view: ViewKey;
  /** Color de la tela. */
  color: string;
  /** Color de costuras/cuello. Por defecto se deriva del color de tela. */
  seam?: string;
  shade: "clara" | "oscura";
  /** Prefijo para los ids de gradientes (evita colisiones con otros mockups). */
  idPrefix?: string;
}

interface Silhouette {
  /** Contorno completo de la prenda, con el cuello incluido. */
  body: (neckDip: number) => string;
  /** Curva del cuello, para dibujar el ribete. */
  neckline: (neckDip: number) => string;
  /** Costura del ruedo inferior. */
  hem: string;
  /** Costuras de los puños de manga. */
  sleeveHems: string[];
  /** Centro de las sombras de axila, para el volumen. */
  armpits: Array<{ cx: number; cy: number; rx: number; ry: number }>;
  /** Franja de luz central. */
  highlight: { cx: number; cy: number; rx: number; ry: number };
}

const TSHIRT: Silhouette = {
  body: (neckDip) => `
    M 244 103
    C 230 105 216 111 205 119
    L 178 138
    C 146 150 114 172 96 202
    L 74 248
    C 70 257 74 267 83 270
    L 137 293
    C 146 297 156 293 159 284
    L 182 262
    L 186 618
    C 186 632 194 640 206 640
    L 394 640
    C 406 640 414 632 414 618
    L 418 262
    L 441 284
    C 444 293 454 297 463 293
    L 517 270
    C 526 267 530 257 526 248
    L 504 202
    C 486 172 454 150 422 138
    L 395 119
    C 384 111 370 105 356 103
    C 344 ${103 + neckDip} 256 ${103 + neckDip} 244 103
    Z`,
  neckline: (neckDip) =>
    `M 244 103 C 256 ${103 + neckDip} 344 ${103 + neckDip} 356 103`,
  hem: "M 188 611 L 412 611",
  sleeveHems: ["M 78 259 L 140 285", "M 522 259 L 460 285"],
  armpits: [
    { cx: 196, cy: 280, rx: 46, ry: 60 },
    { cx: 404, cy: 280, rx: 46, ry: 60 },
  ],
  highlight: { cx: 300, cy: 380, rx: 86, ry: 210 },
};

const TSHIRT_OVERSIZE: Silhouette = {
  body: (neckDip) => `
    M 240 100
    C 224 102 208 108 195 117
    L 158 146
    C 128 160 100 182 84 212
    L 60 262
    C 56 271 60 281 69 284
    L 130 308
    C 139 312 149 308 152 299
    L 170 276
    L 174 630
    C 174 644 182 652 194 652
    L 406 652
    C 418 652 426 644 426 630
    L 430 276
    L 448 299
    C 451 308 461 312 470 308
    L 531 284
    C 540 281 544 271 540 262
    L 516 212
    C 500 182 472 160 442 146
    L 405 117
    C 392 108 376 102 360 100
    C 348 ${100 + neckDip} 252 ${100 + neckDip} 240 100
    Z`,
  neckline: (neckDip) =>
    `M 240 100 C 252 ${100 + neckDip} 348 ${100 + neckDip} 360 100`,
  hem: "M 176 623 L 424 623",
  sleeveHems: ["M 64 273 L 133 300", "M 536 273 L 467 300"],
  armpits: [
    { cx: 184, cy: 296, rx: 48, ry: 62 },
    { cx: 416, cy: 296, rx: 48, ry: 62 },
  ],
  highlight: { cx: 300, cy: 395, rx: 92, ry: 215 },
};

function silhouetteFor(key: GarmentSvgOptions["silhouette"]): Silhouette {
  return key === "tshirt-oversize" ? TSHIRT_OVERSIZE : TSHIRT;
}

function shiftHex(hex: string, amount: number): string {
  const normalized =
    hex.length === 4
      ? `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`
      : hex;
  const value = Number.parseInt(normalized.slice(1), 16);
  if (Number.isNaN(value)) return hex;
  const channels = [(value >> 16) & 255, (value >> 8) & 255, value & 255].map((c) =>
    Math.max(0, Math.min(255, Math.round(c + amount))),
  );
  return `#${channels.map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}

/** Devuelve el contenido interno del `<svg>` (sin el tag raíz). */
export function garmentInnerSvg(options: GarmentSvgOptions): string {
  const { view, color, shade } = options;
  const prefix = options.idPrefix ?? "g";
  const silhouette = silhouetteFor(options.silhouette);
  const neckDip = view === "frente" ? 44 : 20;
  const seam = options.seam ?? shiftHex(color, shade === "oscura" ? 20 : -20);
  const outline = shiftHex(color, shade === "oscura" ? 40 : -52);
  const dark = shade === "oscura" ? 0.42 : 0.16;
  const light = shade === "oscura" ? 0.07 : 0.4;
  const body = silhouette.body(neckDip);
  const neckline = silhouette.neckline(neckDip);

  return `
  <defs>
    <linearGradient id="${prefix}-sides" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#000000" stop-opacity="${dark * 0.75}"/>
      <stop offset="16%" stop-color="#000000" stop-opacity="0"/>
      <stop offset="84%" stop-color="#000000" stop-opacity="0"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="${dark * 0.75}"/>
    </linearGradient>
    <linearGradient id="${prefix}-depth" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="${light * 0.5}"/>
      <stop offset="55%" stop-color="#000000" stop-opacity="0"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="${dark * 0.5}"/>
    </linearGradient>
    <radialGradient id="${prefix}-glow">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="${light}"/>
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="${prefix}-shadow">
      <stop offset="0%" stop-color="#000000" stop-opacity="${dark * 0.8}"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="0"/>
    </radialGradient>
    <clipPath id="${prefix}-clip">
      <path d="${body}"/>
    </clipPath>
  </defs>

  <path d="${body}" fill="${color}"/>

  <g clip-path="url(#${prefix}-clip)">
    <ellipse cx="${silhouette.highlight.cx}" cy="${silhouette.highlight.cy}" rx="${silhouette.highlight.rx}" ry="${silhouette.highlight.ry}" fill="url(#${prefix}-glow)"/>
    ${silhouette.armpits
      .map(
        (armpit) =>
          `<ellipse cx="${armpit.cx}" cy="${armpit.cy}" rx="${armpit.rx}" ry="${armpit.ry}" fill="url(#${prefix}-shadow)"/>`,
      )
      .join("\n    ")}
    <rect x="0" y="0" width="${MOCKUP_WIDTH}" height="${MOCKUP_HEIGHT}" fill="url(#${prefix}-sides)"/>
    <rect x="0" y="0" width="${MOCKUP_WIDTH}" height="${MOCKUP_HEIGHT}" fill="url(#${prefix}-depth)"/>
  </g>

  <path d="${body}" fill="none" stroke="${outline}" stroke-width="1.8" stroke-linejoin="round"/>
  <path d="${neckline}" fill="none" stroke="${seam}" stroke-width="12" stroke-linecap="round"/>
  <path d="${neckline}" fill="none" stroke="${outline}" stroke-width="1.4" opacity="0.6"/>
  ${
    view === "espalda"
      ? `<path d="${silhouette.neckline(neckDip + 18)}" fill="none" stroke="${seam}" stroke-width="3" opacity="0.75"/>`
      : ""
  }
  <path d="${silhouette.hem}" fill="none" stroke="${outline}" stroke-width="1.4" opacity="0.45"/>
  ${silhouette.sleeveHems
    .map(
      (hem) =>
        `<path d="${hem}" fill="none" stroke="${outline}" stroke-width="1.4" opacity="0.45"/>`,
    )
    .join("\n  ")}
`;
}

/** SVG completo y autocontenido, apto para rasterizar en un canvas. */
export function garmentSvgDocument(options: GarmentSvgOptions): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${MOCKUP_WIDTH} ${MOCKUP_HEIGHT}" width="${MOCKUP_WIDTH}" height="${MOCKUP_HEIGHT}">${garmentInnerSvg(
    options,
  )}</svg>`;
}

export function garmentSvgDataUrl(options: GarmentSvgOptions): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
    garmentSvgDocument(options),
  )}`;
}

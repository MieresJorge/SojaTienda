/**
 * Motor de cotización de SOJA.
 *
 * Función pura, sin dependencias de React ni de Node: se usa igual en el
 * navegador (para el precio en vivo del diseñador) y en el servidor (para
 * recalcular el precio real antes de cobrar). El precio que llega del cliente
 * NUNCA se usa para cobrar: `/api/checkout` vuelve a correr esto.
 */

import {
  getProduct,
  getSize,
  type LocationKey,
  type PrintMethod,
  type Product,
  type SizeKey,
} from "./catalog";

/** Cantidad mínima de cada escalón de precio. */
export const QTY_TIERS = [1, 6, 12, 24, 50, 100, 250] as const;

export const TIER_LABELS = [
  "1 a 5",
  "6 a 11",
  "12 a 23",
  "24 a 49",
  "50 a 99",
  "100 a 249",
  "250 o más",
];

/** Descuento sobre la prenda lisa según el escalón de cantidad. */
const GARMENT_FACTOR = [1, 1, 0.97, 0.94, 0.9, 0.87, 0.83];

/** Serigrafía: costo por prenda, por ubicación, del primer color. */
const SCREEN_FIRST_COLOR = [2600, 2100, 1600, 1250, 950, 780, 650];

/** Serigrafía: costo por prenda, por ubicación, de cada color adicional. */
const SCREEN_EXTRA_COLOR = [900, 760, 560, 430, 330, 270, 230];

/** Serigrafía: preparación de pantalla, por color y por ubicación (única vez). */
export const SCREEN_SETUP_PER_COLOR = 16500;

/** A partir de esta cantidad no se cobra preparación de pantallas. */
export const SCREEN_SETUP_FREE_FROM = 50;

/** DTF: precio por cm² de arte, por escalón de cantidad. */
const DTF_PER_CM2 = [13, 11, 9.2, 7.6, 6.4, 5.6, 4.9];

/** DTF: cargo mínimo por estampa, por prenda. */
const DTF_MIN_PER_PRINT = 1200;

/** Recargo de producción exprés (48 h hábiles). */
export const RUSH_SURCHARGE = 0.25;

export interface QuoteLocationInput {
  location: LocationKey;
  /** Cantidad de colores planos del arte (solo aplica a serigrafía). */
  colors: number;
  /** Área real del arte en cm² (solo aplica a DTF). */
  areaCm2: number;
}

export interface QuoteInput {
  productId: string;
  colorId: string;
  method: PrintMethod;
  /** Ubicaciones con arte. Las vacías no se cobran. */
  locations: QuoteLocationInput[];
  /** Cantidades por talle. */
  quantities: Partial<Record<SizeKey, number>>;
  rush?: boolean;
}

export interface QuoteLocationLine {
  location: LocationKey;
  label: string;
  colors: number;
  areaCm2: number;
  /** Costo de estampa por prenda en esta ubicación. */
  unitPrice: number;
  /** Preparación total de esta ubicación (0 en DTF o con bonificación). */
  setup: number;
  setupWaived: boolean;
}

export interface QuoteSizeLine {
  size: SizeKey;
  quantity: number;
  upcharge: number;
  unitPrice: number;
  total: number;
}

export interface Quote {
  productId: string;
  productName: string;
  colorId: string;
  method: PrintMethod;
  totalQuantity: number;
  tierIndex: number;
  tierLabel: string;
  /** Cantidad que falta para el próximo escalón (null si ya está en el último). */
  nextTierAt: number | null;
  /** Precio unitario que se conseguiría en el próximo escalón. */
  nextTierUnitPrice: number | null;
  garmentUnitPrice: number;
  printUnitPrice: number;
  /** Precio por prenda talle base (sin recargo de talle), con exprés aplicado. */
  unitPrice: number;
  locationLines: QuoteLocationLine[];
  sizeLines: QuoteSizeLine[];
  /** Suma de prendas + estampa, sin preparación. */
  itemsSubtotal: number;
  setupTotal: number;
  rushSurcharge: number;
  subtotal: number;
  total: number;
  /** Precio promedio final por prenda. */
  averageUnitPrice: number;
  currency: "ARS";
  warnings: string[];
}

export function tierIndexFor(quantity: number): number {
  let index = 0;
  for (let i = 0; i < QTY_TIERS.length; i++) {
    if (quantity >= QTY_TIERS[i]) index = i;
  }
  return index;
}

export function nextTierThreshold(quantity: number): number | null {
  for (const tier of QTY_TIERS) {
    if (quantity < tier) return tier;
  }
  return null;
}

function round50(value: number): number {
  return Math.round(value / 50) * 50;
}

function printUnitPriceFor(
  method: PrintMethod,
  line: QuoteLocationInput,
  tierIndex: number,
): number {
  if (method === "serigrafia") {
    const colors = Math.max(1, Math.round(line.colors));
    return (
      SCREEN_FIRST_COLOR[tierIndex] +
      (colors - 1) * SCREEN_EXTRA_COLOR[tierIndex]
    );
  }
  const raw = DTF_PER_CM2[tierIndex] * Math.max(0, line.areaCm2);
  return Math.max(DTF_MIN_PER_PRINT, raw);
}

/** Suma todas las cantidades por talle. */
export function totalQuantityOf(quantities: Partial<Record<SizeKey, number>>): number {
  return Object.values(quantities).reduce<number>(
    (acc, n) => acc + (Number.isFinite(n) ? Math.max(0, Math.trunc(n as number)) : 0),
    0,
  );
}

/** Precio unitario estimado a una cantidad hipotética (para "comprá X y pagás Y"). */
function unitPriceAtQuantity(
  product: Product,
  input: QuoteInput,
  quantity: number,
): number {
  const tierIndex = tierIndexFor(quantity);
  const garment = round50(product.basePrice * GARMENT_FACTOR[tierIndex]);
  const print = input.locations.reduce(
    (acc, line) => acc + printUnitPriceFor(input.method, line, tierIndex),
    0,
  );
  const setup =
    input.method === "serigrafia" && quantity < SCREEN_SETUP_FREE_FROM
      ? input.locations.reduce(
          (acc, line) => acc + Math.max(1, Math.round(line.colors)) * SCREEN_SETUP_PER_COLOR,
          0,
        )
      : 0;
  const base = garment + print + (quantity > 0 ? setup / quantity : 0);
  return Math.round(base * (input.rush ? 1 + RUSH_SURCHARGE : 1));
}

export function buildQuote(input: QuoteInput): Quote {
  const product = getProduct(input.productId);
  if (!product) {
    throw new Error(`Producto desconocido: ${input.productId}`);
  }

  const warnings: string[] = [];
  const quantities = input.quantities;
  const totalQuantity = totalQuantityOf(quantities);
  const tierIndex = tierIndexFor(Math.max(1, totalQuantity));

  const garmentUnitPrice = round50(product.basePrice * GARMENT_FACTOR[tierIndex]);

  const activeLocations = input.locations.filter(
    (line) => line.colors > 0 || line.areaCm2 > 0,
  );

  const setupWaived =
    input.method === "dtf" || totalQuantity >= SCREEN_SETUP_FREE_FROM;

  const locationLines: QuoteLocationLine[] = activeLocations.map((line) => {
    const location = product.locations.find((l) => l.key === line.location);
    const colors = Math.max(1, Math.round(line.colors));
    const setup =
      input.method === "serigrafia" && !setupWaived
        ? colors * SCREEN_SETUP_PER_COLOR
        : 0;

    if (location && input.method === "serigrafia" && colors > location.maxColors) {
      warnings.push(
        `${location.label}: ${colors} colores supera el máximo de ${location.maxColors} en serigrafía. Te sugerimos DTF.`,
      );
    }

    return {
      location: line.location,
      label: location?.label ?? line.location,
      colors,
      areaCm2: Math.round(line.areaCm2 * 10) / 10,
      unitPrice: printUnitPriceFor(input.method, line, tierIndex),
      setup,
      setupWaived: input.method === "serigrafia" && setupWaived,
    };
  });

  const printUnitPrice = locationLines.reduce((acc, l) => acc + l.unitPrice, 0);
  const setupTotal = locationLines.reduce((acc, l) => acc + l.setup, 0);
  const rushFactor = input.rush ? 1 + RUSH_SURCHARGE : 1;

  const sizeLines: QuoteSizeLine[] = [];
  let itemsSubtotal = 0;

  for (const size of product.sizes) {
    const quantity = Math.max(0, Math.trunc(quantities[size.key] ?? 0));
    if (quantity === 0) continue;
    const upcharge = getSize(product, size.key)?.upcharge ?? 0;
    const unitPrice = Math.round(
      (garmentUnitPrice + printUnitPrice + upcharge) * rushFactor,
    );
    const total = unitPrice * quantity;
    itemsSubtotal += total;
    sizeLines.push({ size: size.key, quantity, upcharge, unitPrice, total });
  }

  const subtotal = itemsSubtotal + setupTotal;
  const rushSurcharge = input.rush
    ? Math.round(itemsSubtotal - itemsSubtotal / rushFactor)
    : 0;

  const nextTierAt = nextTierThreshold(totalQuantity);
  const nextTierUnitPrice =
    nextTierAt !== null ? unitPriceAtQuantity(product, input, nextTierAt) : null;

  if (totalQuantity === 0) {
    warnings.push("Elegí al menos un talle y cantidad para ver el precio final.");
  }
  if (activeLocations.length === 0) {
    warnings.push("Todavía no agregaste arte a ninguna ubicación.");
  }

  return {
    productId: product.id,
    productName: product.name,
    colorId: input.colorId,
    method: input.method,
    totalQuantity,
    tierIndex,
    tierLabel: TIER_LABELS[tierIndex],
    nextTierAt,
    nextTierUnitPrice,
    garmentUnitPrice,
    printUnitPrice,
    unitPrice: Math.round((garmentUnitPrice + printUnitPrice) * rushFactor),
    locationLines,
    sizeLines,
    itemsSubtotal,
    setupTotal,
    rushSurcharge,
    subtotal,
    total: subtotal,
    averageUnitPrice: totalQuantity > 0 ? Math.round(subtotal / totalQuantity) : 0,
    currency: "ARS",
    warnings,
  };
}

/** Tabla "a partir de X unidades" que se muestra en el diseñador. */
export function priceLadder(input: QuoteInput): Array<{
  minQty: number;
  label: string;
  unitPrice: number;
  current: boolean;
}> {
  const product = getProduct(input.productId);
  if (!product) return [];
  const currentTier = tierIndexFor(Math.max(1, totalQuantityOf(input.quantities)));
  return QTY_TIERS.map((minQty, i) => ({
    minQty,
    label: TIER_LABELS[i],
    unitPrice: unitPriceAtQuantity(product, input, minQty),
    current: i === currentTier,
  }));
}

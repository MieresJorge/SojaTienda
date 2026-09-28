/**
 * Catálogo de productos de SOJA.
 *
 * Todo el catálogo vive acá como fuente de verdad. Los precios base están en
 * ARS y se combinan con `src/lib/pricing.ts` para armar la cotización.
 *
 * Coordenadas: todas las zonas de estampado usan el sistema del mockup
 * (MOCKUP_WIDTH x MOCKUP_HEIGHT), el mismo que usa el canvas del diseñador.
 */

export const MOCKUP_WIDTH = 600;
export const MOCKUP_HEIGHT = 700;

export type ViewKey = "frente" | "espalda";

export type LocationKey =
  | "frente"
  | "espalda"
  | "manga_izq"
  | "manga_der";

export type PrintMethod = "serigrafia" | "dtf";

export type SizeKey = "S" | "M" | "L" | "XL" | "2XL" | "3XL";

export type GarmentShade = "clara" | "oscura";

export interface ProductSize {
  key: SizeKey;
  label: string;
  /** Recargo fijo en ARS sobre el precio base de la prenda. */
  upcharge: number;
}

export interface ProductColor {
  id: string;
  name: string;
  hex: string;
  shade: GarmentShade;
  /** Color del cuello/costuras, para dar volumen al mockup. */
  seam?: string;
}

export interface PrintArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PrintLocation {
  key: LocationKey;
  label: string;
  /** Vista del mockup donde se ve esta ubicación. */
  view: ViewKey;
  area: PrintArea;
  /** Medidas reales máximas del área, en cm (para cotizar DTF por cm²). */
  realWidthCm: number;
  realHeightCm: number;
  maxColors: number;
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  shortName: string;
  description: string;
  fabric: string;
  fit: string;
  /** Precio base de la prenda lisa, en ARS, sin estampa. */
  basePrice: number;
  minQty: number;
  sizes: ProductSize[];
  colors: ProductColor[];
  locations: PrintLocation[];
  /** Silueta SVG a usar en el mockup. */
  silhouette: "tshirt" | "tshirt-oversize";
}

const SIZES: ProductSize[] = [
  { key: "S", label: "S", upcharge: 0 },
  { key: "M", label: "M", upcharge: 0 },
  { key: "L", label: "L", upcharge: 0 },
  { key: "XL", label: "XL", upcharge: 0 },
  { key: "2XL", label: "2XL", upcharge: 900 },
  { key: "3XL", label: "3XL", upcharge: 1500 },
];

export const SIZE_ORDER: SizeKey[] = ["S", "M", "L", "XL", "2XL", "3XL"];

const COLORS: ProductColor[] = [
  { id: "blanco", name: "Blanco", hex: "#FFFFFF", shade: "clara", seam: "#E6E6E6" },
  { id: "negro", name: "Negro", hex: "#141414", shade: "oscura", seam: "#000000" },
  { id: "gris-melange", name: "Gris melange", hex: "#B9BDC2", shade: "clara", seam: "#A3A8AE" },
  { id: "gris-topo", name: "Gris topo", hex: "#6E6E6E", shade: "oscura" },
  { id: "marino", name: "Azul marino", hex: "#1E2A4A", shade: "oscura" },
  { id: "azul-francia", name: "Azul Francia", hex: "#2F5FD0", shade: "oscura" },
  { id: "celeste", name: "Celeste", hex: "#8FC4E8", shade: "clara" },
  { id: "rojo", name: "Rojo", hex: "#C62128", shade: "oscura" },
  { id: "bordo", name: "Bordó", hex: "#6E1B24", shade: "oscura" },
  { id: "verde-botella", name: "Verde botella", hex: "#174C36", shade: "oscura" },
  { id: "verde-manzana", name: "Verde manzana", hex: "#7BB661", shade: "clara" },
  { id: "amarillo", name: "Amarillo", hex: "#F2C31B", shade: "clara" },
  { id: "naranja", name: "Naranja", hex: "#E8762C", shade: "clara" },
  { id: "rosa", name: "Rosa", hex: "#E79BB4", shade: "clara" },
  { id: "lila", name: "Lila", hex: "#9B8ACB", shade: "clara" },
  { id: "arena", name: "Arena", hex: "#D8C9AE", shade: "clara" },
];

// Las zonas están calibradas contra la silueta de src/lib/garment-svg.ts:
// 1 cm reales = 6,67 px del mockup.
const STANDARD_LOCATIONS: PrintLocation[] = [
  {
    key: "frente",
    label: "Frente",
    view: "frente",
    area: { x: 200, y: 195, width: 200, height: 250 },
    realWidthCm: 30,
    realHeightCm: 37.5,
    maxColors: 6,
  },
  {
    key: "espalda",
    label: "Espalda",
    view: "espalda",
    area: { x: 195, y: 185, width: 210, height: 270 },
    realWidthCm: 31.5,
    realHeightCm: 40.5,
    maxColors: 6,
  },
  {
    key: "manga_izq",
    label: "Manga izquierda",
    view: "frente",
    area: { x: 104, y: 190, width: 58, height: 70 },
    realWidthCm: 8.7,
    realHeightCm: 10.5,
    maxColors: 3,
  },
  {
    key: "manga_der",
    label: "Manga derecha",
    view: "frente",
    area: { x: 438, y: 190, width: 58, height: 70 },
    realWidthCm: 8.7,
    realHeightCm: 10.5,
    maxColors: 3,
  },
];

export const PRODUCTS: Product[] = [
  {
    id: "remera-clasica",
    slug: "remera-clasica",
    name: "Remera clásica algodón 20/1",
    shortName: "Clásica 20/1",
    description:
      "Remera de algodón peinado 20/1, cuello redondo con elastano. El caballito de batalla para eventos, equipos y merch.",
    fabric: "100% algodón peinado 20/1 · 145 g/m²",
    fit: "Regular fit unisex",
    basePrice: 7200,
    minQty: 1,
    sizes: SIZES,
    colors: COLORS,
    locations: STANDARD_LOCATIONS,
    silhouette: "tshirt",
  },
  {
    id: "remera-premium",
    slug: "remera-premium",
    name: "Remera premium algodón 24/1",
    shortName: "Premium 24/1",
    description:
      "Algodón peinado 24/1 de mayor densidad y mejor caída. Ideal para marcas de indumentaria y uniformes de atención al público.",
    fabric: "100% algodón peinado 24/1 · 165 g/m²",
    fit: "Regular fit unisex",
    basePrice: 9400,
    minQty: 1,
    sizes: SIZES,
    colors: COLORS,
    locations: STANDARD_LOCATIONS,
    silhouette: "tshirt",
  },
  {
    id: "remera-oversize",
    slug: "remera-oversize",
    name: "Remera oversize frisa liviana",
    shortName: "Oversize",
    description:
      "Corte oversize de hombro caído y cuerpo ancho, con área de estampado más grande. La preferida para streetwear.",
    fabric: "100% algodón 24/1 · 185 g/m²",
    fit: "Oversize, hombro caído",
    basePrice: 12800,
    minQty: 1,
    sizes: SIZES,
    colors: COLORS,
    locations: [
      {
        ...STANDARD_LOCATIONS[0],
        area: { x: 190, y: 205, width: 220, height: 270 },
        realWidthCm: 33,
        realHeightCm: 40.5,
      },
      {
        ...STANDARD_LOCATIONS[1],
        area: { x: 185, y: 195, width: 230, height: 290 },
        realWidthCm: 34.5,
        realHeightCm: 43.5,
      },
      {
        ...STANDARD_LOCATIONS[2],
        area: { x: 94, y: 204, width: 58, height: 70 },
      },
      {
        ...STANDARD_LOCATIONS[3],
        area: { x: 448, y: 204, width: 58, height: 70 },
      },
    ],
    silhouette: "tshirt-oversize",
  },
];

export function getProduct(productId: string): Product | undefined {
  return PRODUCTS.find((p) => p.id === productId);
}

export function getColor(product: Product, colorId: string): ProductColor | undefined {
  return product.colors.find((c) => c.id === colorId);
}

/**
 * Busca un color en todo el catálogo, sin saber de qué producto salió.
 * Lo usa el panel, que muestra colores de pedidos viejos cuyo producto puede
 * haber cambiado.
 */
export function findColor(colorId: string): ProductColor | undefined {
  for (const product of PRODUCTS) {
    const color = getColor(product, colorId);
    if (color) return color;
  }
  return undefined;
}

export function getLocation(
  product: Product,
  locationKey: LocationKey,
): PrintLocation | undefined {
  return product.locations.find((l) => l.key === locationKey);
}

export function getSize(product: Product, sizeKey: SizeKey): ProductSize | undefined {
  return product.sizes.find((s) => s.key === sizeKey);
}

/** cm reales por píxel del mockup, para pasar de arte a cm² imprimibles. */
export function cmPerPixel(location: PrintLocation): number {
  return location.realWidthCm / location.area.width;
}

export const PRINT_METHODS: Record<
  PrintMethod,
  { key: PrintMethod; name: string; tagline: string; description: string; bestFor: string }
> = {
  serigrafia: {
    key: "serigrafia",
    name: "Serigrafía",
    tagline: "La más económica por cantidad",
    description:
      "Tinta plastisol aplicada con pantalla, un color por vez. Hay un costo único de preparación por cada color, que se bonifica a partir de 50 prendas.",
    bestFor: "Desde 20 prendas, diseños de hasta 6 colores planos.",
  },
  dtf: {
    key: "dtf",
    name: "DTF (full color)",
    tagline: "Sin mínimos, full color",
    description:
      "Transfer digital de film, sin límite de colores ni costo de preparación. Se cotiza por centímetro cuadrado de arte.",
    bestFor: "Cantidades chicas, fotos, degradés y diseños con muchos colores.",
  },
};

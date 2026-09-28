/** Tipografías disponibles en el diseñador. Se cargan desde Google Fonts. */

export interface DesignFont {
  id: string;
  /** Valor exacto para font-family. */
  family: string;
  category: "Display" | "Sans" | "Serif" | "Manuscrita";
  /** Pesos reales publicados en Google Fonts (para no pedir uno inexistente). */
  weights: number[];
}

export const DESIGN_FONTS: DesignFont[] = [
  { id: "anton", family: "Anton", category: "Display", weights: [400] },
  { id: "bebas", family: "Bebas Neue", category: "Display", weights: [400] },
  { id: "archivo-black", family: "Archivo Black", category: "Display", weights: [400] },
  { id: "bungee", family: "Bungee", category: "Display", weights: [400] },
  { id: "righteous", family: "Righteous", category: "Display", weights: [400] },
  { id: "teko", family: "Teko", category: "Display", weights: [400, 700] },
  { id: "oswald", family: "Oswald", category: "Sans", weights: [400, 700] },
  { id: "montserrat", family: "Montserrat", category: "Sans", weights: [400, 700] },
  { id: "poppins", family: "Poppins", category: "Sans", weights: [400, 700] },
  { id: "inter", family: "Inter", category: "Sans", weights: [400, 700] },
  { id: "playfair", family: "Playfair Display", category: "Serif", weights: [400, 700] },
  { id: "lobster", family: "Lobster", category: "Manuscrita", weights: [400] },
  { id: "pacifico", family: "Pacifico", category: "Manuscrita", weights: [400] },
  {
    id: "permanent-marker",
    family: "Permanent Marker",
    category: "Manuscrita",
    weights: [400],
  },
  { id: "caveat", family: "Caveat", category: "Manuscrita", weights: [400, 700] },
];

export const DEFAULT_FONT = "Anton";

export function fontByFamily(family: string): DesignFont | undefined {
  return DESIGN_FONTS.find((font) => font.family === family);
}

/** URL de Google Fonts con todas las familias del diseñador. */
export const GOOGLE_FONTS_HREF = `https://fonts.googleapis.com/css2?${DESIGN_FONTS.map(
  (font) => {
    const name = font.family.replace(/ /g, "+");
    return font.weights.length > 1
      ? `family=${name}:wght@${font.weights.join(";")}`
      : `family=${name}`;
  },
).join("&")}&display=swap`;

/** Espera a que las familias estén disponibles antes de medir el texto. */
export async function waitForDesignFonts(): Promise<void> {
  if (typeof document === "undefined" || !("fonts" in document)) return;
  await Promise.all(
    DESIGN_FONTS.flatMap((font) =>
      font.weights.map((weight) =>
        document.fonts.load(`${weight} 40px "${font.family}"`),
      ),
    ),
  ).catch(() => undefined);
  await document.fonts.ready;
}

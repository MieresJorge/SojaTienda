/**
 * Carta de tintas. En serigrafía cada color es una pantalla aparte, así que
 * conviene que el cliente elija de una carta cerrada y no de un selector
 * infinito: menos colores accidentales, presupuesto más previsible.
 */
export interface InkColor {
  name: string;
  hex: string;
}

export const INK_COLORS: InkColor[] = [
  { name: "Blanco", hex: "#ffffff" },
  { name: "Negro", hex: "#111111" },
  { name: "Gris", hex: "#9aa0a6" },
  { name: "Rojo", hex: "#d21f28" },
  { name: "Bordó", hex: "#7c1c2a" },
  { name: "Naranja", hex: "#ef7622" },
  { name: "Amarillo", hex: "#f7c81c" },
  { name: "Oro", hex: "#c79b2e" },
  { name: "Verde brote", hex: "#86b23c" },
  { name: "Verde botella", hex: "#15503a" },
  { name: "Celeste", hex: "#63b3e8" },
  { name: "Azul Francia", hex: "#2f5fd0" },
  { name: "Azul marino", hex: "#1c2a4a" },
  { name: "Violeta", hex: "#6b3fa0" },
  { name: "Rosa", hex: "#e77fa5" },
  { name: "Beige", hex: "#e4d4b4" },
];

export function inkName(hex: string): string {
  const normalized = hex.toLowerCase();
  return INK_COLORS.find((ink) => ink.hex === normalized)?.name ?? hex.toUpperCase();
}

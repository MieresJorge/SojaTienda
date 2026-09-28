/**
 * Galería de formas vectoriales del diseñador.
 *
 * Todas son paths en un viewBox de 100x100, sin dependencias externas: se
 * dibujan igual en el canvas (Fabric) y en el panel de la galería (SVG), y
 * viajan al taller como vectores, no como bitmaps.
 */

export interface ClipartItem {
  id: string;
  name: string;
  category: "Formas" | "Íconos" | "Deporte" | "Argentina";
  /** Path en viewBox 0 0 100 100. */
  path: string;
  fillRule?: "evenodd" | "nonzero";
}

export const CLIPART: ClipartItem[] = [
  {
    id: "circulo",
    name: "Círculo",
    category: "Formas",
    path: "M50 6 A44 44 0 1 0 50 94 A44 44 0 1 0 50 6 Z",
  },
  {
    id: "anillo",
    name: "Anillo",
    category: "Formas",
    fillRule: "evenodd",
    path: "M50 4 A46 46 0 1 0 50 96 A46 46 0 1 0 50 4 Z M50 24 A26 26 0 1 1 50 76 A26 26 0 1 1 50 24 Z",
  },
  {
    id: "cuadrado",
    name: "Cuadrado",
    category: "Formas",
    path: "M10 10 H90 V90 H10 Z",
  },
  {
    id: "triangulo",
    name: "Triángulo",
    category: "Formas",
    path: "M50 8 L94 88 H6 Z",
  },
  {
    id: "hexagono",
    name: "Hexágono",
    category: "Formas",
    path: "M50 5 L89 27.5 L89 72.5 L50 95 L11 72.5 L11 27.5 Z",
  },
  {
    id: "rombo",
    name: "Rombo",
    category: "Formas",
    path: "M50 5 L95 50 L50 95 L5 50 Z",
  },
  {
    id: "cinta",
    name: "Cinta",
    category: "Formas",
    path: "M8 30 H92 L80 50 L92 70 H8 L20 50 Z",
  },
  {
    id: "onda",
    name: "Onda",
    category: "Formas",
    path: "M6 62 C26 40 42 84 60 60 C74 42 84 54 94 46 L94 60 C82 70 72 58 62 72 C44 96 26 56 6 76 Z",
  },
  {
    id: "estrella",
    name: "Estrella",
    category: "Íconos",
    path: "M50 5 L61.8 38.2 L96.4 38.2 L68.3 58.8 L79.9 92 L50 71.5 L20.1 92 L31.7 58.8 L3.6 38.2 L38.2 38.2 Z",
  },
  {
    id: "destello",
    name: "Destello",
    category: "Íconos",
    path: "M50 4 C54 32 68 46 96 50 C68 54 54 68 50 96 C46 68 32 54 4 50 C32 46 46 32 50 4 Z",
  },
  {
    id: "corazon",
    name: "Corazón",
    category: "Íconos",
    path: "M50 90 C50 90 8 63 8 35 C8 19 20 9 32 9 C41 9 47 14 50 21 C53 14 59 9 68 9 C80 9 92 19 92 35 C92 63 50 90 50 90 Z",
  },
  {
    id: "rayo",
    name: "Rayo",
    category: "Íconos",
    path: "M58 4 L22 56 L46 56 L38 96 L78 42 L52 42 Z",
  },
  {
    id: "corona",
    name: "Corona",
    category: "Íconos",
    path: "M10 80 L18 24 L36 48 L50 16 L64 48 L82 24 L90 80 Z",
  },
  {
    id: "fuego",
    name: "Fuego",
    category: "Íconos",
    path: "M50 4 C58 26 76 32 76 56 C76 78 64 94 50 94 C36 94 24 80 24 60 C24 46 34 42 38 34 C42 44 48 44 48 36 C48 26 46 16 50 4 Z",
  },
  {
    id: "escudo",
    name: "Escudo",
    category: "Deporte",
    path: "M50 6 L88 20 V52 C88 76 70 90 50 96 C30 90 12 76 12 52 V20 Z",
  },
  {
    id: "pelota",
    name: "Pelota",
    category: "Deporte",
    fillRule: "evenodd",
    path: "M50 6 A44 44 0 1 0 50 94 A44 44 0 1 0 50 6 Z M50 28 L69 42 L62 64 H38 L31 42 Z",
  },
  {
    id: "laurel",
    name: "Laureles",
    category: "Deporte",
    path: "M38 12 C18 26 12 50 22 74 C26 84 34 90 44 92 L44 82 C34 80 28 72 26 62 C34 68 42 68 48 64 C40 60 34 54 32 46 C40 50 48 50 54 46 C44 40 40 32 40 22 Z M62 12 C82 26 88 50 78 74 C74 84 66 90 56 92 L56 82 C66 80 72 72 74 62 C66 68 58 68 52 64 C60 60 66 54 68 46 C60 50 52 50 46 46 C56 40 60 32 60 22 Z",
  },
  {
    id: "flecha",
    name: "Flecha",
    category: "Íconos",
    path: "M8 40 H62 V20 L94 50 L62 80 V60 H8 Z",
  },
  {
    id: "sol",
    name: "Sol",
    category: "Íconos",
    path: "M50 2 L57 20 L74 10 L70 29 L90 26 L79 42 L98 50 L79 58 L90 74 L70 71 L74 90 L57 80 L50 98 L43 80 L26 90 L30 71 L10 74 L21 58 L2 50 L21 42 L10 26 L30 29 L26 10 L43 20 Z",
  },
  {
    id: "mate",
    name: "Mate",
    category: "Argentina",
    path: "M50 24 C30 24 20 40 20 58 C20 80 33 94 50 94 C67 94 80 80 80 58 C80 40 70 24 50 24 Z M64 6 L74 9 L56 44 L48 40 Z",
  },
  {
    id: "calavera",
    name: "Calavera",
    category: "Íconos",
    fillRule: "evenodd",
    path: "M50 6 C28 6 14 22 14 42 C14 54 20 62 26 68 L26 84 C26 90 30 94 36 94 H64 C70 94 74 90 74 84 L74 68 C80 62 86 54 86 42 C86 22 72 6 50 6 Z M34 34 A10 10 0 1 0 34 54 A10 10 0 1 0 34 34 Z M66 34 A10 10 0 1 0 66 54 A10 10 0 1 0 66 34 Z M44 70 H56 V84 H44 Z",
  },
  {
    id: "montanas",
    name: "Montañas",
    category: "Formas",
    path: "M4 84 L34 30 L52 60 L64 42 L96 84 Z",
  },
];

export const CLIPART_CATEGORIES = [
  "Formas",
  "Íconos",
  "Deporte",
  "Argentina",
] as const;

export function getClipart(id: string): ClipartItem | undefined {
  return CLIPART.find((item) => item.id === id);
}

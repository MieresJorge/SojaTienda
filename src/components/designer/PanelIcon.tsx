import type { PanelKey } from "@/lib/designer-store";

const PATHS: Record<PanelKey, string> = {
  // Remera
  producto:
    "M8 3 L4 5 L2.5 9 L5 10 L5.5 8 L5.5 21 L18.5 21 L18.5 8 L19 10 L21.5 9 L20 5 L16 3 C15 5.2 9 5.2 8 3 Z",
  // Letra T
  texto: "M4 5 H20 M12 5 V19 M9 19 H15",
  // Estrella
  arte: "M12 3 L14.6 9.1 L21 9.7 L16.1 14 L17.6 20.4 L12 17 L6.4 20.4 L7.9 14 L3 9.7 L9.4 9.1 Z",
  // Flecha hacia arriba sobre bandeja
  subir: "M12 16 V4 M7.5 8.5 L12 4 L16.5 8.5 M4 15 V19 A1 1 0 0 0 5 20 H19 A1 1 0 0 0 20 19 V15",
  // Capas
  capas: "M12 3 L21 8 L12 13 L3 8 Z M3 12.5 L12 17.5 L21 12.5 M3 17 L12 22 L21 17",
};

const FILLED: PanelKey[] = ["producto", "arte"];

export function PanelIcon({ panel }: { panel: PanelKey }) {
  const filled = FILLED.includes(panel);
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={filled ? 0 : 1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d={PATHS[panel]} />
    </svg>
  );
}

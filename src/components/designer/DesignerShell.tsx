"use client";

import dynamic from "next/dynamic";

import { getProduct } from "@/lib/catalog";
import { useDesigner, type PanelKey } from "@/lib/designer-store";
import { cx, Segmented } from "@/components/ui";

import { PanelIcon } from "./PanelIcon";
import { QuotePanel } from "./QuotePanel";
import { ArtPanel } from "./panels/ArtPanel";
import { LayersPanel } from "./panels/LayersPanel";
import { ProductPanel } from "./panels/ProductPanel";
import { TextPanel } from "./panels/TextPanel";
import { UploadPanel } from "./panels/UploadPanel";

// Fabric toca `window` al importarse: el canvas sólo se carga en el cliente.
const DesignCanvas = dynamic(
  () => import("./DesignCanvas").then((module) => module.DesignCanvas),
  {
    ssr: false,
    loading: () => (
      <div className="mx-auto aspect-[6/7] w-full max-w-[560px] animate-pulse rounded-xl bg-paper-alt" />
    ),
  },
);

const PANELS: Array<{ key: PanelKey; label: string }> = [
  { key: "producto", label: "Prenda" },
  { key: "texto", label: "Texto" },
  { key: "arte", label: "Arte" },
  { key: "subir", label: "Subir" },
  { key: "capas", label: "Capas" },
];

function PanelBody({ panel }: { panel: PanelKey }) {
  switch (panel) {
    case "producto":
      return <ProductPanel />;
    case "texto":
      return <TextPanel />;
    case "arte":
      return <ArtPanel />;
    case "subir":
      return <UploadPanel />;
    case "capas":
      return <LayersPanel />;
  }
}

export function DesignerShell() {
  const panel = useDesigner((s) => s.panel);
  const setPanel = useDesigner((s) => s.setPanel);
  const activeView = useDesigner((s) => s.activeView);
  const setActiveView = useDesigner((s) => s.setActiveView);
  const activeLocation = useDesigner((s) => s.activeLocation);
  const setActiveLocation = useDesigner((s) => s.setActiveLocation);
  const productId = useDesigner((s) => s.productId);
  const undo = useDesigner((s) => s.undo);
  const redo = useDesigner((s) => s.redo);
  const canUndo = useDesigner((s) => s.past.length > 0);
  const canRedo = useDesigner((s) => s.future.length > 0);

  const product = getProduct(productId);
  const viewLocations = product?.locations.filter((l) => l.view === activeView) ?? [];

  return (
    <div className="mx-auto flex max-w-[1600px] flex-col lg:h-[calc(100dvh-4rem)] lg:flex-row">
      {/* Rail de herramientas */}
      <nav className="order-2 flex shrink-0 gap-1 overflow-x-auto border-y border-line bg-surface px-2 py-2 lg:order-1 lg:w-[78px] lg:flex-col lg:border-y-0 lg:border-r lg:py-4">
        {PANELS.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setPanel(item.key)}
            className={cx(
              "flex min-w-[68px] flex-1 flex-col items-center gap-1 rounded-xl px-2 py-2 text-[11px] font-medium transition-colors lg:flex-none",
              panel === item.key
                ? "bg-ink text-paper"
                : "text-ink-soft hover:bg-paper-alt hover:text-ink",
            )}
          >
            <PanelIcon panel={item.key} />
            {item.label}
          </button>
        ))}
      </nav>

      {/* Panel de la herramienta activa */}
      <aside className="scroll-slim order-3 w-full shrink-0 border-b border-line bg-surface lg:order-2 lg:w-[312px] lg:overflow-y-auto lg:border-b-0 lg:border-r">
        <PanelBody panel={panel} />
      </aside>

      {/* Escenario */}
      <div className="bg-taller order-1 flex flex-1 flex-col lg:order-3">
        <div className="flex items-center justify-between gap-3 px-4 pt-4">
          <div className="w-40">
            <Segmented
              size="sm"
              value={activeView}
              onChange={setActiveView}
              options={[
                { value: "frente", label: "Frente" },
                { value: "espalda", label: "Espalda" },
              ]}
            />
          </div>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={undo}
              disabled={!canUndo}
              title="Deshacer (Ctrl+Z)"
              className="h-8 w-8 rounded-full border border-line bg-surface text-sm text-ink-soft transition-colors hover:border-ink disabled:opacity-35"
            >
              ↶
            </button>
            <button
              type="button"
              onClick={redo}
              disabled={!canRedo}
              title="Rehacer (Ctrl+Shift+Z)"
              className="h-8 w-8 rounded-full border border-line bg-surface text-sm text-ink-soft transition-colors hover:border-ink disabled:opacity-35"
            >
              ↷
            </button>
          </div>
        </div>

        <div className="flex flex-1 items-center justify-center px-4 py-6">
          <DesignCanvas />
        </div>

        <div className="flex flex-wrap items-center justify-center gap-1.5 px-4 pb-5">
          {viewLocations.map((location) => (
            <button
              key={location.key}
              type="button"
              onClick={() => setActiveLocation(location.key)}
              className={cx(
                "rounded-full border px-3 py-1 text-xs transition-colors",
                location.key === activeLocation
                  ? "border-ink bg-ink text-paper"
                  : "border-line bg-surface text-ink-soft hover:border-ink",
              )}
            >
              {location.label}
            </button>
          ))}
        </div>
      </div>

      {/* Cotización */}
      <aside className="order-4 w-full shrink-0 border-t border-line bg-surface lg:w-[352px] lg:border-l lg:border-t-0">
        <QuotePanel />
      </aside>
    </div>
  );
}

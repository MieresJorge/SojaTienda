"use client";

import { INK_COLORS } from "@/lib/ink-colors";
import { cx } from "@/components/ui";

export function ColorSwatches({
  value,
  onChange,
  allowNone = false,
  onNone,
  size = 26,
}: {
  value: string | null;
  onChange: (hex: string) => void;
  allowNone?: boolean;
  onNone?: () => void;
  size?: number;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {allowNone && (
        <button
          type="button"
          onClick={onNone}
          title="Sin color"
          style={{ width: size, height: size }}
          className={cx(
            "relative rounded-full border transition-transform hover:scale-110",
            value === null ? "border-ink ring-2 ring-ink/20" : "border-line",
          )}
        >
          <span className="absolute left-1/2 top-1/2 h-[1.5px] w-[70%] -translate-x-1/2 -translate-y-1/2 rotate-45 bg-alerta" />
        </button>
      )}
      {INK_COLORS.map((ink) => (
        <button
          key={ink.hex}
          type="button"
          title={ink.name}
          onClick={() => onChange(ink.hex)}
          style={{ width: size, height: size, backgroundColor: ink.hex }}
          className={cx(
            "rounded-full border transition-transform hover:scale-110",
            value?.toLowerCase() === ink.hex
              ? "border-ink ring-2 ring-ink/25"
              : "border-line",
          )}
        >
          <span className="sr-only">{ink.name}</span>
        </button>
      ))}
    </div>
  );
}

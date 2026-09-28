"use client";

import { useSyncExternalStore } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { PrintMethod, SizeKey } from "./catalog";
import { nanoid } from "./id";

/**
 * Carrito del cliente.
 *
 * Guarda lo mínimo para mostrar la línea y volver a cotizarla: el id del
 * diseño (que vive en la base) y las cantidades. Los precios que hay acá son
 * sólo para mostrar: el checkout los recalcula en el servidor.
 */
export interface CartItem {
  id: string;
  designId: string;
  productId: string;
  productName: string;
  colorId: string;
  colorName: string;
  method: PrintMethod;
  rush: boolean;
  quantities: Partial<Record<SizeKey, number>>;
  totalQuantity: number;
  previewUrl: string | null;
  unitPrice: number;
  subtotal: number;
  addedAt: string;
}

interface CartState {
  items: CartItem[];
  add: (item: Omit<CartItem, "id" | "addedAt">) => string;
  remove: (id: string) => void;
  clear: () => void;
}

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      add: (item) => {
        const id = nanoid();
        set((state) => ({
          items: [...state.items, { ...item, id, addedAt: new Date().toISOString() }],
        }));
        return id;
      },
      remove: (id) =>
        set((state) => ({ items: state.items.filter((item) => item.id !== id) })),
      clear: () => set({ items: [] }),
    }),
    { name: "soja-cart-v1", version: 1 },
  ),
);

export function cartUnits(items: CartItem[]): number {
  return items.reduce((acc, item) => acc + item.totalQuantity, 0);
}

export function cartSubtotal(items: CartItem[]): number {
  return items.reduce((acc, item) => acc + item.subtotal, 0);
}

/**
 * El estado persistido se hidrata después del primer render. Sin esto, el
 * HTML del servidor y el del cliente no coinciden y React tira un warning.
 */
export function useCartHydrated(): boolean {
  return useSyncExternalStore(
    (onStoreChange) => useCart.persist.onFinishHydration(onStoreChange),
    () => useCart.persist.hasHydrated(),
    // En el servidor nunca hay estado persistido.
    () => false,
  );
}

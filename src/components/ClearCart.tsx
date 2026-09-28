"use client";

import { useEffect } from "react";

import { useCart } from "@/lib/cart-store";

/** Vacía el carrito cuando el pedido ya está pago. */
export function ClearCart() {
  const clear = useCart((state) => state.clear);
  useEffect(() => {
    clear();
  }, [clear]);
  return null;
}

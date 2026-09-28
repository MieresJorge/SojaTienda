import { customAlphabet } from "nanoid";

/** Ids internos: cortos, url-safe y sin caracteres ambiguos. */
export const nanoid = customAlphabet(
  "0123456789abcdefghijklmnopqrstuvwxyz",
  12,
);

/** Código de pedido que ve el cliente: SOJA-7KF2QX. */
const codeAlphabet = customAlphabet("ABCDEFGHJKLMNPQRSTUVWXYZ23456789", 6);

export function orderCode(): string {
  return `SOJA-${codeAlphabet()}`;
}

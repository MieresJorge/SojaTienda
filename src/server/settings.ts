import "server-only";

import { cache } from "react";
import { z } from "zod";

import { prisma } from "./db";

/**
 * Ajustes operativos que el dueño edita desde /admin/config.
 *
 * La lista de precios NO vive acá: sigue en src/lib/pricing.ts, que es código
 * y se versiona. Acá está sólo lo que cambia seguido y no afecta al motor de
 * cotización: costo de envío, umbral de envío gratis, datos de contacto y el
 * interruptor para pausar las ventas.
 *
 * Cada clave tiene un valor por defecto que sale del .env, así el sitio
 * funciona igual antes de que alguien toque el panel.
 */

export const settingsSchema = z.object({
  /** Costo fijo del envío a domicilio, en pesos. */
  shippingFlat: z.coerce.number().int().min(0).max(1_000_000),
  /** Desde este subtotal el envío es gratis. 0 = nunca. */
  freeShippingFrom: z.coerce.number().int().min(0).max(100_000_000),
  /** Mail al que llegan los pedidos. */
  orderEmail: z.string().trim().email().max(160),
  /** WhatsApp de contacto, como lo escribe el cliente. */
  whatsapp: z.string().trim().max(40),
  /** Dirección del taller, para los retiros. */
  pickupAddress: z.string().trim().max(200),
  /** Días hábiles de producción que se prometen. */
  leadTimeDays: z.coerce.number().int().min(1).max(120),
  /** Pausa las ventas: el checkout deja de aceptar pedidos nuevos. */
  storePaused: z.coerce.boolean(),
  /** Aviso que se muestra arriba de todo en la tienda. Vacío = sin aviso. */
  storeNotice: z.string().trim().max(240),
});

export type Settings = z.infer<typeof settingsSchema>;

export const SETTINGS_KEYS = Object.keys(settingsSchema.shape) as Array<
  keyof Settings
>;

function defaults(): Settings {
  return {
    shippingFlat: Number(process.env.SOJA_SHIPPING_FLAT ?? 6500),
    freeShippingFrom: Number(process.env.SOJA_FREE_SHIPPING_FROM ?? 250000),
    orderEmail: process.env.SOJA_ORDER_EMAIL || "pedidos@soja.com.ar",
    whatsapp: process.env.SOJA_WHATSAPP || "",
    pickupAddress: process.env.SOJA_PICKUP_ADDRESS || "",
    leadTimeDays: Number(process.env.SOJA_LEAD_TIME_DAYS ?? 7),
    storePaused: false,
    storeNotice: "",
  };
}

/**
 * Lee los ajustes. Memoizado por render: el layout, el header y el checkout
 * los piden en la misma pasada.
 */
export const getSettings = cache(async (): Promise<Settings> => {
  const base = defaults();
  let rows: Array<{ key: string; value: string }> = [];
  try {
    rows = await prisma.setting.findMany();
  } catch (error) {
    // Base sin migrar todavía: seguimos con los valores del .env.
    console.error("[settings] no se pudieron leer los ajustes", error);
    return base;
  }

  const stored: Record<string, unknown> = {};
  for (const row of rows) {
    if (!(SETTINGS_KEYS as string[]).includes(row.key)) continue;
    stored[row.key] = row.value === "true" ? true : row.value === "false" ? false : row.value;
  }

  const merged = settingsSchema.safeParse({ ...base, ...stored });
  return merged.success ? merged.data : base;
});

/** Guarda sólo las claves que llegan. Las que faltan quedan como estaban. */
export async function saveSettings(input: Partial<Settings>): Promise<void> {
  const entries = Object.entries(input).filter(([key]) =>
    (SETTINGS_KEYS as string[]).includes(key),
  );

  await prisma.$transaction(
    entries.map(([key, value]) =>
      prisma.setting.upsert({
        where: { key },
        create: { key, value: String(value) },
        update: { value: String(value) },
      }),
    ),
  );
}

/** Costo de envío según los ajustes vigentes. Lo usa el checkout. */
export function shippingCostWith(
  settings: Settings,
  method: "pickup" | "envio",
  subtotal: number,
): number {
  if (method === "pickup") return 0;
  if (settings.freeShippingFrom > 0 && subtotal >= settings.freeShippingFrom) return 0;
  return settings.shippingFlat;
}

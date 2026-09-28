"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import {
  adminConfigured,
  attemptsLeft,
  clearAttempts,
  clientKey,
  endSession,
  registerFailedAttempt,
  requireAdmin,
  startSession,
  verifyPassword,
} from "@/server/admin-auth";
import { ORDER_STATUSES, statusLabel } from "@/server/admin";
import { prisma } from "@/server/db";
import { recordOrderEvent } from "@/server/orders";
import { saveSettings, settingsSchema } from "@/server/settings";

/**
 * Acciones del panel.
 *
 * Todas las que tocan datos llaman a `requireAdmin()` primero: una server
 * action es un endpoint POST más, así que el proxy no alcanza para
 * protegerlas.
 */

export interface ActionState {
  error?: string;
  ok?: string;
}

// ---------------------------------------------------------------------------
// Sesión
// ---------------------------------------------------------------------------

/** Sólo aceptamos rutas internas: si no, esto es un redirect abierto. */
function safeNext(value: FormDataEntryValue | null): string {
  const raw = typeof value === "string" ? value : "";
  if (!raw.startsWith("/admin") || raw.startsWith("//")) return "/admin";
  return raw;
}

export async function loginAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (!adminConfigured()) {
    return {
      error:
        "Todavía no hay contraseña configurada. Agregá ADMIN_PASSWORD en el .env y reiniciá el servidor.",
    };
  }

  const key = await clientKey();
  if (attemptsLeft(key) <= 0) {
    return {
      error: "Demasiados intentos fallidos. Esperá unos minutos y probá de nuevo.",
    };
  }

  const password = String(formData.get("password") ?? "");
  if (!verifyPassword(password)) {
    const left = registerFailedAttempt(key);
    return {
      error:
        left > 0
          ? `Contraseña incorrecta. Te quedan ${left} ${left === 1 ? "intento" : "intentos"}.`
          : "Demasiados intentos fallidos. Esperá unos minutos.",
    };
  }

  clearAttempts(key);
  await startSession();
  // redirect() lanza: tiene que quedar fuera de cualquier try/catch.
  redirect(safeNext(formData.get("next")));
}

export async function logoutAction(): Promise<void> {
  await endSession();
  redirect("/admin/login");
}

// ---------------------------------------------------------------------------
// Pedidos
// ---------------------------------------------------------------------------

const statusKeys = ORDER_STATUSES.map((status) => status.key) as [string, ...string[]];

const statusInput = z.object({
  orderId: z.string().min(1).max(64),
  status: z.enum(statusKeys),
});

export async function updateOrderStatusAction(formData: FormData): Promise<void> {
  await requireAdmin();

  const parsed = statusInput.safeParse({
    orderId: formData.get("orderId"),
    status: formData.get("status"),
  });
  if (!parsed.success) return;

  const order = await prisma.order.findUnique({
    where: { id: parsed.data.orderId },
    select: { id: true, code: true, status: true, paidAt: true },
  });
  if (!order || order.status === parsed.data.status) return;

  await prisma.order.update({
    where: { id: order.id },
    data: {
      status: parsed.data.status,
      // Si se marca pagado a mano (transferencia, efectivo) sellamos la fecha.
      paidAt:
        parsed.data.status === "paid" && !order.paidAt ? new Date() : (order.paidAt ?? undefined),
    },
  });

  await recordOrderEvent(
    order.id,
    "status",
    `Estado cambiado a mano: ${statusLabel(order.status)} → ${statusLabel(parsed.data.status)}.`,
  );

  revalidatePath("/admin");
  revalidatePath("/admin/pedidos");
  revalidatePath(`/admin/pedidos/${order.id}`);
  revalidatePath("/admin/produccion");
  revalidatePath(`/pedido/${order.code}`);
}

const noteInput = z.object({
  orderId: z.string().min(1).max(64),
  message: z.string().trim().min(1).max(600),
});

export async function addOrderNoteAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();

  const parsed = noteInput.safeParse({
    orderId: formData.get("orderId"),
    message: formData.get("message"),
  });
  if (!parsed.success) return { error: "Escribí algo antes de guardar." };

  const order = await prisma.order.findUnique({
    where: { id: parsed.data.orderId },
    select: { id: true },
  });
  if (!order) return { error: "El pedido ya no existe." };

  await recordOrderEvent(order.id, "note", parsed.data.message);
  revalidatePath(`/admin/pedidos/${order.id}`);
  return { ok: "Nota agregada." };
}

const metaInput = z.object({
  orderId: z.string().min(1).max(64),
  trackingCode: z.string().trim().max(80),
  dueDate: z.string().trim().max(10),
  adminNotes: z.string().trim().max(2000),
});

export async function updateOrderMetaAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();

  const parsed = metaInput.safeParse({
    orderId: formData.get("orderId"),
    trackingCode: formData.get("trackingCode") ?? "",
    dueDate: formData.get("dueDate") ?? "",
    adminNotes: formData.get("adminNotes") ?? "",
  });
  if (!parsed.success) return { error: "Revisá los datos: algún campo es muy largo." };

  const order = await prisma.order.findUnique({
    where: { id: parsed.data.orderId },
    select: { id: true, code: true, trackingCode: true },
  });
  if (!order) return { error: "El pedido ya no existe." };

  const dueDate = parsed.data.dueDate
    ? new Date(`${parsed.data.dueDate}T12:00:00`)
    : null;
  if (dueDate && Number.isNaN(dueDate.getTime())) {
    return { error: "La fecha de entrega no es válida." };
  }

  await prisma.order.update({
    where: { id: order.id },
    data: {
      trackingCode: parsed.data.trackingCode || null,
      dueDate,
      adminNotes: parsed.data.adminNotes || null,
    },
  });

  // El seguimiento sí lo ve el cliente, así que queda asentado.
  if (parsed.data.trackingCode && parsed.data.trackingCode !== order.trackingCode) {
    await recordOrderEvent(
      order.id,
      "shipping",
      `Código de seguimiento cargado: ${parsed.data.trackingCode}.`,
    );
  }

  revalidatePath(`/admin/pedidos/${order.id}`);
  revalidatePath("/admin/produccion");
  revalidatePath(`/pedido/${order.code}`);
  return { ok: "Guardado." };
}

/**
 * Borrar un pedido sólo se permite si nunca se cobró. Un pedido pagado es un
 * comprobante: se cancela, no se borra.
 */
export async function deleteOrderAction(formData: FormData): Promise<void> {
  await requireAdmin();

  const orderId = String(formData.get("orderId") ?? "");
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { id: true, status: true },
  });
  if (!order) return;

  if (!["draft", "failed", "cancelled"].includes(order.status)) {
    return;
  }

  await prisma.order.delete({ where: { id: order.id } });
  revalidatePath("/admin");
  revalidatePath("/admin/pedidos");
  redirect("/admin/pedidos");
}

// ---------------------------------------------------------------------------
// Ajustes
// ---------------------------------------------------------------------------

export async function saveSettingsAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();

  const parsed = settingsSchema.safeParse({
    shippingFlat: formData.get("shippingFlat"),
    freeShippingFrom: formData.get("freeShippingFrom"),
    orderEmail: formData.get("orderEmail"),
    whatsapp: formData.get("whatsapp") ?? "",
    pickupAddress: formData.get("pickupAddress") ?? "",
    leadTimeDays: formData.get("leadTimeDays"),
    storePaused: formData.get("storePaused") === "on",
    storeNotice: formData.get("storeNotice") ?? "",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Revisá los valores cargados." };
  }

  await saveSettings(parsed.data);

  // Los ajustes cambian el sitio público, no sólo el panel.
  revalidatePath("/", "layout");
  return { ok: "Ajustes guardados." };
}

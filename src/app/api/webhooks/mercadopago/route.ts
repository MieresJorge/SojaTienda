import { NextResponse } from "next/server";

import { prisma } from "@/server/db";
import {
  getPayment,
  mapPaymentStatus,
  verifyWebhookSignature,
} from "@/server/mercadopago";
import { markOrderStatus } from "@/server/orders";

export const runtime = "nodejs";

/**
 * Webhook de Mercado Pago (panel > Webhooks > URL de producción).
 *
 * Siempre respondemos 200 salvo que la firma no valide: si devolvemos error,
 * Mercado Pago reintenta y nos llena la cola. Los problemas propios se logean.
 */
export async function POST(request: Request) {
  const url = new URL(request.url);
  const dataId = url.searchParams.get("data.id") ?? url.searchParams.get("id");

  const valid = verifyWebhookSignature({
    signature: request.headers.get("x-signature"),
    requestId: request.headers.get("x-request-id"),
    dataId,
  });

  if (!valid) {
    console.warn("[mp-webhook] firma inválida");
    return NextResponse.json({ error: "Firma inválida" }, { status: 401 });
  }

  let body: { type?: string; action?: string; data?: { id?: string } } = {};
  try {
    body = await request.json();
  } catch {
    // Mercado Pago a veces notifica sólo por querystring.
  }

  const type = body.type ?? url.searchParams.get("type") ?? "";
  const paymentId = body.data?.id ?? dataId;

  if (!type.startsWith("payment") || !paymentId) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  try {
    const payment = await getPayment(String(paymentId));
    const orderId = payment.external_reference;
    if (!orderId) {
      console.warn("[mp-webhook] pago sin external_reference", paymentId);
      return NextResponse.json({ ok: true });
    }

    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) {
      console.warn("[mp-webhook] pedido inexistente", orderId);
      return NextResponse.json({ ok: true });
    }

    // Un pedido ya pago no vuelve atrás por una notificación duplicada.
    const nextStatus = mapPaymentStatus(payment.status);
    if (order.status === "paid" && nextStatus !== "cancelled") {
      return NextResponse.json({ ok: true, unchanged: true });
    }

    await markOrderStatus(order.id, nextStatus, {
      id: String(payment.id ?? paymentId),
      status: payment.status,
      raw: payment,
    });

    return NextResponse.json({ ok: true, status: nextStatus });
  } catch (error) {
    console.error("[mp-webhook]", error);
    return NextResponse.json({ ok: true, error: "procesado con error" });
  }
}

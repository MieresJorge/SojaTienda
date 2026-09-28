import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { MercadoPagoConfig, Payment, Preference } from "mercadopago";

/**
 * Integración con Checkout Pro.
 *
 * Si no hay MP_ACCESS_TOKEN la app funciona igual en "modo simulado": el
 * pedido se crea y se marca como pago para poder probar todo el circuito sin
 * credenciales. Nunca se activa si hay token configurado.
 */

export function paymentsEnabled(): boolean {
  return Boolean(process.env.MP_ACCESS_TOKEN);
}

export function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(
    /\/$/,
    "",
  );
}

/** Mercado Pago rechaza callbacks y webhooks que no sean https públicos. */
function isPublicHttps(): boolean {
  return siteUrl().startsWith("https://");
}

function client(): MercadoPagoConfig {
  const accessToken = process.env.MP_ACCESS_TOKEN;
  if (!accessToken) throw new Error("MP_ACCESS_TOKEN no está configurado.");
  return new MercadoPagoConfig({
    accessToken,
    options: { timeout: 10_000 },
  });
}

export interface PreferenceItem {
  id: string;
  title: string;
  description: string;
  quantity: number;
  unitPrice: number;
}

export interface PreferenceInput {
  orderId: string;
  orderCode: string;
  items: PreferenceItem[];
  payer: { name: string; email: string; phone?: string };
}

export async function createPreference(input: PreferenceInput): Promise<{
  preferenceId: string;
  redirectUrl: string;
}> {
  const preference = new Preference(client());
  const base = siteUrl();

  const result = await preference.create({
    body: {
      items: input.items.map((item) => ({
        id: item.id,
        title: item.title.slice(0, 250),
        description: item.description.slice(0, 250),
        quantity: item.quantity,
        unit_price: item.unitPrice,
        currency_id: "ARS",
      })),
      payer: {
        name: input.payer.name,
        email: input.payer.email,
        ...(input.payer.phone ? { phone: { number: input.payer.phone } } : {}),
      },
      back_urls: {
        success: `${base}/pedido/${input.orderCode}`,
        pending: `${base}/pedido/${input.orderCode}`,
        failure: `${base}/pedido/${input.orderCode}?estado=error`,
      },
      ...(isPublicHttps()
        ? {
            auto_return: "approved" as const,
            notification_url: `${base}/api/webhooks/mercadopago`,
          }
        : {}),
      external_reference: input.orderId,
      statement_descriptor: "SOJA",
      metadata: { order_code: input.orderCode },
    },
  });

  const redirectUrl = result.init_point ?? result.sandbox_init_point;
  if (!result.id || !redirectUrl) {
    throw new Error("Mercado Pago no devolvió un link de pago.");
  }

  return { preferenceId: result.id, redirectUrl };
}

export async function getPayment(paymentId: string) {
  const payment = new Payment(client());
  return payment.get({ id: paymentId });
}

/**
 * Valida la firma del webhook (panel de MP > Webhooks > Firma secreta).
 * Sin secreto configurado devolvemos true, pero en producción es obligatorio.
 */
export function verifyWebhookSignature(options: {
  signature: string | null;
  requestId: string | null;
  dataId: string | null;
}): boolean {
  const secret = process.env.MP_WEBHOOK_SECRET;
  if (!secret) return true;
  if (!options.signature || !options.dataId) return false;

  const parts = Object.fromEntries(
    options.signature.split(",").map((chunk) => {
      const [key, value] = chunk.split("=");
      return [key?.trim(), value?.trim()];
    }),
  ) as { ts?: string; v1?: string };

  if (!parts.ts || !parts.v1) return false;

  const manifest = `id:${options.dataId.toLowerCase()};${
    options.requestId ? `request-id:${options.requestId};` : ""
  }ts:${parts.ts};`;

  const expected = createHmac("sha256", secret).update(manifest).digest("hex");
  const received = parts.v1;
  if (expected.length !== received.length) return false;
  return timingSafeEqual(Buffer.from(expected), Buffer.from(received));
}

/** Traduce el estado de Mercado Pago al estado interno del pedido. */
export function mapPaymentStatus(status: string | undefined): string {
  switch (status) {
    case "approved":
      return "paid";
    case "in_process":
    case "pending":
    case "authorized":
      return "pending";
    case "rejected":
      return "failed";
    case "cancelled":
    case "refunded":
    case "charged_back":
      return "cancelled";
    default:
      return "pending";
  }
}

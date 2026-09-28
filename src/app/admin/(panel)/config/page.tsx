import type { Metadata } from "next";

import { logoutAction } from "@/app/admin/actions";
import { SettingsForm } from "@/components/admin/SettingsForm";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { AdminPageHeader, Card, DataRow, StatusPill } from "@/components/admin/ui";
import { paymentsEnabled, siteUrl } from "@/server/mercadopago";
import { getSettings } from "@/server/settings";

export const metadata: Metadata = { title: "Ajustes" };
export const dynamic = "force-dynamic";

/** Chequeos de entorno: qué está listo para producción y qué falta. */
function healthChecks() {
  const https = siteUrl().startsWith("https://");
  return [
    {
      label: "Mercado Pago",
      ok: paymentsEnabled(),
      okText: "Cobrando de verdad",
      failText: "Modo simulado: los pedidos se marcan pagados sin cobrar",
      hint: "MP_ACCESS_TOKEN",
    },
    {
      label: "Firma del webhook",
      ok: Boolean(process.env.MP_WEBHOOK_SECRET),
      okText: "Se valida la firma",
      failText: "Sin validar: cualquiera puede postear al webhook",
      hint: "MP_WEBHOOK_SECRET",
    },
    {
      label: "URL pública",
      ok: https,
      okText: siteUrl(),
      failText: `${siteUrl()} — Mercado Pago necesita https público`,
      hint: "NEXT_PUBLIC_SITE_URL",
    },
    {
      label: "Almacenamiento de arte",
      ok: process.env.STORAGE_DRIVER !== "s3",
      okText: "Disco local (public/uploads)",
      failText: "Driver s3 seleccionado pero sin implementar",
      hint: "STORAGE_DRIVER",
    },
    {
      label: "Contraseña del panel",
      ok: Boolean(process.env.ADMIN_PASSWORD_HASH),
      okText: "Guardada como hash",
      failText: "En texto plano en el .env: para producción usá ADMIN_PASSWORD_HASH",
      hint: "npm run admin:hash",
    },
  ];
}

export default async function AdminConfigPage() {
  const settings = await getSettings();
  const checks = healthChecks();

  return (
    <>
      <AdminPageHeader
        title="Ajustes"
        description="Lo que cambia seguido se edita acá. Lo que es código (precios, catálogo, siluetas) se edita en el repositorio."
      />

      <Card
        title="Operación"
        description="Estos valores se aplican al instante, tanto en la tienda como en el checkout."
        className="mb-6"
      >
        <SettingsForm settings={settings} />
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card
          title="Estado del entorno"
          description="Qué falta configurar antes de vender en serio."
        >
          <ul className="space-y-4">
            {checks.map((check) => (
              <li key={check.label}>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium">{check.label}</span>
                  <StatusPill
                    label={check.ok ? "Listo" : "Revisar"}
                    tone={check.ok ? "brote" : "alerta"}
                  />
                </div>
                <p className="mt-1 text-xs leading-relaxed text-ink-muted">
                  {check.ok ? check.okText : check.failText}
                  {" · "}
                  <code>{check.hint}</code>
                </p>
              </li>
            ))}
          </ul>
        </Card>

        <div className="space-y-6">
          <Card title="Cómo se calculan las cosas">
            <dl>
              <DataRow label="Precio">
                se recalcula en el servidor sobre el diseño guardado
              </DataRow>
              <DataRow label="Envío">
                {settings.freeShippingFrom > 0
                  ? `gratis desde ${settings.freeShippingFrom}`
                  : "siempre con cargo"}
              </DataRow>
              <DataRow label="Lista de precios">src/lib/pricing.ts</DataRow>
              <DataRow label="Catálogo">src/lib/catalog.ts</DataRow>
            </dl>
          </Card>

          <Card
            title="Sesión"
            description="La sesión dura 7 días. Si cambiás la contraseña en el .env se cierran todas."
          >
            <form action={logoutAction}>
              <SubmitButton variant="secondary" size="sm" pendingLabel="Saliendo…">
                Cerrar sesión
              </SubmitButton>
            </form>
          </Card>
        </div>
      </div>
    </>
  );
}

"use client";

import { useActionState } from "react";

import { saveSettingsAction, type ActionState } from "@/app/admin/actions";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { Field, inputClass } from "@/components/ui";
import type { Settings } from "@/server/settings";

export function SettingsForm({ settings }: { settings: Settings }) {
  const [state, formAction] = useActionState<ActionState, FormData>(
    saveSettingsAction,
    {},
  );

  return (
    <form action={formAction} className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Costo del envío" hint="en pesos">
          <input
            type="number"
            name="shippingFlat"
            min={0}
            defaultValue={settings.shippingFlat}
            className={inputClass}
          />
        </Field>

        <Field label="Envío gratis desde" hint="0 = nunca">
          <input
            type="number"
            name="freeShippingFrom"
            min={0}
            defaultValue={settings.freeShippingFrom}
            className={inputClass}
          />
        </Field>

        <Field label="Mail de pedidos">
          <input
            type="email"
            name="orderEmail"
            required
            defaultValue={settings.orderEmail}
            className={inputClass}
          />
        </Field>

        <Field label="WhatsApp de contacto">
          <input
            name="whatsapp"
            defaultValue={settings.whatsapp}
            placeholder="+54 9 11 ..."
            className={inputClass}
          />
        </Field>

        <Field label="Dirección del taller" hint="para los retiros">
          <input
            name="pickupAddress"
            defaultValue={settings.pickupAddress}
            className={inputClass}
          />
        </Field>

        <Field label="Días de producción" hint="hábiles, para la ficha de taller">
          <input
            type="number"
            name="leadTimeDays"
            min={1}
            max={120}
            defaultValue={settings.leadTimeDays}
            className={inputClass}
          />
        </Field>
      </div>

      <div className="space-y-4 rounded-card border border-line bg-paper-alt p-4">
        <label className="flex items-start gap-3 text-sm">
          <input
            type="checkbox"
            name="storePaused"
            defaultChecked={settings.storePaused}
            className="mt-1"
          />
          <span>
            <span className="font-semibold">Pausar las ventas</span>
            <span className="mt-0.5 block text-ink-muted">
              El diseñador sigue funcionando, pero el checkout rechaza los pedidos
              nuevos con el aviso de abajo. Los pedidos ya cobrados no se tocan.
            </span>
          </span>
        </label>

        <Field label="Aviso en la tienda" hint="vacío = sin aviso">
          <input
            name="storeNotice"
            maxLength={240}
            defaultValue={settings.storeNotice}
            placeholder="Cerramos por vacaciones hasta el 5 de enero."
            className={inputClass}
          />
        </Field>
      </div>

      <div className="flex items-center gap-3">
        <SubmitButton>Guardar ajustes</SubmitButton>
        {state.error && (
          <p role="alert" className="text-sm text-alerta">
            {state.error}
          </p>
        )}
        {state.ok && (
          <p role="status" className="text-sm text-brote-dark">
            {state.ok}
          </p>
        )}
      </div>
    </form>
  );
}

"use client";

import { useActionState } from "react";

import {
  addOrderNoteAction,
  updateOrderMetaAction,
  type ActionState,
} from "@/app/admin/actions";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { Field, inputClass } from "@/components/ui";

/** Mensajito de resultado compartido por los dos formularios. */
function Result({ state }: { state: ActionState }) {
  if (state.error) {
    return (
      <p role="alert" className="text-sm text-alerta">
        {state.error}
      </p>
    );
  }
  if (state.ok) {
    return (
      <p role="status" className="text-sm text-brote-dark">
        {state.ok}
      </p>
    );
  }
  return null;
}

export function OrderMetaForm({
  orderId,
  trackingCode,
  dueDate,
  adminNotes,
}: {
  orderId: string;
  trackingCode: string;
  /** Formato yyyy-mm-dd, que es lo que espera <input type="date">. */
  dueDate: string;
  adminNotes: string;
}) {
  const [state, formAction] = useActionState<ActionState, FormData>(
    updateOrderMetaAction,
    {},
  );

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="orderId" value={orderId} />

      <Field label="Fecha comprometida" hint="ordena la cola del taller">
        <input
          type="date"
          name="dueDate"
          defaultValue={dueDate}
          className={inputClass}
        />
      </Field>

      <Field label="Código de seguimiento" hint="lo ve el cliente">
        <input
          name="trackingCode"
          defaultValue={trackingCode}
          placeholder="Andreani / Correo Argentino"
          className={inputClass}
        />
      </Field>

      <Field label="Notas internas" hint="nunca se muestran al cliente">
        <textarea
          name="adminNotes"
          defaultValue={adminNotes}
          rows={4}
          className={`${inputClass} resize-y`}
          placeholder="Proveedor, observaciones del arte, acuerdos por teléfono…"
        />
      </Field>

      <div className="flex items-center gap-3">
        <SubmitButton size="sm">Guardar</SubmitButton>
        <Result state={state} />
      </div>
    </form>
  );
}

export function OrderNoteForm({ orderId }: { orderId: string }) {
  const [state, formAction] = useActionState<ActionState, FormData>(
    addOrderNoteAction,
    {},
  );

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="orderId" value={orderId} />
      <textarea
        name="message"
        rows={2}
        required
        maxLength={600}
        placeholder="Anotar algo en la bitácora del pedido…"
        className={`${inputClass} resize-y`}
      />
      <div className="flex items-center gap-3">
        <SubmitButton size="sm" variant="secondary" pendingLabel="Agregando…">
          Agregar a la bitácora
        </SubmitButton>
        <Result state={state} />
      </div>
    </form>
  );
}

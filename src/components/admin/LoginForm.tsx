"use client";

import { useActionState } from "react";

import { loginAction, type ActionState } from "@/app/admin/actions";
import { Button, Field, inputClass } from "@/components/ui";

export function LoginForm({ next }: { next: string }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    loginAction,
    {},
  );

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="next" value={next} />

      <Field label="Contraseña">
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          autoFocus
          required
          className={inputClass}
          placeholder="••••••••"
        />
      </Field>

      {state.error && (
        <p
          role="alert"
          className="rounded-lg bg-alerta/10 px-4 py-3 text-sm text-alerta"
        >
          {state.error}
        </p>
      )}

      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? "Entrando…" : "Entrar al panel"}
      </Button>
    </form>
  );
}

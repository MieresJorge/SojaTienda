"use client";

import { useFormStatus } from "react-dom";

import { Button, cx } from "@/components/ui";

type Variant = "primary" | "secondary" | "ghost" | "danger";

/**
 * Botón de envío que se deshabilita solo mientras corre la action.
 * `useFormStatus` lee el estado del <form> padre, así que este componente
 * tiene que vivir dentro del formulario, no envolverlo.
 */
export function SubmitButton({
  children,
  pendingLabel,
  variant = "primary",
  size = "md",
  className,
  name,
  value,
  confirm,
}: {
  children: React.ReactNode;
  pendingLabel?: string;
  variant?: Variant;
  size?: "sm" | "md" | "lg";
  className?: string;
  name?: string;
  value?: string;
  /** Si se pasa, pide confirmación antes de enviar. */
  confirm?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      name={name}
      value={value}
      variant={variant}
      size={size}
      disabled={pending}
      className={cx(className)}
      onClick={
        confirm
          ? (event) => {
              if (!window.confirm(confirm)) event.preventDefault();
            }
          : undefined
      }
    >
      {pending ? (pendingLabel ?? "Guardando…") : children}
    </Button>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button, Field, inputClass } from "@/components/ui";

export default function SeguimientoPage() {
  const router = useRouter();
  const [code, setCode] = useState("");

  return (
    <div className="mx-auto max-w-md px-4 py-20 sm:px-6">
      <h1 className="font-display text-4xl">Seguir mi pedido</h1>
      <p className="mt-3 text-ink-soft">
        Ingresá el código que te llegó por mail (empieza con SOJA-).
      </p>

      <form
        className="mt-8 space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          const clean = code.trim().toUpperCase();
          if (clean) router.push(`/pedido/${encodeURIComponent(clean)}`);
        }}
      >
        <Field label="Código de pedido">
          <input
            value={code}
            onChange={(event) => setCode(event.target.value)}
            placeholder="SOJA-7KF2QX"
            className={inputClass}
            autoComplete="off"
          />
        </Field>
        <Button type="submit" size="lg" className="w-full">
          Ver estado
        </Button>
      </form>
    </div>
  );
}

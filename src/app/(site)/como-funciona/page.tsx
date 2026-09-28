import type { Metadata } from "next";
import Link from "next/link";

import { PRINT_METHODS } from "@/lib/catalog";
import { SCREEN_SETUP_FREE_FROM, SCREEN_SETUP_PER_COLOR } from "@/lib/pricing";
import { money } from "@/lib/format";

export const metadata: Metadata = {
  title: "Cómo funciona",
  description:
    "Cómo se cotiza y se produce un pedido en SOJA: técnicas, tiempos, archivos y formas de pago.",
};

const FAQ = [
  {
    q: "¿Cuál es el mínimo de compra?",
    a: "Una sola prenda. En DTF conviene desde la primera; en serigrafía el precio se pone interesante a partir de 20 o 25, porque se reparte la preparación de pantallas.",
  },
  {
    q: "¿Qué archivo tengo que mandar?",
    a: "Lo ideal es un PNG con fondo transparente a 300 dpi del tamaño final de la estampa. Si tenés el vector (AI, EPS, PDF o SVG), escribinos después de la compra y lo usamos: siempre queda mejor.",
  },
  {
    q: "¿Cuánto tarda?",
    a: "De 5 a 8 días hábiles desde que aprobás el mockup. Con producción exprés, 48 horas hábiles.",
  },
  {
    q: "¿Puedo ver cómo queda antes de que lo impriman?",
    a: "Sí. Después del pago te mandamos el mockup final por mail. Nada entra a producción sin tu OK, y si algo no cierra lo corregimos sin cargo.",
  },
  {
    q: "¿Cómo pago?",
    a: "Con Mercado Pago: tarjeta de crédito o débito, dinero en cuenta o transferencia. El pago se hace al confirmar el pedido.",
  },
  {
    q: "¿Y si me equivoco de talle?",
    a: "Las prendas personalizadas no tienen cambio por arrepentimiento, así que revisá bien la tabla de talles. Si hubo un error nuestro, lo rehacemos.",
  },
];

export default function ComoFuncionaPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="font-display text-5xl">Cómo funciona</h1>
      <p className="mt-4 text-lg leading-relaxed text-ink-soft">
        Sin presupuestos por mail ni esperas: el precio está a la vista desde el
        primer click y se arma con las mismas variables que usamos en el taller.
      </p>

      <section className="mt-12">
        <h2 className="font-display text-3xl">Las dos técnicas</h2>
        <div className="mt-6 space-y-4">
          {Object.values(PRINT_METHODS).map((metodo) => (
            <article
              key={metodo.key}
              className="rounded-card border border-line bg-surface p-6"
            >
              <div className="flex flex-wrap items-baseline gap-3">
                <h3 className="text-lg font-semibold">{metodo.name}</h3>
                <span className="text-xs uppercase tracking-wider text-brote-dark">
                  {metodo.tagline}
                </span>
              </div>
              <p className="mt-3 leading-relaxed text-ink-soft">
                {metodo.description}
              </p>
              <p className="mt-2 text-sm text-ink-muted">{metodo.bestFor}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-12">
        <h2 className="font-display text-3xl">Cómo se arma el precio</h2>
        <ul className="mt-6 space-y-3 leading-relaxed text-ink-soft">
          <li>
            <strong className="text-ink">La prenda.</strong> Precio base según
            modelo y talle. Los talles 2XL y 3XL tienen un recargo fijo.
          </li>
          <li>
            <strong className="text-ink">La estampa.</strong> En serigrafía se
            cobra por color y por ubicación. En DTF, por centímetro cuadrado de
            arte.
          </li>
          <li>
            <strong className="text-ink">La preparación.</strong> Cada color de
            serigrafía necesita una pantalla: {money(SCREEN_SETUP_PER_COLOR)} por
            color y ubicación, una sola vez. A partir de{" "}
            {SCREEN_SETUP_FREE_FROM} prendas va bonificada.
          </li>
          <li>
            <strong className="text-ink">La cantidad.</strong> El precio por
            prenda baja por escalones: 6, 12, 24, 50, 100 y 250 unidades.
          </li>
        </ul>
      </section>

      <section className="mt-12">
        <h2 className="font-display text-3xl">Preguntas frecuentes</h2>
        <div className="mt-6 divide-y divide-line border-y border-line">
          {FAQ.map((item) => (
            <details key={item.q} className="group py-4">
              <summary className="cursor-pointer list-none font-medium marker:content-none">
                <span className="flex items-start justify-between gap-4">
                  {item.q}
                  <span className="mt-0.5 shrink-0 text-ink-muted transition-transform group-open:rotate-45">
                    +
                  </span>
                </span>
              </summary>
              <p className="mt-3 leading-relaxed text-ink-soft">{item.a}</p>
            </details>
          ))}
        </div>
      </section>

      <div className="mt-12 rounded-card bg-ink px-8 py-10 text-center text-paper">
        <h2 className="font-display text-3xl">¿Arrancamos?</h2>
        <p className="mx-auto mt-3 max-w-md text-paper/70">
          Probá el diseñador. No hace falta registrarse ni dejar datos para ver
          el precio.
        </p>
        <Link
          href="/disenar"
          className="mt-6 inline-flex rounded-full bg-brote px-7 py-3.5 font-semibold text-ink transition-colors hover:bg-paper"
        >
          Diseñar mi remera
        </Link>
      </div>
    </div>
  );
}

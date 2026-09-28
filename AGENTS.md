<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

<!-- SOJA -->

# Proyecto SOJA

Tienda + diseñador de remeras personalizadas. Leé `README.md` antes de tocar nada.

## Invariantes que no se rompen

- **El precio se calcula en el servidor.** `src/lib/pricing.ts` es puro y corre en los
  dos lados, pero lo que se cobra sale siempre de `src/server/quote.ts` sobre el
  `Design` guardado en la base. Nunca aceptes un importe que venga en el request.
- **`Design` es inmutable.** Cada alta al carrito crea una fila nueva; no se edita
  una existente.
- **El modelo del diseño es nuestro, no el JSON de Fabric** (`src/lib/design.ts`),
  y se valida con Zod en el borde.
- **1 cm real = 6,67 px del mockup.** Si cambiás la silueta en `garment-svg.ts`,
  recalibrá las áreas de `catalog.ts`.
- **El panel se autoriza dos veces.** `src/proxy.ts` sólo mira que exista la
  cookie (chequeo optimista para redirigir rápido). La autorización real es
  `requireAdmin()` de `src/server/admin-auth.ts`, y va en cada página, cada
  server action y cada route handler de `/admin`. Una server action es un
  endpoint POST: el proxy no la protege.
- **La lista de precios no se edita desde el panel.** Vive en `pricing.ts`
  porque el mismo motor corre en el navegador y en el servidor. En la tabla
  `Setting` sólo van valores operativos (envío, contacto, pausa de ventas).

## Detalles del entorno

- Prisma 7 genera el cliente en `src/generated/prisma` (ignorado por git): después de
  clonar o de tocar el esquema hay que correr `prisma generate`.
- Fabric toca `window` al importarse: todo lo que lo use va en un componente cliente
  cargado con `next/dynamic` y `ssr: false`.
- El lint incluye las reglas del React Compiler: evitá `setState` sincrónico dentro de
  un `useEffect` y no agregues `useMemo` manuales que el compilador no pueda preservar.

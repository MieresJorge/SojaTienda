# SOJA · Diseñador de remeras + tienda

Aplicación web para que el cliente final diseñe una remera online, vea el
precio actualizarse en vivo y la compre con Mercado Pago.

Está pensada como base de producción, no como demo: los precios se recalculan
siempre en el servidor, el diseño queda guardado de forma inmutable con cada
pedido, y el taller recibe los archivos de arte en alta resolución.

---

## Arranque rápido

```bash
npm install          # instala y corre `prisma generate`
cp .env.example .env # cargá DATABASE_URL (ver abajo)
npm run db:deploy    # aplica las migraciones
npm run dev          # http://localhost:3000
```

Hace falta un Postgres, también en desarrollo: es el mismo motor que en
producción para tener una sola línea de migraciones. Lo más rápido es una base
gratis en [Neon](https://neon.tech) y pegar su cadena de conexión en
`DATABASE_URL`. Si querés separar desarrollo de producción, creá una *branch*
en Neon y usá esa cadena en tu `.env`.

Sin credenciales de Mercado Pago la app corre en **modo simulado**: el pedido
se crea y se marca como pago para poder recorrer todo el circuito. En cuanto
cargás `MP_ACCESS_TOKEN`, el modo simulado se apaga solo.

Para entrar al panel del dueño: `http://localhost:3000/admin`, con la
contraseña de `ADMIN_PASSWORD`. Para mirar la base cruda: `npm run db:studio`.

---

## Cómo está armado

| Capa | Qué usa | Dónde |
| --- | --- | --- |
| Framework | Next.js 16 (App Router) + React 19 + TypeScript | `src/app` |
| Estilos | Tailwind CSS v4, tokens de marca en `@theme` | `src/app/globals.css` |
| Canvas | Fabric.js 6 | `src/components/designer` |
| Estado cliente | Zustand con persistencia en localStorage | `src/lib/*-store.ts` |
| Base de datos | Prisma 7 · Postgres (adapter `@prisma/adapter-pg`) | `prisma/schema.prisma` |
| Archivos | Disco local o bucket S3-compatible (R2, S3, B2) | `src/server/storage.ts` |
| Pagos | Mercado Pago Checkout Pro + webhook | `src/server/mercadopago.ts` |
| Validación | Zod en todo lo que entra por la red | `src/lib/design.ts`, `src/server/*` |

### Las tres reglas de oro

1. **El precio nunca viene del navegador.** El cliente ve una cotización en
   vivo calculada con `src/lib/pricing.ts`, pero `/api/checkout` vuelve a
   correr exactamente el mismo motor sobre el diseño guardado en la base. Si
   alguien manipula el front, el importe cobrado no cambia.
2. **El diseño es inmutable.** Cada "agregar al carrito" crea una fila nueva en
   `Design`. Un pedido siempre apunta al arte exacto que se compró, aunque
   después el cliente siga editando.
3. **El catálogo y los precios viven en dos archivos.** `src/lib/catalog.ts`
   (prendas, colores, talles, zonas de estampado) y `src/lib/pricing.ts`
   (escalones de cantidad, costo por color, preparación de pantallas). Para
   actualizar la lista de precios no hace falta tocar ninguna pantalla.

---

## El diseñador

`/disenar` es la pantalla principal. Estructura: rail de herramientas, panel
de la herramienta activa, escenario con la prenda y panel de cotización.

- **La prenda es un SVG dibujado**, no una foto (`src/lib/garment-svg.ts`). Por
  eso cualquiera de los 16 colores se ve al instante y no hay assets que
  mantener. Las zonas imprimibles están calibradas contra esa silueta:
  **1 cm real = 6,67 px del mockup**. Si cambiás la silueta, revisá las áreas
  en `catalog.ts`.
- **Cuatro ubicaciones**: frente, espalda y las dos mangas, cada una con su
  medida real en cm y su máximo de colores.
- **El modelo del diseño es propio**, no el JSON de Fabric (`src/lib/design.ts`).
  Eso permite validarlo con Zod y recalcular colores y cm² en el servidor sin
  correr un canvas en Node.
- **Texto curvo**: se implementa con el soporte de texto sobre path de Fabric
  (`arcPathFor` en `fabric-objects.ts`).

### Qué se guarda al agregar al carrito

| Archivo | Para qué | Resolución |
| --- | --- | --- |
| `/uploads/mockups/…png` | Vista previa en carrito, checkout y pedido | 1200×1400 |
| `/uploads/produccion/…png` | Arte solo, recortado, para el taller | ~300 dpi |
| `/uploads/arte/…` | El archivo original que subió el cliente | el que subió |

---

## Cómo se calcula el precio

```
precio por prenda = prenda(escalón) + Σ estampas(ubicación) + recargo de talle
total             = Σ (precio por prenda × cantidad) + preparación de pantallas
```

- **Escalones de cantidad**: 1, 6, 12, 24, 50, 100, 250 unidades.
- **Serigrafía**: se cobra el primer color y cada color adicional, por
  ubicación. La preparación de pantallas (`SCREEN_SETUP_PER_COLOR`) se cobra
  una sola vez por color y ubicación, y se bonifica desde 50 prendas.
- **DTF**: por cm² de arte, con un mínimo por estampa. Sin preparación.
- **Exprés**: recargo porcentual sobre prendas y estampa (`RUSH_SURCHARGE`).

Todos los números están arriba de `src/lib/pricing.ts`, en pesos. Cambiar la
lista de precios es editar esos arrays.

---

## Pagos

Flujo: `/checkout` → `POST /api/checkout` → se crea el pedido (`status: draft`)
→ se crea la preferencia de Mercado Pago (`pending`) → el cliente paga →
el webhook lo pasa a `paid`.

### Para cobrar de verdad

1. Sacá las credenciales en
   [mercadopago.com.ar/developers/panel/app](https://www.mercadopago.com.ar/developers/panel/app).
   Empezá con las de **TEST**.
2. Cargá `MP_ACCESS_TOKEN` y `NEXT_PUBLIC_MP_PUBLIC_KEY` en `.env`.
3. `NEXT_PUBLIC_SITE_URL` tiene que ser **https y público**: Mercado Pago no
   acepta `localhost` para `auto_return` ni para el webhook. Para probar en
   local usá un túnel (`ngrok http 3000`) y poné esa URL.
4. En el panel de Mercado Pago, configurá el webhook apuntando a
   `https://tu-dominio/api/webhooks/mercadopago` y copiá la **firma secreta**
   en `MP_WEBHOOK_SECRET`. Sin ese secreto la firma no se valida: **en
   producción es obligatorio**.

Red de seguridad: si el webhook no llegó (típico en desarrollo), la página
`/pedido/[code]` consulta el pago directamente contra la API cuando Mercado
Pago vuelve con `payment_id` en la URL.

### Estados del pedido

`draft` → `pending` → `paid` → `in_production` → `ready` → `shipped` →
`delivered`, con `failed` y `cancelled` como salidas. Un pedido en `paid` no
vuelve atrás por una notificación duplicada. Desde `paid` en adelante el
estado lo mueve el dueño a mano desde `/admin`, y cada cambio queda asentado
en la bitácora del pedido (`OrderEvent`).

---

## El panel del dueño

`/admin`, protegido por contraseña. El sitio público y el panel son dos
cáscaras separadas (`src/app/(site)` y `src/app/admin/(panel)`), así que el
panel no arrastra el header ni el footer de la tienda.

| Pantalla | Para qué |
| --- | --- |
| `/admin` | Tablero: facturado de hoy y del mes, ticket promedio, plata esperando pago, serie de 30 días, carga del taller, ranking de productos, colores y técnicas |
| `/admin/pedidos` | Listado con filtros por estado, texto y fechas, paginado, con exportación a CSV |
| `/admin/pedidos/[id]` | Ficha completa: arte, medidas por ubicación, desglose del precio congelado, datos del cliente, pago, cambio de estado y bitácora |
| `/admin/pedidos/[id]/taller` | Orden de trabajo para imprimir: talles, colores, tintas y medidas. Sin precios |
| `/admin/produccion` | Cola del taller ordenada por fecha de entrega, con el total de prendas por talle y color para comprar |
| `/admin/clientes` | Clientes agrupados por mail: cuánto gastaron, cuántas veces compraron |
| `/admin/disenos` | Galería de todos los diseños, incluidos los que nunca se compraron |
| `/admin/precios` | Cotizador de mostrador y lista de precios de referencia |
| `/admin/config` | Envío, contacto, días de producción, pausa de ventas y chequeos del entorno |

### Cómo se protege

La contraseña sale del entorno; no hay tabla de usuarios porque hay un solo
dueño.

```bash
# desarrollo
ADMIN_PASSWORD="loquesea"

# producción: guardá el hash, no la contraseña
npm run admin:hash -- "tu contraseña larga"
# pegás el ADMIN_PASSWORD_HASH que imprime y borrás ADMIN_PASSWORD
```

La sesión es una cookie httpOnly firmada con HMAC que dura 7 días. Si no
definís `ADMIN_SESSION_SECRET`, la firma se deriva de la contraseña: cambiarla
cierra todas las sesiones abiertas.

**La verificación pasa dos veces, a propósito.** `src/proxy.ts` (en Next 16 el
`middleware` se llama así) sólo mira que la cookie exista, para redirigir
rápido sin tocar la base. La autorización real la hace `requireAdmin()` de
`src/server/admin-auth.ts`, que corre en cada página, en cada server action y
en cada route handler del panel. Una server action es un endpoint POST como
cualquier otro: el proxy no la protege.

### Qué se edita desde el panel y qué no

Desde `/admin/config` se editan los valores operativos (costo de envío, umbral
de envío gratis, contacto, días de producción, pausa de ventas y el aviso que
aparece arriba de la tienda). Se guardan en la tabla `Setting` y pisan a los
valores del `.env`, que quedan como default.

**La lista de precios no se edita desde el panel.** Sigue en
`src/lib/pricing.ts` porque es código versionado y el mismo motor tiene que
correr en el navegador y en el servidor. `/admin/precios` la muestra y la
simula, pero no la escribe.

> El aviso de la tienda se renderiza en páginas estáticas. Guardarlo desde el
> panel dispara `revalidatePath("/", "layout")` y se actualiza solo; si tocás
> la tabla `Setting` a mano, la home no cambia hasta el próximo build.

---

## Deploy en Render

Hay un `render.yaml` listo: en Render, **New → Blueprint**, elegís este repo y
te crea el servicio con los comandos ya puestos. Si preferís hacerlo a mano:

| Campo | Valor |
| --- | --- |
| Runtime | Node (`NODE_VERSION=22`) |
| Build Command | `npm ci && npx prisma migrate deploy && npm run build` |
| Start Command | `npm run start` |
| Health Check Path | `/` |

Las migraciones van en el build porque el plan gratuito no tiene
*Pre-Deploy Command*. En un plan pago, movelas ahí.

### Los dos servicios de afuera

El filesystem de Render es efímero: se borra en cada deploy **y cada vez que el
plan gratuito despierta el servicio**. Por eso nada persistente vive en el
contenedor.

1. **Postgres en [Neon](https://neon.tech)** (gratis, sin vencimiento). Copiá la
   cadena *pooled* a `DATABASE_URL`.
2. **Bucket en [Cloudflare R2](https://developers.cloudflare.com/r2/)** (gratis
   hasta 10 GB, sin cargo por egreso). Creá el bucket, habilitale el acceso
   público (dominio `r2.dev` o uno propio) y un token de API con permiso de
   escritura. Después:

   ```
   STORAGE_DRIVER=s3
   S3_BUCKET=soja
   S3_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
   S3_ACCESS_KEY_ID=...
   S3_SECRET_ACCESS_KEY=...
   S3_PUBLIC_URL=https://pub-xxxxx.r2.dev
   S3_REGION=auto
   ```

No hace falta configurarle CORS al bucket: el `rewrite` de `/uploads/:path*`
declarado en `next.config.ts` lo proxea desde nuestro dominio. **Eso es a
propósito**, no por comodidad: el diseñador carga las imágenes con
`crossOrigin: "anonymous"` y después exporta el mockup con `toDataURL()`. Si
las imágenes vinieran de otro host, el canvas quedaría *tainted* y la
exportación del mockup rompería. Además, el modelo del diseño sólo acepta
imágenes de nuestro origen, así que en la base nunca se guarda un host externo.

Ese rewrite corre **después** de revisar el filesystem, así que en desarrollo,
con `STORAGE_DRIVER=local`, los archivos de `public/uploads` siguen ganando.

### El orden importa

`NEXT_PUBLIC_SITE_URL` y `NEXT_PUBLIC_MP_PUBLIC_KEY` se hornean en el build, no
se leen en runtime, y el dominio no lo sabés hasta el primer deploy. La
secuencia es:

1. Deployá con las variables que ya tengas.
2. Copiá la URL que te dio Render a `NEXT_PUBLIC_SITE_URL` (sin barra final).
3. **Redeployá** — reiniciar no alcanza.
4. Recién ahí configurá el webhook de Mercado Pago apuntando a
   `https://tu-servicio.onrender.com/api/webhooks/mercadopago`.

### Para una demo, dejá Mercado Pago sin configurar

Sin `MP_ACCESS_TOKEN` la app corre en **modo simulado**: crea el pedido y lo
marca como pagado sin cobrar nada. Se puede recorrer todo el circuito —
diseñar, carrito, checkout, ficha del pedido, panel — sin cuenta de Mercado
Pago y sin riesgo de cobrarle a nadie. En cuanto cargás el token, el modo
simulado se apaga solo.

---

## Pasar a producción

Lo que hay que cambiar antes de publicar, en orden de importancia:

1. **Mails.** Hoy no se manda ninguno. Faltan: confirmación de pedido al
   cliente, aviso al taller y el mockup para aprobar. Enganchar Resend o
   similar en `src/app/api/checkout/route.ts` y en el webhook.
2. **Contraseña del panel como hash.** En producción cargá
   `ADMIN_PASSWORD_HASH` (ver `npm run admin:hash`) y sacá `ADMIN_PASSWORD`.
   El límite de intentos de login es en memoria: detrás de más de una
   instancia hay que moverlo a Redis.
3. **Rate limiting en `/api/upload`.** Está validado por tipo y tamaño (PNG,
   JPG, WEBP, hasta 15 MB) pero cualquiera puede subir sin límite de veces.
4. **SVG del cliente.** Hoy se rechazan a propósito: un SVG servido desde el
   mismo dominio puede ejecutar scripts. Si querés aceptarlos, sanitizalos o
   servilos desde otro dominio.

---

## Mapa del código

```
render.yaml                      Blueprint de deploy en Render
.nvmrc                           Versión de Node
src/
  proxy.ts                       Corta el paso a /admin (antes: middleware.ts)
  app/
    (site)/                      La tienda pública (header + footer)
      page.tsx                   Home
      disenar/                   El diseñador
      carrito/ checkout/         Carrito y datos del comprador
      pedido/[code]/             Estado del pedido
      productos/ como-funciona/  Contenido
    admin/
      login/                     Única ruta de /admin sin sesión
      (panel)/                   El panel del dueño
      exportar/                  Pedidos filtrados en CSV
      actions.ts                 Server actions del panel
    api/
      upload/                    Sube el arte del cliente
      designs/                   Guarda el diseño + cotiza (servidor)
      quote/                     Totales autoritativos del carrito
      checkout/                  Crea el pedido + preferencia de pago
      webhooks/mercadopago/      Confirma el pago
  components/
    designer/                    Canvas, paneles, cotizador, render de mockups
    admin/                       Kit del panel, gráfico, formularios, cotizador
    ui.tsx                       Botones, campos, badges
  lib/
    catalog.ts                   Prendas, colores, talles, zonas
    pricing.ts                   Motor de cotización (puro, cliente + servidor)
    design.ts                    Modelo del diseño + cálculo de colores y cm²
    garment-svg.ts               Silueta de la prenda
    clipart.ts fonts.ts          Galería y tipografías
    *-store.ts                   Estado del diseñador y del carrito
  server/                        Sólo servidor: db, storage, pagos, pedidos
    admin-auth.ts                Sesión del dueño (cookie firmada)
    admin.ts                     Consultas del panel
    settings.ts                  Ajustes editables (tabla Setting)
```

## Scripts

| Comando | Qué hace |
| --- | --- |
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | `prisma generate` + build de producción |
| `npm run typecheck` | TypeScript sin emitir |
| `npm run lint` | ESLint (incluye las reglas del React Compiler) |
| `npm run db:migrate` | Migración en desarrollo |
| `npm run db:deploy` | Aplica migraciones en producción |
| `npm run db:studio` | Explorador de la base |
| `npm run admin:hash -- "clave"` | Genera el `ADMIN_PASSWORD_HASH` del panel |

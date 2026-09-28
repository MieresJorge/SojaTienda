import type { Metadata } from "next";

import { GOOGLE_FONTS_HREF } from "@/lib/fonts";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "SOJA · Remeras personalizadas con precio al instante",
    template: "%s · SOJA",
  },
  description:
    "Diseñá tu remera online, mirá el precio en vivo y comprá con Mercado Pago. Serigrafía y DTF hechos en Argentina.",
};

/**
 * Shell mínimo: sólo html/body y las fuentes.
 *
 * La cáscara visible vive en cada grupo de rutas: `(site)` arma el header y el
 * footer de la tienda, y `admin/(panel)` arma el panel del dueño. Así el panel
 * no arrastra la navegación pública ni al revés.
 */
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es-AR">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="stylesheet" href={GOOGLE_FONTS_HREF} />
      </head>
      <body>{children}</body>
    </html>
  );
}

import type { NextConfig } from "next";

/** Base pública del bucket, sin barra final. Vacío = no hay bucket. */
function bucketBase(): string {
  return (process.env.S3_PUBLIC_URL ?? "").trim().replace(/\/$/, "");
}

const nextConfig: NextConfig = {
  async rewrites() {
    const base = bucketBase();
    if (!base) return [];

    /**
     * Sirve el arte y los mockups desde el bucket, pero manteniendo las URLs
     * `/uploads/...` de nuestro propio dominio. Es un proxy y no un redirect
     * a propósito, por dos razones:
     *
     * 1. El diseñador carga las imágenes con `crossOrigin: "anonymous"` y
     *    después exporta el mockup con `toDataURL()`. Si la imagen viniera de
     *    otro dominio habría que configurarle CORS al bucket, y si faltara, el
     *    canvas quedaría "tainted" y la exportación del mockup rompería.
     * 2. El modelo del diseño (src/lib/design.ts) sólo acepta imágenes de
     *    nuestro origen, así que en la base nunca se guarda un host externo.
     *
     * Devolver un array (y no {beforeFiles, afterFiles}) hace que esto corra
     * DESPUÉS de revisar el filesystem: en desarrollo, con STORAGE_DRIVER=local,
     * los archivos de public/uploads siguen ganando.
     */
    return [{ source: "/uploads/:path*", destination: `${base}/:path*` }];
  },
};

export default nextConfig;

import "server-only";

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "@/generated/prisma/client";

/**
 * Cliente Prisma único por proceso.
 *
 * En dev Next recarga los módulos en caliente, así que lo cacheamos en
 * globalThis para no abrir un pool nuevo en cada hot reload.
 *
 * Postgres en los dos lados (local y producción) para tener una sola línea de
 * migraciones. En desarrollo alcanza una base gratis de Neon; si querés
 * aislarla de la de producción, usá una branch de Neon y cambiá el
 * `DATABASE_URL`.
 */
function connectionString(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "Falta DATABASE_URL. Copiá la cadena de conexión de Postgres al .env (ver .env.example).",
    );
  }
  return url;
}

function createClient(): PrismaClient {
  const adapter = new PrismaPg({
    connectionString: connectionString(),
    // Los planes gratuitos cortan las conexiones ociosas; un pool chico y con
    // recambio evita quedarse con sockets muertos entre despertares.
    max: Number(process.env.DATABASE_POOL_MAX ?? 5),
    idleTimeoutMillis: 20_000,
    connectionTimeoutMillis: 15_000,
  });

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

const globalForPrisma = globalThis as unknown as { sojaPrisma?: PrismaClient };

export const prisma: PrismaClient = globalForPrisma.sojaPrisma ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.sojaPrisma = prisma;
}

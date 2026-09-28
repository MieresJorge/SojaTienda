import "server-only";

import path from "node:path";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

import { PrismaClient } from "@/generated/prisma/client";

/**
 * Cliente Prisma único por proceso.
 *
 * En dev Next recarga los módulos en caliente, así que lo cacheamos en
 * globalThis para no abrir una conexión nueva en cada hot reload.
 *
 * Para pasar a Postgres: reemplazar `PrismaBetterSqlite3` por
 * `@prisma/adapter-pg` (`new PrismaPg({ connectionString: url })`) y cambiar el
 * provider en prisma/schema.prisma. El resto del código no cambia.
 */
function resolveSqliteUrl(): string {
  const raw = process.env.DATABASE_URL ?? "file:./prisma/dev.db";
  if (!raw.startsWith("file:")) return raw;
  const relative = raw.slice("file:".length);
  if (path.isAbsolute(relative)) return `file:${relative}`;
  // turbopackIgnore evita que el bundler trace todo el proyecto por esta línea.
  return `file:${path.resolve(/* turbopackIgnore: true */ process.cwd(), relative)}`;
}

function createClient(): PrismaClient {
  const adapter = new PrismaBetterSqlite3({ url: resolveSqliteUrl() });
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

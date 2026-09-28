import "server-only";

import {
  createHmac,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

/**
 * Sesión del dueño para /admin.
 *
 * Deliberadamente sin dependencias ni tabla de sesiones: una cookie httpOnly
 * firmada con HMAC alcanza para un panel de un solo usuario. Lo importante es
 * dónde se verifica, no cómo: `src/proxy.ts` sólo mira que la cookie exista
 * (chequeo optimista para redirigir rápido) y la verificación de verdad la
 * hace `requireAdmin()`, que corre en cada página y en cada server action.
 * Nunca confíes sólo en el proxy.
 *
 * Contraseña: `ADMIN_PASSWORD_HASH` (scrypt, recomendado en producción) o
 * `ADMIN_PASSWORD` en texto plano para desarrollo. Generá el hash con
 * `npm run admin:hash`.
 */

export const ADMIN_COOKIE = "soja_admin";

/** Duración de la sesión. Vencida, se vuelve a pedir la contraseña. */
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

export interface AdminSession {
  issuedAt: number;
  expiresAt: number;
}

/** ¿Hay contraseña configurada? Sin esto el panel no se puede abrir. */
export function adminConfigured(): boolean {
  return Boolean(process.env.ADMIN_PASSWORD_HASH || process.env.ADMIN_PASSWORD);
}

/**
 * Secreto de firma. Si no hay uno explícito lo derivamos de la contraseña:
 * así, cambiar la contraseña invalida todas las sesiones abiertas.
 */
function signingSecret(): string {
  const explicit = process.env.ADMIN_SESSION_SECRET;
  if (explicit && explicit.length >= 16) return explicit;
  // `||` y no `??`: en el .env estas variables suelen quedar como "" y una
  // cadena vacía tiene que contar como "no configurada".
  const password = process.env.ADMIN_PASSWORD_HASH || process.env.ADMIN_PASSWORD || "";
  if (!password) throw new Error("El panel de administración no está configurado.");
  return `soja:${password}`;
}

function base64url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function fromBase64url(value: string): Buffer {
  return Buffer.from(value.replace(/-/g, "+").replace(/_/g, "/"), "base64");
}

function sign(payload: string): string {
  return base64url(createHmac("sha256", signingSecret()).update(payload).digest());
}

/** Comparación en tiempo constante, tolerante a longitudes distintas. */
function safeEqual(a: string, b: string): boolean {
  const bufferA = Buffer.from(a);
  const bufferB = Buffer.from(b);
  if (bufferA.length !== bufferB.length) return false;
  return timingSafeEqual(bufferA, bufferB);
}

// ---------------------------------------------------------------------------
// Contraseña
// ---------------------------------------------------------------------------

/** Formato guardado: `scrypt:<saltHex>:<claveHex>`. */
export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const key = scryptSync(password.normalize("NFKC"), salt, 64);
  return `scrypt:${salt.toString("hex")}:${key.toString("hex")}`;
}

export function verifyPassword(password: string): boolean {
  const candidate = password.normalize("NFKC");
  const stored = process.env.ADMIN_PASSWORD_HASH;

  if (stored) {
    const [scheme, saltHex, keyHex] = stored.split(":");
    if (scheme !== "scrypt" || !saltHex || !keyHex) return false;
    const derived = scryptSync(candidate, Buffer.from(saltHex, "hex"), 64);
    return safeEqual(derived.toString("hex"), keyHex);
  }

  const plain = process.env.ADMIN_PASSWORD;
  if (!plain) return false;
  return safeEqual(candidate, plain.normalize("NFKC"));
}

// ---------------------------------------------------------------------------
// Límite de intentos
// ---------------------------------------------------------------------------

const ATTEMPT_WINDOW_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 8;

/** En memoria: alcanza para una sola instancia. Detrás de varias, usá Redis. */
const attempts = new Map<string, { count: number; firstAt: number }>();

export async function clientKey(): Promise<string> {
  const headerList = await headers();
  const forwarded = headerList.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || headerList.get("x-real-ip") || "local";
}

export function attemptsLeft(key: string): number {
  const entry = attempts.get(key);
  if (!entry || Date.now() - entry.firstAt > ATTEMPT_WINDOW_MS) return MAX_ATTEMPTS;
  return Math.max(0, MAX_ATTEMPTS - entry.count);
}

export function registerFailedAttempt(key: string): number {
  const entry = attempts.get(key);
  if (!entry || Date.now() - entry.firstAt > ATTEMPT_WINDOW_MS) {
    attempts.set(key, { count: 1, firstAt: Date.now() });
    return MAX_ATTEMPTS - 1;
  }
  entry.count += 1;
  return Math.max(0, MAX_ATTEMPTS - entry.count);
}

export function clearAttempts(key: string): void {
  attempts.delete(key);
}

// ---------------------------------------------------------------------------
// Sesión
// ---------------------------------------------------------------------------

function createToken(): string {
  const issuedAt = Math.floor(Date.now() / 1000);
  const payload = base64url(
    JSON.stringify({ iat: issuedAt, exp: issuedAt + SESSION_TTL_SECONDS }),
  );
  return `${payload}.${sign(payload)}`;
}

export function readToken(token: string | undefined): AdminSession | null {
  if (!token) return null;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;
  if (!safeEqual(signature, sign(payload))) return null;

  try {
    const data = JSON.parse(fromBase64url(payload).toString("utf8")) as {
      iat?: number;
      exp?: number;
    };
    if (typeof data.exp !== "number" || data.exp * 1000 < Date.now()) return null;
    return { issuedAt: (data.iat ?? 0) * 1000, expiresAt: data.exp * 1000 };
  } catch {
    return null;
  }
}

/** Sólo se puede llamar desde una server action o un route handler. */
export async function startSession(): Promise<void> {
  const store = await cookies();
  store.set(ADMIN_COOKIE, createToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function endSession(): Promise<void> {
  const store = await cookies();
  store.delete(ADMIN_COOKIE);
}

/**
 * Sesión actual, memoizada por render: varias páginas y componentes la piden
 * en el mismo pasada y no queremos revalidar la firma cada vez.
 */
export const getAdminSession = cache(async (): Promise<AdminSession | null> => {
  if (!adminConfigured()) return null;
  const store = await cookies();
  return readToken(store.get(ADMIN_COOKIE)?.value);
});

/**
 * Puerta de entrada de TODO el panel: páginas, server actions y route
 * handlers. Si no hay sesión válida, corta acá.
 */
export async function requireAdmin(): Promise<AdminSession> {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  return session;
}

import "server-only";

import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

/**
 * Adapter de almacenamiento para el arte que sube el cliente y los mockups
 * que renderiza el diseñador.
 *
 * `local` escribe en public/uploads y sirve los archivos como estáticos.
 * Sirve para desarrollo y para un VPS con disco persistente.
 *
 * `s3` sube a cualquier storage compatible con S3 (Cloudflare R2, AWS S3,
 * Backblaze B2, MinIO). Es el que hay que usar en Render, Vercel y cualquier
 * plataforma donde el filesystem sea efímero.
 *
 * Los dos drivers devuelven la URL con la MISMA forma, `/uploads/<key>`, y eso
 * no es casualidad: el modelo del diseño (src/lib/design.ts) sólo acepta
 * imágenes de nuestro propio origen, así que el documento guardado nunca
 * contiene un host externo. En producción, un rewrite de `/uploads/:path*`
 * declarado en next.config.ts manda esas rutas al bucket público.
 */

export interface StoredFile {
  key: string;
  url: string;
  bytes: number;
  contentType: string;
}

export interface StorageDriver {
  put(
    data: Buffer,
    options: { folder: string; extension: string; contentType: string },
  ): Promise<StoredFile>;
}

const MAX_BYTES = 15 * 1024 * 1024;

export const ALLOWED_UPLOAD_TYPES: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

const localDriver: StorageDriver = {
  async put(data, { folder, extension, contentType }) {
    const now = new Date();
    const bucket = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const key = `${folder}/${bucket}/${randomUUID()}.${extension}`;
    const absolute = path.join(process.cwd(), "public", "uploads", key);
    await fs.mkdir(path.dirname(absolute), { recursive: true });
    await fs.writeFile(absolute, data);
    return {
      key,
      url: `/uploads/${key}`,
      bytes: data.byteLength,
      contentType,
    };
  },
};

/**
 * Config del bucket. Se lee en cada llamada y no al importar el módulo, así
 * `next build` no falla en una plataforma que todavía no tiene las variables.
 */
function s3Config() {
  const bucket = process.env.S3_BUCKET;
  const endpoint = process.env.S3_ENDPOINT;
  const accessKeyId = process.env.S3_ACCESS_KEY_ID;
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;

  const missing = [
    !bucket && "S3_BUCKET",
    !endpoint && "S3_ENDPOINT",
    !accessKeyId && "S3_ACCESS_KEY_ID",
    !secretAccessKey && "S3_SECRET_ACCESS_KEY",
  ].filter(Boolean);

  if (missing.length > 0) {
    throw new StorageError(
      `STORAGE_DRIVER=s3 pero faltan variables de entorno: ${missing.join(", ")}.`,
    );
  }

  return {
    bucket: bucket as string,
    endpoint: endpoint as string,
    accessKeyId: accessKeyId as string,
    secretAccessKey: secretAccessKey as string,
    // R2 ignora la región pero el SDK exige una.
    region: process.env.S3_REGION || "auto",
  };
}

let cachedClient: S3Client | null = null;

function s3Client(): S3Client {
  if (cachedClient) return cachedClient;
  const config = s3Config();

  cachedClient = new S3Client({
    region: config.region,
    endpoint: config.endpoint,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
    // R2 y MinIO esperan el bucket en el path, no como subdominio.
    forcePathStyle: true,
    // El SDK manda un checksum CRC32 por defecto que varios backends
    // compatibles rechazan. Sólo lo mandamos cuando la operación lo exige.
    requestChecksumCalculation: "WHEN_REQUIRED",
  });

  return cachedClient;
}

const s3Driver: StorageDriver = {
  async put(data, { folder, extension, contentType }) {
    const config = s3Config();
    const now = new Date();
    const bucket = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const key = `${folder}/${bucket}/${randomUUID()}.${extension}`;

    try {
      await s3Client().send(
        new PutObjectCommand({
          Bucket: config.bucket,
          Key: key,
          Body: data,
          ContentType: contentType,
          // Los nombres llevan un uuid, así que el contenido es inmutable.
          CacheControl: "public, max-age=31536000, immutable",
        }),
      );
    } catch (error) {
      console.error("[storage] falló la subida a S3", error);
      throw new StorageError(
        "No pudimos guardar el archivo en el storage. Probá de nuevo en un momento.",
      );
    }

    return {
      key,
      // Misma forma que el driver local: el rewrite de /uploads lo resuelve.
      url: `/uploads/${key}`,
      bytes: data.byteLength,
      contentType,
    };
  },
};

function driver(): StorageDriver {
  return process.env.STORAGE_DRIVER === "s3" ? s3Driver : localDriver;
}

export class StorageError extends Error {}

/** Guarda un archivo subido por el cliente (arte original). */
export async function putUpload(file: File): Promise<StoredFile> {
  const extension = ALLOWED_UPLOAD_TYPES[file.type];
  if (!extension) {
    throw new StorageError(
      "Formato no soportado. Subí PNG, JPG o WEBP (PNG con fondo transparente y 300 dpi es lo ideal).",
    );
  }
  if (file.size > MAX_BYTES) {
    throw new StorageError("El archivo supera los 15 MB.");
  }
  const buffer = Buffer.from(await file.arrayBuffer());
  return driver().put(buffer, { folder: "arte", extension, contentType: file.type });
}

const DATA_URL_RE = /^data:(image\/(png|jpeg|webp));base64,([A-Za-z0-9+/=\s]+)$/;

/** Guarda un PNG generado por el navegador (mockups y archivos de producción). */
export async function putDataUrl(dataUrl: string, folder: string): Promise<StoredFile> {
  const match = DATA_URL_RE.exec(dataUrl.trim());
  if (!match) {
    throw new StorageError("Data URL inválida.");
  }
  const [, contentType, subtype, base64] = match;
  const buffer = Buffer.from(base64, "base64");
  if (buffer.byteLength > MAX_BYTES) {
    throw new StorageError("La imagen generada supera los 15 MB.");
  }
  return driver().put(buffer, {
    folder,
    extension: subtype === "jpeg" ? "jpg" : subtype,
    contentType,
  });
}

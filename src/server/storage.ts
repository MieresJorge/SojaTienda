import "server-only";

import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

/**
 * Adapter de almacenamiento para el arte que sube el cliente y los mockups
 * que renderiza el diseñador.
 *
 * `local` escribe en public/uploads y sirve los archivos como estáticos. Sirve
 * para desarrollo y para un VPS con disco persistente. En Vercel el
 * filesystem es efímero: ahí hay que implementar el driver `s3` (o Cloudinary
 * / UploadThing / Vercel Blob) respetando la misma interfaz `StorageDriver`.
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

const s3Driver: StorageDriver = {
  async put() {
    throw new Error(
      "STORAGE_DRIVER=s3 todavía no está implementado. Completá este adapter con @aws-sdk/client-s3 (o Vercel Blob) antes de desplegar.",
    );
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

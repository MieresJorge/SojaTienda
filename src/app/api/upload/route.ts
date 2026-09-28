import { NextResponse } from "next/server";

import { putUpload, StorageError } from "@/server/storage";

export const runtime = "nodejs";

/** Subida del arte del cliente. Devuelve la URL con la que trabaja el canvas. */
export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const file = form.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No llegó ningún archivo." }, { status: 400 });
    }

    const stored = await putUpload(file);
    return NextResponse.json({ url: stored.url, bytes: stored.bytes });
  } catch (error) {
    if (error instanceof StorageError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("[upload]", error);
    return NextResponse.json(
      { error: "No pudimos procesar el archivo. Probá de nuevo." },
      { status: 500 },
    );
  }
}

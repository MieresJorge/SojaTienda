import { getSettings } from "@/server/settings";

/**
 * Aviso que el dueño escribe desde /admin/config (vacaciones, demoras,
 * promociones). Si no hay texto cargado no renderiza nada.
 *
 * Vive en páginas estáticas, así que el texto se hornea en el build. Guardar
 * los ajustes dispara `revalidatePath("/", "layout")` y se actualiza solo; si
 * tocás la tabla `Setting` a mano, la home no cambia hasta el próximo build.
 */
export async function StoreNotice() {
  const settings = await getSettings();
  if (!settings.storeNotice) return null;

  return (
    <p className="border-b border-line bg-brote-soft px-4 py-2.5 text-center text-sm text-brote-dark sm:px-6">
      {settings.storeNotice}
    </p>
  );
}

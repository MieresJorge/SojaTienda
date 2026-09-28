import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { StoreNotice } from "@/components/StoreNotice";

/** Cáscara de la tienda pública. El panel del dueño usa la suya. */
export default function SiteLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <StoreNotice />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}

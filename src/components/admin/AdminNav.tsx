"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cx } from "@/components/ui";

const LINKS = [
  { href: "/admin", label: "Tablero", icon: "M3 12h4l3 7 4-16 3 9h4" },
  {
    href: "/admin/pedidos",
    label: "Pedidos",
    icon: "M4 4h11l5 5v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Zm4 8h8M8 16h5",
  },
  {
    href: "/admin/produccion",
    label: "Taller",
    icon: "M3 20V9l6 4V9l6 4V8l6 4v8H3Z",
  },
  {
    href: "/admin/disenos",
    label: "Diseños",
    icon: "M12 3l9 5-9 5-9-5 9-5Zm9 9-9 5-9-5m18 4-9 5-9-5",
  },
  {
    href: "/admin/clientes",
    label: "Clientes",
    icon: "M16 19v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1M9.5 7a3 3 0 1 1 0 6 3 3 0 0 1 0-6Zm11 12v-1a4 4 0 0 0-3-3.9M16 7.1a3 3 0 0 1 0 5.8",
  },
  {
    href: "/admin/precios",
    label: "Precios",
    icon: "M12 2v20M17 6.5C17 4.6 14.8 3.5 12 3.5S7 4.6 7 6.5s2 2.7 5 3.5 5 1.6 5 3.5-2.2 3-5 3-5-1.1-5-3",
  },
  {
    href: "/admin/config",
    label: "Ajustes",
    icon: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm8.4-3a8.4 8.4 0 0 0-.1-1.2l2-1.5-2-3.4-2.3 1a8.3 8.3 0 0 0-2-1.2l-.3-2.5h-4l-.3 2.5c-.7.3-1.4.7-2 1.2l-2.3-1-2 3.4 2 1.5a8.4 8.4 0 0 0 0 2.4l-2 1.5 2 3.4 2.3-1c.6.5 1.3.9 2 1.2l.3 2.5h4l.3-2.5c.7-.3 1.4-.7 2-1.2l2.3 1 2-3.4-2-1.5c.1-.4.1-.8.1-1.2Z",
  },
];

/** `/admin` sólo se marca activo en la raíz; el resto, también en sus hijos. */
function isActive(pathname: string, href: string): boolean {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1 overflow-x-auto md:flex-col md:overflow-visible">
      {LINKS.map((link) => {
        const active = isActive(pathname, link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={cx(
              "flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-paper text-ink"
                : "text-paper-alt/75 hover:bg-white/10 hover:text-paper",
            )}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4 shrink-0"
              aria-hidden
            >
              <path d={link.icon} />
            </svg>
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}

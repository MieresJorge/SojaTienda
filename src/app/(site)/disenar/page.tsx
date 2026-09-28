import type { Metadata } from "next";

import { DesignerShell } from "@/components/designer/DesignerShell";

export const metadata: Metadata = {
  title: "Diseñá tu remera",
  description:
    "Subí tu logo, escribí lo que quieras y mirá el precio actualizarse en vivo mientras diseñás.",
};

export default function DisenarPage() {
  return <DesignerShell />;
}

import { requireRole } from "@/lib/auth";

export default async function StudioLayout({ children }: { children: React.ReactNode }) {
  await requireRole(["CONTRIBUTOR", "ADMIN"], "/studio");
  return <>{children}</>;
}

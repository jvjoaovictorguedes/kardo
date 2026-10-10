import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { TopBar } from "@/components/top-bar";
import { BottomNav } from "@/components/bottom-nav";

export default async function AdminClientLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ clientId: string }>;
}) {
  await requireAdmin();
  const { clientId } = await params;

  const client = await prisma.client.findUnique({ where: { id: clientId }, select: { name: true } });
  if (!client) notFound();

  const base = `/admin/${clientId}`;
  const navItems = [
    { href: `${base}/inicio`, label: "Início", icon: "🏠" },
    { href: `${base}/quadro`, label: "Quadro", icon: "🗂️" },
    { href: `${base}/calendario`, label: "Calendário", icon: "📅" },
    { href: `${base}/pedidos`, label: "Pedidos", icon: "📦" },
    { href: `${base}/paginas`, label: "Páginas", icon: "📄" },
    { href: `${base}/acesso`, label: "Acesso", icon: "🔑" },
  ];

  return (
    <div className="flex min-h-screen flex-col">
      <TopBar title={client.name} subtitle="KardoJota · administradora" onBack={{ href: "/admin", label: "Trocar cliente" }} />
      <div className="flex-1">{children}</div>
      <BottomNav items={navItems} />
    </div>
  );
}

import { requireClient } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { TopBar } from "@/components/top-bar";
import { BottomNav } from "@/components/bottom-nav";

const NAV_ITEMS = [
  { href: "/inicio", label: "Início", icon: "🏠" },
  { href: "/quadro", label: "Quadro", icon: "🗂️" },
  { href: "/calendario", label: "Calendário", icon: "📅" },
  { href: "/pedidos", label: "Pedidos", icon: "📦" },
  { href: "/paginas", label: "Páginas", icon: "📄" },
];

export default async function ClientLayout({ children }: { children: React.ReactNode }) {
  const { clientId } = await requireClient();

  // Nome da marca pra cabeçalho — não expõe nada de outros clientes, é só o próprio.
  const client = await prisma.client.findUnique({ where: { id: clientId }, select: { name: true } });

  return (
    <div className="flex min-h-screen flex-col">
      <TopBar title={client?.name ?? "KardoJota"} subtitle="Seu espaço de conteúdo" />
      <div className="flex-1">{children}</div>
      <BottomNav items={NAV_ITEMS} />
    </div>
  );
}

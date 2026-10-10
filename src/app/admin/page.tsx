import Link from "next/link";
import { requireAdmin } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { TopBar } from "@/components/top-bar";

export default async function AdminClientesPage() {
  await requireAdmin();

  const clients = await prisma.client.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, status: true, service: true },
  });

  return (
    <div className="flex min-h-screen flex-col">
      <TopBar title="KardoJota" subtitle="Escolha um cliente" />
      <div className="mx-auto w-full max-w-2xl flex-1 space-y-2 p-4">
        {clients.length === 0 && (
          <p className="py-10 text-center text-sm text-muted">
            Nenhum cliente ainda. Crie clientes no Jota Studio — o KardoJota reaproveita a mesma lista.
          </p>
        )}
        {clients.map((client) => (
          <Link
            key={client.id}
            href={`/admin/${client.id}/inicio`}
            className="tap-target flex items-center justify-between rounded-xl border border-border bg-surface px-4 py-3 shadow-sm active:scale-[0.99]"
          >
            <div>
              <p className="text-sm font-medium text-foreground">{client.name}</p>
              {client.service && <p className="text-xs text-muted">{client.service}</p>}
            </div>
            {client.status === "ARCHIVED" && (
              <span className="rounded-full bg-background px-2 py-1 text-[11px] text-muted">Arquivado</span>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}

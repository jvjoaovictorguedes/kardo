import { requireAdmin } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { AcessoView } from "./acesso-view";

export default async function AdminAcessoPage({
  params,
}: {
  params: Promise<{ clientId: string }>;
}) {
  await requireAdmin();
  const { clientId } = await params;

  const contacts = await prisma.clientContact.findMany({
    where: { clientId },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, email: true, phone: true, active: true },
  });

  return <AcessoView clientId={clientId} contacts={contacts} />;
}

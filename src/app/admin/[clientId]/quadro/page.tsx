import { requireAdmin } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { getBoardData } from "@/lib/queries/board";
import { AdminBoardView } from "@/components/board/admin-board-view";

export default async function AdminQuadroPage({
  params,
}: {
  params: Promise<{ clientId: string }>;
}) {
  await requireAdmin();
  const { clientId } = await params;
  const stages = await getBoardData(prisma, clientId);

  return <AdminBoardView clientId={clientId} stages={stages} />;
}

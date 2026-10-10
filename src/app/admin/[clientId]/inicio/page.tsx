import { requireAdmin } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { getDashboardSummary } from "@/lib/queries/dashboard";
import { DashboardView } from "@/components/dashboard-view";

export default async function AdminInicioPage({
  params,
}: {
  params: Promise<{ clientId: string }>;
}) {
  await requireAdmin();
  const { clientId } = await params;
  const summary = await getDashboardSummary(prisma, clientId);

  return (
    <DashboardView
      summary={summary}
      cardHref={(cardId) => `/admin/${clientId}/cartoes/${cardId}`}
      quadroHref={`/admin/${clientId}/quadro`}
    />
  );
}

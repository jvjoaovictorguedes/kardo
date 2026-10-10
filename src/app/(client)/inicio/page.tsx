import { requireClient } from "@/lib/authz";
import { withClientContext } from "@/lib/db-context";
import { getDashboardSummary } from "@/lib/queries/dashboard";
import { DashboardView } from "@/components/dashboard-view";

export default async function ClienteInicioPage() {
  const { clientId, contactId } = await requireClient();

  const summary = await withClientContext({ clientId, contactId }, (tx) =>
    getDashboardSummary(tx, clientId),
  );

  return (
    <DashboardView
      summary={summary}
      cardHref={(cardId) => `/cartoes/${cardId}`}
      quadroHref="/quadro"
    />
  );
}

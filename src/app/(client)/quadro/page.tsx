import { requireClient } from "@/lib/authz";
import { withClientContext } from "@/lib/db-context";
import { getBoardData } from "@/lib/queries/board";
import { ClientBoardView } from "@/components/board/client-board-view";

export default async function ClienteQuadroPage() {
  const { clientId, contactId } = await requireClient();

  const stages = await withClientContext({ clientId, contactId }, (tx) => getBoardData(tx, clientId));

  return <ClientBoardView stages={stages} />;
}

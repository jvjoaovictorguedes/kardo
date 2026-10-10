"use server";

import { revalidatePath } from "next/cache";
import { assertClient } from "@/lib/authz";
import { withClientContext } from "@/lib/db-context";
import { getAdjacentStageId } from "@/lib/stage-nav";

export async function clientDecideCardAction(
  cardId: string,
  decision: "APROVADO" | "AJUSTES",
  comment: string,
) {
  const { clientId, contactId } = await assertClient();
  const trimmedComment = comment.trim();

  if (decision === "AJUSTES" && !trimmedComment) {
    throw new Error("Pedir ajuste precisa de um comentário dizendo o que mudar.");
  }

  await withClientContext({ clientId, contactId }, async (tx) => {
    const card = await tx.contentCard.findFirstOrThrow({ where: { id: cardId } });

    const stages = await tx.pipelineStage.findMany({
      where: { clientId },
      select: { id: true, position: true },
    });

    const direction = decision === "APROVADO" ? "next" : "prev";
    const toStageId = getAdjacentStageId(stages, card.stageId, direction);
    if (!toStageId) throw new Error("Não há etapa seguinte/anterior para mover este card.");

    await tx.contentCard.update({ where: { id: cardId }, data: { stageId: toStageId } });

    await tx.cardApproval.create({
      data: {
        cardId,
        status: decision,
        decidedAt: new Date(),
        decidedByContactId: contactId,
        notes: trimmedComment || null,
      },
    });

    await tx.cardStageHistory.create({
      data: {
        cardId,
        fromStageId: card.stageId,
        toStageId,
        changedByContactId: contactId,
        note: trimmedComment || null,
      },
    });
  });

  revalidatePath("/quadro");
  revalidatePath("/inicio");
}

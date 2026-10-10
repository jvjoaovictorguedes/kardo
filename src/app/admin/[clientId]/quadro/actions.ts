"use server";

import { revalidatePath } from "next/cache";
import { assertAdmin } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { computeInsertPosition } from "@/lib/board-position";

export async function moveCardAction(
  clientId: string,
  cardId: string,
  toStageId: string,
  beforeCardId: string | null,
) {
  const user = await assertAdmin();

  const card = await prisma.contentCard.findUniqueOrThrow({ where: { id: cardId } });
  if (card.clientId !== clientId) throw new Error("Card não pertence a este cliente.");

  const stage = await prisma.pipelineStage.findUniqueOrThrow({ where: { id: toStageId } });
  if (stage.clientId !== clientId) throw new Error("Etapa não pertence a este cliente.");

  const siblings = await prisma.contentCard.findMany({
    where: { stageId: toStageId, id: { not: cardId } },
    orderBy: { position: "asc" },
    select: { id: true, position: true },
  });
  const newPosition = computeInsertPosition(siblings, beforeCardId);

  await prisma.$transaction([
    prisma.contentCard.update({ where: { id: cardId }, data: { stageId: toStageId, position: newPosition } }),
    ...(card.stageId !== toStageId
      ? [
          prisma.cardStageHistory.create({
            data: { cardId, fromStageId: card.stageId, toStageId, changedById: user.id },
          }),
        ]
      : []),
  ]);

  revalidatePath(`/admin/${clientId}/quadro`);
  revalidatePath(`/admin/${clientId}/inicio`);
}

export async function createStageAction(clientId: string, name: string) {
  await assertAdmin();
  const trimmed = name.trim();
  if (!trimmed) return;

  const last = await prisma.pipelineStage.findFirst({
    where: { clientId },
    orderBy: { position: "desc" },
    select: { position: true },
  });

  await prisma.pipelineStage.create({
    data: { clientId, name: trimmed, position: (last?.position ?? -1) + 1 },
  });

  revalidatePath(`/admin/${clientId}/quadro`);
}

export async function renameStageAction(clientId: string, stageId: string, name: string) {
  await assertAdmin();
  const trimmed = name.trim();
  if (!trimmed) return;

  const stage = await prisma.pipelineStage.findUniqueOrThrow({ where: { id: stageId } });
  if (stage.clientId !== clientId) throw new Error("Etapa não pertence a este cliente.");

  await prisma.pipelineStage.update({ where: { id: stageId }, data: { name: trimmed } });
  revalidatePath(`/admin/${clientId}/quadro`);
}

export async function moveStageAction(clientId: string, stageId: string, direction: "left" | "right") {
  await assertAdmin();

  const stages = await prisma.pipelineStage.findMany({
    where: { clientId },
    orderBy: { position: "asc" },
    select: { id: true, position: true },
  });

  const idx = stages.findIndex((s) => s.id === stageId);
  const swapIdx = direction === "left" ? idx - 1 : idx + 1;
  if (idx === -1 || swapIdx < 0 || swapIdx >= stages.length) return;

  await prisma.$transaction([
    prisma.pipelineStage.update({ where: { id: stages[idx].id }, data: { position: stages[swapIdx].position } }),
    prisma.pipelineStage.update({ where: { id: stages[swapIdx].id }, data: { position: stages[idx].position } }),
  ]);

  revalidatePath(`/admin/${clientId}/quadro`);
}

export async function createCardAction(
  clientId: string,
  stageId: string,
  title: string,
  format: string | null,
) {
  const user = await assertAdmin();
  const trimmed = title.trim();
  if (!trimmed) return;

  const stage = await prisma.pipelineStage.findUniqueOrThrow({ where: { id: stageId } });
  if (stage.clientId !== clientId) throw new Error("Etapa não pertence a este cliente.");

  const last = await prisma.contentCard.findFirst({
    where: { stageId },
    orderBy: { position: "desc" },
    select: { position: true },
  });

  await prisma.contentCard.create({
    data: {
      clientId,
      stageId,
      title: trimmed,
      format,
      position: (last?.position ?? -1) + 1,
      createdById: user.id,
    },
  });

  revalidatePath(`/admin/${clientId}/quadro`);
  revalidatePath(`/admin/${clientId}/inicio`);
}

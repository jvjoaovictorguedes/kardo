import type { Prisma } from "@/generated/prisma/client";

type Db = Prisma.TransactionClient;

export async function getBoardData(db: Db, clientId: string) {
  const [stages, cards] = await Promise.all([
    db.pipelineStage.findMany({
      where: { clientId },
      orderBy: { position: "asc" },
      select: { id: true, name: true, color: true, awaiting: true, isFinal: true, position: true },
    }),
    db.contentCard.findMany({
      where: { clientId },
      orderBy: { position: "asc" },
      select: {
        id: true,
        title: true,
        format: true,
        dueDate: true,
        priority: true,
        visibleToClient: true,
        turnDueAt: true,
        stageId: true,
        position: true,
      },
    }),
  ]);

  return stages.map((stage) => ({
    ...stage,
    cards: cards.filter((c) => c.stageId === stage.id),
  }));
}

export type BoardStage = Awaited<ReturnType<typeof getBoardData>>[number];
export type BoardCard = BoardStage["cards"][number];

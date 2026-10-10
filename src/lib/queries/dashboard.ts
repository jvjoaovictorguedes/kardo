import type { Prisma } from "@/generated/prisma/client";

type Db = Prisma.TransactionClient;

export async function getDashboardSummary(db: Db, clientId: string) {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const [aguardandoAprovacao, emProducao, proximasPublicacoes, cardsDoMes] = await Promise.all([
    db.contentCard.count({
      where: { clientId, stage: { awaiting: "CLIENT" } },
    }),
    db.contentCard.count({
      where: { clientId, stage: { awaiting: "STUDIO", isFinal: false } },
    }),
    db.contentCard.findMany({
      where: { clientId, dueDate: { gte: now }, stage: { isFinal: false } },
      orderBy: { dueDate: "asc" },
      take: 5,
      select: {
        id: true,
        title: true,
        format: true,
        dueDate: true,
        stage: { select: { name: true, awaiting: true } },
      },
    }),
    db.contentCard.findMany({
      where: { clientId, dueDate: { gte: monthStart, lt: monthEnd } },
      select: { id: true, stage: { select: { isFinal: true } } },
    }),
  ]);

  const totalMes = cardsDoMes.length;
  const publicadosMes = cardsDoMes.filter((c) => c.stage.isFinal).length;

  return {
    aguardandoAprovacao,
    emProducao,
    proximasPublicacoes,
    progressoMes: { publicados: publicadosMes, total: totalMes },
  };
}

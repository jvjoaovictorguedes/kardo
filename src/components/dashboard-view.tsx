import Link from "next/link";
import { TURN_LABELS, TURN_COLORS, formatDateBR } from "@/lib/labels";

type ProximaPublicacao = {
  id: string;
  title: string;
  format: string | null;
  dueDate: Date | string | null;
  stage: { name: string; awaiting: string };
};

export function DashboardView({
  summary,
  cardHref,
  quadroHref,
}: {
  summary: {
    aguardandoAprovacao: number;
    emProducao: number;
    proximasPublicacoes: ProximaPublicacao[];
    progressoMes: { publicados: number; total: number };
  };
  cardHref: (cardId: string) => string;
  quadroHref: string;
}) {
  const { aguardandoAprovacao, emProducao, proximasPublicacoes, progressoMes } = summary;
  const pct = progressoMes.total > 0 ? Math.round((progressoMes.publicados / progressoMes.total) * 100) : 0;

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4">
      <div className="grid grid-cols-2 gap-3">
        <Link
          href={quadroHref}
          className="rounded-xl border border-border bg-surface p-4 shadow-sm active:scale-[0.98]"
        >
          <p className="text-3xl font-semibold text-warning">{aguardandoAprovacao}</p>
          <p className="mt-1 text-sm text-muted">Aguardando aprovação</p>
        </Link>
        <Link
          href={quadroHref}
          className="rounded-xl border border-border bg-surface p-4 shadow-sm active:scale-[0.98]"
        >
          <p className="text-3xl font-semibold text-primary">{emProducao}</p>
          <p className="mt-1 text-sm text-muted">Em produção</p>
        </Link>
      </div>

      <div className="rounded-xl border border-border bg-surface p-4 shadow-sm">
        <div className="mb-2 flex items-baseline justify-between">
          <p className="text-sm font-medium text-foreground">Publicados este mês</p>
          <p className="text-sm text-muted">
            {progressoMes.publicados} de {progressoMes.total}
          </p>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-background">
          <div className="h-full rounded-full bg-success transition-all" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <div className="rounded-xl border border-border bg-surface shadow-sm">
        <p className="border-b border-border px-4 py-3 text-sm font-medium text-foreground">
          Próximas publicações
        </p>
        {proximasPublicacoes.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-muted">Nada agendado por aqui ainda.</p>
        ) : (
          <ul className="divide-y divide-border">
            {proximasPublicacoes.map((card) => (
              <li key={card.id}>
                <Link href={cardHref(card.id)} className="flex items-center justify-between gap-3 px-4 py-3 active:bg-background">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{card.title}</p>
                    <p className="text-xs text-muted">
                      {card.format ?? card.stage.name} · {formatDateBR(card.dueDate)}
                    </p>
                  </div>
                  <span
                    className="flex-none rounded-full px-2 py-1 text-[11px] font-medium text-white"
                    style={{ backgroundColor: TURN_COLORS[card.stage.awaiting] }}
                  >
                    {TURN_LABELS[card.stage.awaiting]}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

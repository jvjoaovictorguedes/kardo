"use client";

import { useState } from "react";
import { CardChip } from "./card-chip";
import { DecisionDialog } from "./decision-dialog";
import type { BoardStage, BoardCard } from "@/lib/queries/board";
import { clientDecideCardAction } from "@/app/(client)/quadro/actions";

export function ClientBoardView({ stages }: { stages: BoardStage[] }) {
  const [dialog, setDialog] = useState<{ card: BoardCard; decision: "APROVADO" | "AJUSTES" } | null>(null);

  return (
    <>
      <div className="flex gap-3 overflow-x-auto p-4">
        {stages.map((stage) => (
          <div key={stage.id} className="w-64 flex-none">
            <div className="mb-2 flex items-center justify-between px-1">
              <p className="text-sm font-semibold text-foreground">{stage.name}</p>
              <span className="text-xs text-muted">{stage.cards.length}</span>
            </div>
            <div className="space-y-2">
              {stage.cards.length === 0 && (
                <p className="rounded-lg border border-dashed border-border p-3 text-center text-xs text-muted">
                  Nada aqui
                </p>
              )}
              {stage.cards.map((card) => (
                <CardChip
                  key={card.id}
                  card={card}
                  awaiting={stage.awaiting}
                  href={`/cartoes/${card.id}`}
                  footer={
                    stage.awaiting === "CLIENT" ? (
                      <div className="flex gap-1">
                        <button
                          onClick={() => setDialog({ card, decision: "AJUSTES" })}
                          className="tap-target rounded-md bg-warning/10 px-2 text-[11px] font-medium text-warning"
                        >
                          Pedir ajuste
                        </button>
                        <button
                          onClick={() => setDialog({ card, decision: "APROVADO" })}
                          className="tap-target rounded-md bg-success/10 px-2 text-[11px] font-medium text-success"
                        >
                          Aprovar
                        </button>
                      </div>
                    ) : undefined
                  }
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {dialog && (
        <DecisionDialog
          cardTitle={dialog.card.title}
          decision={dialog.decision}
          onClose={() => setDialog(null)}
          onConfirm={(comment) => clientDecideCardAction(dialog.card.id, dialog.decision, comment)}
        />
      )}
    </>
  );
}

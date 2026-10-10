"use client";

import { useState, useTransition } from "react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { SortableCard } from "./sortable-card";
import { FORMAT_LABELS, FORMAT_OPTIONS } from "@/lib/labels";
import type { BoardStage } from "@/lib/queries/board";
import { createCardAction, moveStageAction, renameStageAction } from "@/app/admin/[clientId]/quadro/actions";

export function AdminColumn({
  clientId,
  stage,
  isFirst,
  isLast,
  cardHref,
}: {
  clientId: string;
  stage: BoardStage;
  isFirst: boolean;
  isLast: boolean;
  cardHref: (cardId: string) => string;
}) {
  const { setNodeRef } = useDroppable({ id: stage.id });
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(stage.name);
  const [addingCard, setAddingCard] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleRename() {
    const trimmed = name.trim();
    setEditing(false);
    if (!trimmed || trimmed === stage.name) {
      setName(stage.name);
      return;
    }
    startTransition(() => renameStageAction(clientId, stage.id, trimmed));
  }

  function handleAddCard(formData: FormData) {
    const title = String(formData.get("title") || "");
    const format = (formData.get("format") as string) || null;
    setAddingCard(false);
    startTransition(() => createCardAction(clientId, stage.id, title, format));
  }

  return (
    <div className="w-64 flex-none">
      <div className="mb-2 flex items-center gap-1 px-1">
        <button
          onClick={() => startTransition(() => moveStageAction(clientId, stage.id, "left"))}
          disabled={isFirst || isPending}
          className="tap-target px-1 text-muted disabled:opacity-20"
          aria-label="Mover coluna pra esquerda"
        >
          ◀
        </button>

        {editing ? (
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={handleRename}
            onKeyDown={(e) => e.key === "Enter" && handleRename()}
            className="min-w-0 flex-1 rounded border border-primary px-1 text-sm font-semibold"
          />
        ) : (
          <button
            onClick={() => setEditing(true)}
            className="min-w-0 flex-1 truncate text-left text-sm font-semibold text-foreground"
          >
            {stage.name}
          </button>
        )}

        <span className="flex-none text-xs text-muted">{stage.cards.length}</span>

        <button
          onClick={() => startTransition(() => moveStageAction(clientId, stage.id, "right"))}
          disabled={isLast || isPending}
          className="tap-target px-1 text-muted disabled:opacity-20"
          aria-label="Mover coluna pra direita"
        >
          ▶
        </button>
      </div>

      <div ref={setNodeRef} className="min-h-[60px] space-y-2 rounded-lg bg-background/50 p-1">
        <SortableContext items={stage.cards.map((c) => c.id)} strategy={verticalListSortingStrategy}>
          {stage.cards.map((card) => (
            <SortableCard key={card.id} card={card} awaiting={stage.awaiting} href={cardHref(card.id)} />
          ))}
        </SortableContext>

        {stage.cards.length === 0 && (
          <p className="rounded-lg border border-dashed border-border p-3 text-center text-xs text-muted">
            Arraste um card pra cá
          </p>
        )}
      </div>

      {addingCard ? (
        <form action={handleAddCard} className="mt-2 space-y-1 rounded-lg border border-border bg-surface p-2">
          <input
            name="title"
            autoFocus
            placeholder="Título do card"
            required
            className="w-full rounded border border-border px-2 py-1 text-sm outline-none focus:border-primary"
          />
          <select name="format" className="w-full rounded border border-border px-2 py-1 text-xs">
            <option value="">Sem formato</option>
            {FORMAT_OPTIONS.map((f) => (
              <option key={f} value={f}>
                {FORMAT_LABELS[f]}
              </option>
            ))}
          </select>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => setAddingCard(false)}
              className="tap-target flex-1 rounded-md border border-border text-xs"
            >
              Cancelar
            </button>
            <button type="submit" className="tap-target flex-1 rounded-md bg-primary text-xs text-white">
              Adicionar
            </button>
          </div>
        </form>
      ) : (
        <button
          onClick={() => setAddingCard(true)}
          className="tap-target mt-2 w-full rounded-md border border-dashed border-border py-1.5 text-xs text-muted hover:bg-background"
        >
          + card
        </button>
      )}
    </div>
  );
}

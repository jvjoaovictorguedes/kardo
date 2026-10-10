"use client";

import { useState, useTransition } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { CardChip } from "./card-chip";
import { AdminColumn } from "./admin-column";
import type { BoardStage, BoardCard } from "@/lib/queries/board";
import { createStageAction, moveCardAction } from "@/app/admin/[clientId]/quadro/actions";

type ColumnsState = Record<string, BoardCard[]>;

function buildColumns(stages: BoardStage[]): ColumnsState {
  return Object.fromEntries(stages.map((s) => [s.id, s.cards]));
}

function findContainer(columns: ColumnsState, id: string): string | null {
  if (columns[id]) return id;
  return Object.keys(columns).find((stageId) => columns[stageId].some((c) => c.id === id)) ?? null;
}

export function AdminBoardView({ clientId, stages }: { clientId: string; stages: BoardStage[] }) {
  const [prevStages, setPrevStages] = useState(stages);
  const [columns, setColumns] = useState<ColumnsState>(() => buildColumns(stages));
  const [activeCard, setActiveCard] = useState<BoardCard | null>(null);
  const [addingStage, setAddingStage] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Ressincroniza o estado local quando o servidor manda dados novos (ex.: depois de
  // uma ação), sem o cascading-render de um useEffect — ajuste de estado durante o
  // próprio render, como recomendado pelo React pra "adjusting state when a prop changes".
  if (stages !== prevStages) {
    setPrevStages(stages);
    setColumns(buildColumns(stages));
  }

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));
  const stageById = Object.fromEntries(stages.map((s) => [s.id, s]));

  function handleDragStart(event: DragStartEvent) {
    const container = findContainer(columns, String(event.active.id));
    if (!container) return;
    const card = columns[container].find((c) => c.id === event.active.id) ?? null;
    setActiveCard(card);
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);
    const from = findContainer(columns, activeId);
    const to = findContainer(columns, overId);
    if (!from || !to || from === to) return;

    setColumns((prev) => {
      const fromCards = prev[from].filter((c) => c.id !== activeId);
      const movedCard = prev[from].find((c) => c.id === activeId);
      if (!movedCard) return prev;

      const overIndex = prev[to].findIndex((c) => c.id === overId);
      const toCards = [...prev[to]];
      const insertAt = overIndex >= 0 ? overIndex : toCards.length;
      toCards.splice(insertAt, 0, movedCard);

      return { ...prev, [from]: fromCards, [to]: toCards };
    });
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveCard(null);
    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);
    const container = findContainer(columns, overId) ?? findContainer(columns, activeId);
    if (!container) return;

    setColumns((prev) => {
      const cards = [...prev[container]];
      const oldIndex = cards.findIndex((c) => c.id === activeId);
      const overIndex = cards.findIndex((c) => c.id === overId);
      if (oldIndex === -1) return prev;

      if (overIndex !== -1 && overIndex !== oldIndex) {
        const [moved] = cards.splice(oldIndex, 1);
        cards.splice(overIndex, 0, moved);
      }

      const finalIndex = cards.findIndex((c) => c.id === activeId);
      const beforeCardId = cards[finalIndex + 1]?.id ?? null;
      startTransition(() => moveCardAction(clientId, activeId, container, beforeCardId));

      return { ...prev, [container]: cards };
    });
  }

  function handleCreateStage(formData: FormData) {
    const name = String(formData.get("name") || "");
    setAddingStage(false);
    startTransition(() => createStageAction(clientId, name));
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-3 overflow-x-auto p-4">
        {stages.map((stage, index) => (
          <AdminColumn
            key={stage.id}
            clientId={clientId}
            stage={{ ...stage, cards: columns[stage.id] ?? [] }}
            isFirst={index === 0}
            isLast={index === stages.length - 1}
            cardHref={(cardId) => `/admin/${clientId}/cartoes/${cardId}`}
          />
        ))}

        <div className="w-64 flex-none">
          {addingStage ? (
            <form action={handleCreateStage} className="space-y-1 rounded-lg border border-border bg-surface p-2">
              <input
                name="name"
                autoFocus
                placeholder="Nome da coluna"
                required
                className="w-full rounded border border-border px-2 py-1 text-sm outline-none focus:border-primary"
              />
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => setAddingStage(false)}
                  className="tap-target flex-1 rounded-md border border-border text-xs"
                >
                  Cancelar
                </button>
                <button type="submit" className="tap-target flex-1 rounded-md bg-primary text-xs text-white">
                  Criar
                </button>
              </div>
            </form>
          ) : (
            <button
              onClick={() => setAddingStage(true)}
              disabled={isPending}
              className="tap-target w-full rounded-lg border border-dashed border-border py-2 text-sm text-muted hover:bg-background"
            >
              + nova coluna
            </button>
          )}
        </div>
      </div>

      <DragOverlay>
        {activeCard && (
          <CardChip
            card={activeCard}
            awaiting={stageById[findContainer(columns, activeCard.id) ?? ""]?.awaiting ?? "STUDIO"}
            href="#"
          />
        )}
      </DragOverlay>
    </DndContext>
  );
}

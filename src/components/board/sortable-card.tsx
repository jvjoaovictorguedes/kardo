"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { CardChip } from "./card-chip";
import type { BoardCard } from "@/lib/queries/board";

export function SortableCard({
  card,
  awaiting,
  href,
}: {
  card: BoardCard;
  awaiting: "STUDIO" | "CLIENT";
  href: string;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: card.id });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }}
    >
      <CardChip
        card={card}
        awaiting={awaiting}
        href={href}
        showHidden
        dragHandle={
          <button
            {...attributes}
            {...listeners}
            className="tap-target flex-none cursor-grab touch-none px-1 text-muted active:cursor-grabbing"
            aria-label="Arrastar card"
          >
            ⠿
          </button>
        }
      />
    </div>
  );
}

import Link from "next/link";
import { PRIORITY_COLORS, TURN_COLORS, TURN_LABELS, FORMAT_LABELS, formatDateBR } from "@/lib/labels";
import type { BoardCard } from "@/lib/queries/board";

export function CardChip({
  card,
  awaiting,
  href,
  showHidden,
  dragHandle,
  footer,
}: {
  card: BoardCard;
  awaiting: "STUDIO" | "CLIENT";
  href: string;
  showHidden?: boolean;
  dragHandle?: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border bg-surface p-3 shadow-sm">
      <div className="flex items-start gap-2">
        <span
          className="mt-1 h-2 w-2 flex-none rounded-full"
          style={{ backgroundColor: PRIORITY_COLORS[card.priority] }}
          title={`Prioridade ${card.priority.toLowerCase()}`}
        />
        <Link href={href} className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground">{card.title}</p>
          <p className="mt-0.5 text-xs text-muted">
            {card.format ? FORMAT_LABELS[card.format] ?? card.format : "Sem formato"}
            {card.dueDate && ` · ${formatDateBR(card.dueDate)}`}
          </p>
        </Link>
        {showHidden && !card.visibleToClient && (
          <span className="flex-none text-xs" title="O cliente ainda não vê este card">
            🔒
          </span>
        )}
        {dragHandle}
      </div>
      <div className="mt-2 flex items-center justify-between gap-2">
        <span
          className="rounded-full px-2 py-0.5 text-[11px] font-medium text-white"
          style={{ backgroundColor: TURN_COLORS[awaiting] }}
        >
          {TURN_LABELS[awaiting]}
        </span>
        {footer}
      </div>
    </div>
  );
}

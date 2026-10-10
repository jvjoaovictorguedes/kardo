"use client";

import { useState, useTransition } from "react";

export function DecisionDialog({
  cardTitle,
  decision,
  onConfirm,
  onClose,
}: {
  cardTitle: string;
  decision: "APROVADO" | "AJUSTES";
  onConfirm: (comment: string) => Promise<void>;
  onClose: () => void;
}) {
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const isAjuste = decision === "AJUSTES";

  function handleConfirm() {
    if (isAjuste && !comment.trim()) {
      setError("Conta pra Jô o que precisa mudar.");
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        await onConfirm(comment);
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Não deu pra salvar. Tenta de novo.");
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 md:items-center">
      <div className="w-full max-w-sm rounded-t-2xl bg-surface p-5 md:rounded-2xl">
        <p className="text-sm font-medium text-foreground">
          {isAjuste ? "Pedir ajuste em" : "Aprovar"} &ldquo;{cardTitle}&rdquo;
        </p>
        <p className="mt-1 text-sm text-muted">
          {isAjuste
            ? "Conta o que precisa mudar — a Jô recebe isso como comentário no card."
            : "O card avança pra próxima etapa. Se quiser, deixa um comentário."}
        </p>

        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={3}
          placeholder={isAjuste ? "Ex.: trocar a frase de abertura..." : "Comentário (opcional)"}
          className="tap-target mt-3 w-full rounded-md border border-border px-3 py-2 text-base outline-none focus:border-primary"
        />

        {error && <p className="mt-2 text-sm text-danger">{error}</p>}

        <div className="mt-4 flex gap-2">
          <button
            onClick={onClose}
            disabled={isPending}
            className="tap-target flex-1 rounded-md border border-border px-3 text-sm font-medium hover:bg-background"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={isPending}
            className={`tap-target flex-1 rounded-md px-3 text-sm font-medium text-white disabled:opacity-60 ${
              isAjuste ? "bg-warning" : "bg-success"
            }`}
          >
            {isPending ? "Enviando..." : isAjuste ? "Pedir ajuste" : "Aprovar"}
          </button>
        </div>
      </div>
    </div>
  );
}

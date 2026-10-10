/** Calcula a posição (Float) de um card ao inseri-lo antes de `beforeId` numa lista já ordenada. */
export function computeInsertPosition(
  siblings: { id: string; position: number }[],
  beforeId: string | null,
): number {
  if (siblings.length === 0) return 0;
  if (beforeId === null) return siblings[siblings.length - 1].position + 1;

  const idx = siblings.findIndex((s) => s.id === beforeId);
  if (idx === -1) return siblings[siblings.length - 1].position + 1;

  const before = idx > 0 ? siblings[idx - 1].position : siblings[idx].position - 1;
  const after = siblings[idx].position;
  return (before + after) / 2;
}

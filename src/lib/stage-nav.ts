export function getAdjacentStageId(
  stages: { id: string; position: number }[],
  currentStageId: string,
  direction: "next" | "prev",
): string | null {
  const sorted = [...stages].sort((a, b) => a.position - b.position);
  const idx = sorted.findIndex((s) => s.id === currentStageId);
  if (idx === -1) return null;
  const targetIdx = direction === "next" ? idx + 1 : idx - 1;
  return sorted[targetIdx]?.id ?? null;
}

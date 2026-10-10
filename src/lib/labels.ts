export const PRIORITY_LABELS: Record<string, string> = {
  BAIXA: "Baixa",
  MEDIA: "Média",
  ALTA: "Alta",
};

export const PRIORITY_OPTIONS = ["BAIXA", "MEDIA", "ALTA"];

export const PRIORITY_COLORS: Record<string, string> = {
  BAIXA: "#5e6c84",
  MEDIA: "#ff8b00",
  ALTA: "#c9372c",
};

export const TURN_LABELS: Record<string, string> = {
  STUDIO: "Com a Jô",
  CLIENT: "Com o cliente",
};

export const TURN_COLORS: Record<string, string> = {
  STUDIO: "#3b6fd6",
  CLIENT: "#ff8b00",
};

export const APPROVAL_STATUS_LABELS: Record<string, string> = {
  PENDENTE: "Pendente",
  APROVADO: "Aprovado",
  AJUSTES: "Ajustes pedidos",
};

export const FORMAT_LABELS: Record<string, string> = {
  reels: "Reels",
  carrossel: "Carrossel",
  story: "Story",
  post_estatico: "Post estático",
};

export const FORMAT_OPTIONS = Object.keys(FORMAT_LABELS);

export const MATERIAL_REQUEST_STATUS_LABELS: Record<string, string> = {
  OPEN: "Em aberto",
  DONE: "Concluído",
};

export function formatDateBR(date: string | Date | null | undefined) {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("pt-BR");
}

export function formatDateTimeBR(date: string | Date | null | undefined) {
  if (!date) return "—";
  return new Date(date).toLocaleString("pt-BR");
}

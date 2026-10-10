import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { FORMAT_LABELS } from "../src/lib/labels";

const DEFAULT_CHECKLISTS: Record<string, string[]> = {
  reels: ["Roteiro revisado", "Gravação feita", "Edição finalizada", "Legenda escrita", "Capa/thumbnail definida"],
  carrossel: ["Roteiro revisado", "Artes de todas as lâminas prontas", "Legenda escrita", "Ordem das lâminas revisada"],
  story: ["Arte ou vídeo pronto", "Link/sticker configurado", "Legenda escrita"],
  post_estatico: ["Arte finalizada", "Legenda escrita", "Hashtags revisadas"],
};

async function main() {
  for (const [format, items] of Object.entries(DEFAULT_CHECKLISTS)) {
    const existing = await prisma.checklistTemplate.findUnique({ where: { format } });
    if (existing) {
      console.log(`Checklist já existe: ${format}`);
      continue;
    }

    await prisma.checklistTemplate.create({
      data: {
        format,
        label: FORMAT_LABELS[format] ?? format,
        items: { create: items.map((label, position) => ({ label, position })) },
      },
    });
    console.log(`Checklist criado: ${format}`);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

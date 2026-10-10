import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { getDatabaseUrl } from "@/lib/env";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const adapter = new PrismaPg({ connectionString: getDatabaseUrl() });

// Conexão "dona das tabelas": sempre ignora RLS (comportamento padrão do Postgres pro
// owner). Só é usada depois que src/lib/authz.ts confirmou que quem está pedindo é a
// administradora. Para o cliente, ver src/lib/db-context.ts.
export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

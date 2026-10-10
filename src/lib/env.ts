/**
 * A integração Prisma Postgres da Vercel às vezes grava as variáveis de conexão com um
 * prefixo (ex.: "kardo_DATABASE_URL" em vez de "DATABASE_URL"), dependendo de como o
 * "Connect to Project" foi configurado. Em vez de depender de deixar o prefixo em
 * branco certinho toda vez, o código aceita as variantes mais comuns, nessa ordem.
 */
const DATABASE_URL_CANDIDATES = [
  "DATABASE_URL",
  "POSTGRES_URL",
  "PRISMA_DATABASE_URL",
  "kardo_DATABASE_URL",
  "kardo_POSTGRES_URL",
  "kardo_PRISMA_DATABASE_URL",
] as const;

export function getDatabaseUrl(): string {
  for (const name of DATABASE_URL_CANDIDATES) {
    const value = process.env[name];
    if (value) return value;
  }

  throw new Error(
    `Nenhuma variável de conexão com o banco encontrada. Configure uma destas nas Environment Variables: ${DATABASE_URL_CANDIDATES.join(", ")}.`,
  );
}

import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * Executa `run` numa transação com o papel restrito `kardo_client` (sem BYPASSRLS) e
 * as variáveis de sessão que as policies de RLS leem (ver migration
 * 20261010040100_kardojota_foundation). Isso é o que de fato impede um cliente de ler
 * ou mudar algo fora do próprio espaço — não é só a interface escondendo botões.
 *
 * `app.client_id` / `app.contact_id` são setados via `set_config(..., true)`, cujo
 * terceiro argumento `true` os torna "local" à transação (equivalente a SET LOCAL),
 * então nunca escapam para outras conexões do pool.
 */
export async function withClientContext<T>(
  context: { clientId: string; contactId: string },
  run: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe("SET LOCAL ROLE kardo_client");
    await tx.$executeRaw`SELECT set_config('app.client_id', ${context.clientId}, true)`;
    await tx.$executeRaw`SELECT set_config('app.contact_id', ${context.contactId}, true)`;
    return run(tx);
  });
}

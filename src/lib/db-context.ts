import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * Executa `run` numa transação marcada como "atuando como cliente". A migration
 * 20261010040100_kardojota_foundation usa `FORCE ROW LEVEL SECURITY` + políticas que só
 * restringem quando `app.actor_role = 'client'` — sem precisar de uma role de banco
 * separada (bancos gerenciados costumam bloquear CREATE ROLE pro usuário da aplicação).
 *
 * Fora dessa função (admin, e o Jota Studio, que nem sabe que isso existe) a variável
 * nunca é setada, então as políticas liberam tudo — comportamento de sempre.
 *
 * `set_config(..., true)` com o terceiro argumento `true` torna o valor "local" à
 * transação (equivalente a SET LOCAL), então nunca escapa para outras conexões do pool.
 */
export async function withClientContext<T>(
  context: { clientId: string; contactId: string },
  run: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.actor_role', 'client', true)`;
    await tx.$executeRaw`SELECT set_config('app.client_id', ${context.clientId}, true)`;
    await tx.$executeRaw`SELECT set_config('app.contact_id', ${context.contactId}, true)`;
    return run(tx);
  });
}

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export class ForbiddenError extends Error {
  constructor(message = "Acesso não permitido.") {
    super(message);
    this.name = "ForbiddenError";
  }
}

/** Usa em Server Components/Pages da área da admin. Redireciona se não for admin. */
export async function requireAdmin() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") redirect("/login");
  return session.user;
}

/** Usa em Server Actions/Route Handlers da área da admin. Lança erro em vez de redirecionar. */
export async function assertAdmin() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    throw new ForbiddenError("Você precisa estar logada como administradora.");
  }
  return session.user;
}

/**
 * Usa em Server Components/Pages da área do cliente. Redireciona se não houver sessão
 * de cliente, OU se o acesso daquele contato tiver sido suspenso desde que o token (JWT)
 * foi emitido — RLS por si só não invalida uma sessão já existente, então checamos
 * `active` de novo aqui, a cada carregamento, pela conexão privilegiada (fora do RLS).
 */
export async function requireClient() {
  const session = await auth();
  if (!session?.user || session.user.role !== "CLIENT") redirect("/login");

  const contact = await prisma.clientContact.findUnique({
    where: { id: session.user.id },
  });
  if (!contact || !contact.active) redirect("/login?suspenso=1");

  return { contactId: contact.id, clientId: contact.clientId, name: contact.name };
}

/** Usa em Server Actions/Route Handlers da área do cliente. Lança erro em vez de redirecionar. */
export async function assertClient() {
  const session = await auth();
  if (!session?.user || session.user.role !== "CLIENT") {
    throw new ForbiddenError("Sessão inválida.");
  }

  const contact = await prisma.clientContact.findUnique({
    where: { id: session.user.id },
  });
  if (!contact || !contact.active) {
    throw new ForbiddenError("Acesso suspenso pela administradora.");
  }

  return { contactId: contact.id, clientId: contact.clientId, name: contact.name };
}

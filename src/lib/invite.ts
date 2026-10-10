import { randomBytes, createHash } from "crypto";
import { prisma } from "@/lib/prisma";

const TOKEN_TTL_HOURS = 72;

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * A admin convida um contato: gera um link de uso único e validade curta. Sem
 * cadastro público — só quem recebe o link (por e-mail ou WhatsApp, copiado pela
 * admin) consegue entrar, e só enquanto o token não expirar ou já tiver sido usado.
 */
export async function createClientInviteLink(contactId: string) {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + TOKEN_TTL_HOURS * 60 * 60 * 1000);

  await prisma.clientLoginToken.create({
    data: { contactId, tokenHash: hashToken(token), expiresAt },
  });

  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3001";
  return `${base}/convite/${token}`;
}

/**
 * Valida o token do link de convite/login, marca como usado e devolve o contato —
 * ou null se o token não existe, já expirou, já foi usado, ou o acesso do contato
 * está suspenso (ClientContact.active = false).
 */
export async function consumeClientInviteToken(token: string) {
  const record = await prisma.clientLoginToken.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { contact: { include: { client: true } } },
  });

  if (!record) return null;
  if (record.usedAt) return null;
  if (record.expiresAt < new Date()) return null;
  if (!record.contact.active) return null;

  await prisma.clientLoginToken.update({
    where: { id: record.id },
    data: { usedAt: new Date() },
  });

  return record.contact;
}

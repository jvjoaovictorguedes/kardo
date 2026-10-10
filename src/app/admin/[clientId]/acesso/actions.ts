"use server";

import { revalidatePath } from "next/cache";
import { assertAdmin } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { createClientInviteLink } from "@/lib/invite";

export async function createContactAction(clientId: string, formData: FormData) {
  await assertAdmin();

  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const phone = String(formData.get("phone") || "").trim();
  if (!name || !email) return;

  await prisma.clientContact.create({
    data: { clientId, name, email, phone: phone || null },
  });

  revalidatePath(`/admin/${clientId}/acesso`);
}

export async function generateInviteAction(clientId: string, contactId: string) {
  await assertAdmin();
  const link = await createClientInviteLink(contactId);
  revalidatePath(`/admin/${clientId}/acesso`);
  return link;
}

export async function setContactActiveAction(clientId: string, contactId: string, active: boolean) {
  await assertAdmin();
  await prisma.clientContact.update({ where: { id: contactId }, data: { active } });
  revalidatePath(`/admin/${clientId}/acesso`);
}

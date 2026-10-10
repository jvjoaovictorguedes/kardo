"use client";

import { useState, useTransition } from "react";
import { createContactAction, generateInviteAction, setContactActiveAction } from "./actions";

type Contact = { id: string; name: string; email: string; phone: string | null; active: boolean };

export function AcessoView({ clientId, contacts }: { clientId: string; contacts: Contact[] }) {
  const [isPending, startTransition] = useTransition();
  const [linkFor, setLinkFor] = useState<{ contactId: string; link: string } | null>(null);
  const [showForm, setShowForm] = useState(contacts.length === 0);

  function handleCreate(formData: FormData) {
    startTransition(async () => {
      await createContactAction(clientId, formData);
      setShowForm(false);
    });
  }

  function handleInvite(contactId: string) {
    startTransition(async () => {
      const link = await generateInviteAction(clientId, contactId);
      setLinkFor({ contactId, link });
    });
  }

  function handleToggleActive(contactId: string, active: boolean) {
    startTransition(async () => {
      await setContactActiveAction(clientId, contactId, active);
    });
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4">
      <p className="text-sm text-muted">
        Quem está aqui pode entrar no espaço deste cliente. Gere um link de convite e envie por
        e-mail ou WhatsApp — ele só funciona uma vez e expira em 72 horas. Suspender tira o acesso
        na hora.
      </p>

      <div className="space-y-2">
        {contacts.map((contact) => (
          <div key={contact.id} className="rounded-xl border border-border bg-surface p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">{contact.name}</p>
                <p className="truncate text-xs text-muted">{contact.email}</p>
              </div>
              <span
                className={`flex-none rounded-full px-2 py-1 text-[11px] font-medium ${
                  contact.active ? "bg-success/10 text-success" : "bg-danger/10 text-danger"
                }`}
              >
                {contact.active ? "Ativo" : "Suspenso"}
              </span>
            </div>

            <div className="mt-3 flex gap-2">
              <button
                onClick={() => handleInvite(contact.id)}
                disabled={isPending || !contact.active}
                className="tap-target flex-1 rounded-md border border-border px-3 text-sm font-medium hover:bg-background disabled:opacity-50"
              >
                Gerar link de convite
              </button>
              <button
                onClick={() => handleToggleActive(contact.id, !contact.active)}
                disabled={isPending}
                className="tap-target flex-1 rounded-md border border-border px-3 text-sm font-medium hover:bg-background disabled:opacity-50"
              >
                {contact.active ? "Suspender acesso" : "Reativar acesso"}
              </button>
            </div>

            {linkFor?.contactId === contact.id && (
              <div className="mt-3 rounded-md bg-background p-2">
                <p className="mb-1 text-xs text-muted">Envie este link para {contact.name}:</p>
                <input
                  readOnly
                  value={linkFor.link}
                  onFocus={(e) => e.currentTarget.select()}
                  className="w-full rounded border border-border bg-surface px-2 py-1.5 text-xs"
                />
              </div>
            )}
          </div>
        ))}
      </div>

      {showForm ? (
        <form action={handleCreate} className="space-y-3 rounded-xl border border-dashed border-border p-4">
          <p className="text-sm font-medium text-foreground">Nova pessoa com acesso</p>
          <input
            name="name"
            placeholder="Nome"
            required
            className="tap-target w-full rounded-md border border-border px-3 py-2 text-base outline-none focus:border-primary"
          />
          <input
            name="email"
            type="email"
            placeholder="E-mail"
            required
            className="tap-target w-full rounded-md border border-border px-3 py-2 text-base outline-none focus:border-primary"
          />
          <input
            name="phone"
            placeholder="Telefone (opcional)"
            className="tap-target w-full rounded-md border border-border px-3 py-2 text-base outline-none focus:border-primary"
          />
          <button
            type="submit"
            disabled={isPending}
            className="tap-target w-full rounded-md bg-primary px-3 py-2 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-60"
          >
            Criar acesso
          </button>
        </form>
      ) : (
        <button
          onClick={() => setShowForm(true)}
          className="tap-target w-full rounded-md border border-dashed border-border px-3 py-2 text-sm text-muted hover:bg-background"
        >
          + Adicionar pessoa
        </button>
      )}
    </div>
  );
}

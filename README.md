# KardoJota

Espaço de produção de conteúdo usado pela Jô (social media) junto com cada cliente dela:
acompanhamento, aprovação e envio de materiais. Interface em português do Brasil, pensada
primeiro para celular — os clientes acessam quase sempre pelo telefone.

Usa o **mesmo banco Postgres** do Jota Studio (repositório `basio`) — nenhum dado é
duplicado. O schema do Jota Studio já reserva as tabelas de produção (`PipelineStage`,
`ContentCard`, aprovações, comentários, histórico, banco de ideias etc.); o KardoJota só
adiciona o que falta (convite/suspensão de cliente, pedidos de material, checklists por
formato, arquivo grande no Google Drive) numa migration própria, sem tocar no que o Jota
Studio já usa.

## Stack

- [Next.js](https://nextjs.org) (App Router) + [Tailwind CSS](https://tailwindcss.com)
- [Prisma](https://www.prisma.io) + PostgreSQL (banco compartilhado com o Jota Studio —
  **não** é Supabase; é Postgres simples, igual ao que o Jota Studio já usa)
- [NextAuth.js](https://authjs.dev) (Credentials) — duas formas de entrar:
  - Equipe (a Jô): e-mail + senha, reaproveitando a tabela `StaffUser` do Jota Studio.
  - Cliente: link de convite de uso único (sem cadastro público), gerado pela admin na
    tela "Acesso" de cada cliente.
- Row Level Security nativa do Postgres para as regras de permissão do cliente — aplicada
  no banco, não só escondida na interface (ver "RLS" abaixo).

## Banco de dados compartilhado — primeira configuração

Este app nunca deve rodar `prisma migrate dev` direto numa base nova pensando que é a
única dona do schema: a maior parte das tabelas já existe, criada pelas migrations do
Jota Studio.

1. Aponte `DATABASE_URL` (veja `.env.example`) para o **mesmo** Postgres que o Jota Studio
   usa.
2. Se esse banco **já rodou** as migrations do Jota Studio (caso normal), registre a
   migration de baseline sem executá-la de novo:
   ```
   npx prisma migrate resolve --applied 20261010040000_baseline_jota_studio
   ```
3. Aplique a migration própria do KardoJota (a única que de fato muda algo):
   ```
   npm run db:deploy
   ```
4. Crie os modelos de checklist padrão: `npm run db:seed`.
5. Rode o servidor: `npm run dev` (porta 3001, pra não bater com o Jota Studio em dev).

A migration do KardoJota é idempotente (segura de rodar de novo) — se `db:deploy` falhar
no meio por qualquer motivo, corrija e rode de novo sem medo de erro de "já existe".

Se por acaso este for o primeiro app a rodar contra um banco vazio (ambiente de teste
isolado), pule o passo 2 — a migration de baseline cria tudo do zero normalmente.

## RLS — como as permissões do cliente são aplicadas

Não existe projeto Supabase aqui — "RLS" é a Row Level Security nativa do Postgres,
criada na migration `20261010040100_kardojota_foundation`. E como bancos gerenciados
(Prisma Postgres, Neon, RDS etc.) normalmente **não deixam criar uma role nova**, tudo
roda com a única role que você já tem — não precisa de nenhum `GRANT`/`CREATE ROLE`
manual.

- Toda tabela sensível tem `FORCE ROW LEVEL SECURITY`, e cada política segue a mesma
  regra: se a variável de sessão `app.actor_role` não for exatamente `'client'` (ou seja:
  nunca foi setada — caso do Jota Studio e da área da admin do Kardo — ou foi setada como
  `'admin'`), libera tudo, igual ao comportamento de sempre. O Jota Studio nem precisa
  saber que isso existe.
- Toda ação do **cliente** passa por `withClientContext()` (`src/lib/db-context.ts`), que
  abre uma transação e define `app.actor_role = 'client'` + `app.client_id` +
  `app.contact_id` (via `set_config(..., true)`, local à transação). A partir daí as
  políticas no banco garantem, por exemplo: só vê cards com `visibleToClient = true`; só
  move um card que está numa etapa "com o cliente", e só pra outra etapa do mesmo cliente
  (um trigger em `ContentCard` garante que nenhuma outra coluna muda nessa mesma
  instrução); só comenta como si mesmo; nunca vê a nota interna, nem clientes de outra
  marca — mesmo que um bug na interface tentasse pedir isso.
- `requireClient()`/`assertClient()` (`src/lib/authz.ts`) também re-checam
  `ClientContact.active` a cada requisição pela conexão privilegiada: suspender o acesso
  vale imediatamente, mesmo pra quem já tinha uma sessão aberta.

## Arquivos grandes (vídeo) → Google Drive

Arquivos pequenos continuam como `bytea` no Postgres (igual ao Jota Studio). Acima de
`DRIVE_STORAGE_THRESHOLD_BYTES`, o upload vai para o Google Drive — configure
`GOOGLE_DRIVE_CLIENT_EMAIL`, `GOOGLE_DRIVE_PRIVATE_KEY` e `GOOGLE_DRIVE_FOLDER_ID` (conta
de serviço do Google com uma pasta compartilhada com ela). Sem essas variáveis, upload de
arquivo grande é bloqueado com um aviso claro — nunca falha silenciosamente nem salva
truncado.

## Estado atual

Construído até aqui: fundação (schema, migrations, RLS, autenticação admin/cliente,
convite e suspensão de acesso) e o módulo **Início** (resumo + progresso do mês) pras duas
áreas. Os demais módulos (Quadro/Kanban, Card de conteúdo, Aprovação, Calendário, Pedidos
de material, Formulário de ideia, Checklists, Páginas personalizadas, Visão Lista,
upload pro Google Drive) aparecem como "Em construção" na navegação e seguem sendo
construídos um de cada vez.

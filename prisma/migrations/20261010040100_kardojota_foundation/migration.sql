-- KardoJota: primeira migration própria sobre o banco compartilhado com o Jota Studio.
-- Só adiciona (novas colunas nullable/com default, novas tabelas) e nunca remove nem
-- renomeia nada que o Jota Studio já usa — exceto "CardApproval"."decidedBy", uma coluna
-- declarada no schema original mas que nenhuma tela do Jota Studio chegou a usar
-- (substituída abaixo por duas FKs reais, para registrar o autor de verdade).
--
-- Todo o arquivo é seguro de rodar de novo (idempotente): se uma execução anterior
-- parou no meio (por exemplo, por não conseguir criar uma role — ver seção de RLS
-- mais abaixo), pode rodar este arquivo inteiro de novo sem medo de erro de "já existe".

-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "FileStorageProvider" AS ENUM ('POSTGRES', 'GOOGLE_DRIVE');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "MaterialRequestStatus" AS ENUM ('OPEN', 'DONE');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- AlterTable: suspensão de acesso do cliente
ALTER TABLE "ClientContact" ADD COLUMN IF NOT EXISTS "active" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable: prazo de quem está com a vez (distinto da data de publicação)
ALTER TABLE "ContentCard" ADD COLUMN IF NOT EXISTS "turnDueAt" TIMESTAMP(3);

-- AlterTable: autor do comentário quando é o cliente
ALTER TABLE "CardComment" ADD COLUMN IF NOT EXISTS "authorContactId" TEXT;
DO $$ BEGIN
  ALTER TABLE "CardComment" ADD CONSTRAINT "CardComment_authorContactId_fkey" FOREIGN KEY ("authorContactId") REFERENCES "ClientContact"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- AlterTable: autor real da decisão de aprovação (nunca usado até aqui)
ALTER TABLE "CardApproval" DROP COLUMN IF EXISTS "decidedBy";
ALTER TABLE "CardApproval" ADD COLUMN IF NOT EXISTS "decidedByStaffId" TEXT;
ALTER TABLE "CardApproval" ADD COLUMN IF NOT EXISTS "decidedByContactId" TEXT;
DO $$ BEGIN
  ALTER TABLE "CardApproval" ADD CONSTRAINT "CardApproval_decidedByStaffId_fkey" FOREIGN KEY ("decidedByStaffId") REFERENCES "StaffUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "CardApproval" ADD CONSTRAINT "CardApproval_decidedByContactId_fkey" FOREIGN KEY ("decidedByContactId") REFERENCES "ClientContact"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- AlterTable: quem moveu a etapa, quando foi o cliente
ALTER TABLE "CardStageHistory" ADD COLUMN IF NOT EXISTS "changedByContactId" TEXT;
DO $$ BEGIN
  ALTER TABLE "CardStageHistory" ADD CONSTRAINT "CardStageHistory_changedByContactId_fkey" FOREIGN KEY ("changedByContactId") REFERENCES "ClientContact"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- AlterTable: quem enviou o pedido pelo formulário (Banco de ideias)
ALTER TABLE "IdeaBank" ADD COLUMN IF NOT EXISTS "requestedByContactId" TEXT;
DO $$ BEGIN
  ALTER TABLE "IdeaBank" ADD CONSTRAINT "IdeaBank_requestedByContactId_fkey" FOREIGN KEY ("requestedByContactId") REFERENCES "ClientContact"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- AlterTable: a admin decide, por página, se o cliente vê
ALTER TABLE "CustomPage" ADD COLUMN IF NOT EXISTS "visibleToClient" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable: arquivos grandes (vídeo) ficam no Google Drive, não como bytea
ALTER TABLE "File" ALTER COLUMN "data" DROP NOT NULL;
ALTER TABLE "File" ADD COLUMN IF NOT EXISTS "storageProvider" "FileStorageProvider" NOT NULL DEFAULT 'POSTGRES';
ALTER TABLE "File" ADD COLUMN IF NOT EXISTS "externalId" TEXT;
ALTER TABLE "File" ADD COLUMN IF NOT EXISTS "externalUrl" TEXT;
ALTER TABLE "File" ADD COLUMN IF NOT EXISTS "uploadedByContactId" TEXT;
DO $$ BEGIN
  ALTER TABLE "File" ADD CONSTRAINT "File_uploadedByContactId_fkey" FOREIGN KEY ("uploadedByContactId") REFERENCES "ClientContact"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- CreateTable: convite / login do cliente por link mágico (token de uso único)
CREATE TABLE IF NOT EXISTS "ClientLoginToken" (
    "id" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClientLoginToken_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ClientLoginToken_tokenHash_key" ON "ClientLoginToken"("tokenHash");
CREATE INDEX IF NOT EXISTS "ClientLoginToken_contactId_idx" ON "ClientLoginToken"("contactId");
DO $$ BEGIN
  ALTER TABLE "ClientLoginToken" ADD CONSTRAINT "ClientLoginToken_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "ClientContact"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- CreateTable: pedido de material (descrição + prazo)
CREATE TABLE IF NOT EXISTS "MaterialRequest" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "dueDate" TIMESTAMP(3),
    "status" "MaterialRequestStatus" NOT NULL DEFAULT 'OPEN',
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MaterialRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "MaterialRequest_clientId_createdAt_idx" ON "MaterialRequest"("clientId", "createdAt");
DO $$ BEGIN
  ALTER TABLE "MaterialRequest" ADD CONSTRAINT "MaterialRequest_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "MaterialRequest" ADD CONSTRAINT "MaterialRequest_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "StaffUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- CreateTable: arquivos enviados pelo cliente dentro de um pedido de material
CREATE TABLE IF NOT EXISTS "MaterialFile" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "fileId" TEXT NOT NULL,
    "uploadedByContactId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MaterialFile_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "MaterialFile_requestId_createdAt_idx" ON "MaterialFile"("requestId", "createdAt");
DO $$ BEGIN
  ALTER TABLE "MaterialFile" ADD CONSTRAINT "MaterialFile_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "MaterialRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "MaterialFile" ADD CONSTRAINT "MaterialFile_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "File"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "MaterialFile" ADD CONSTRAINT "MaterialFile_uploadedByContactId_fkey" FOREIGN KEY ("uploadedByContactId") REFERENCES "ClientContact"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- CreateTable: modelos de checklist por formato (editáveis pela admin)
CREATE TABLE IF NOT EXISTS "ChecklistTemplate" (
    "id" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "label" TEXT NOT NULL,

    CONSTRAINT "ChecklistTemplate_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ChecklistTemplate_format_key" ON "ChecklistTemplate"("format");

CREATE TABLE IF NOT EXISTS "ChecklistTemplateItem" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ChecklistTemplateItem_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
  ALTER TABLE "ChecklistTemplateItem" ADD CONSTRAINT "ChecklistTemplateItem_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "ChecklistTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- CreateTable: cópia do checklist no card (editável sem afetar o modelo)
CREATE TABLE IF NOT EXISTS "CardChecklistItem" (
    "id" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "done" BOOLEAN NOT NULL DEFAULT false,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "CardChecklistItem_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "CardChecklistItem_cardId_position_idx" ON "CardChecklistItem"("cardId", "position");
DO $$ BEGIN
  ALTER TABLE "CardChecklistItem" ADD CONSTRAINT "CardChecklistItem_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "ContentCard"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- =====================================================================================
-- RLS — regras de permissão aplicadas no BANCO, não só escondidas na interface.
--
-- Bancos gerenciados (Prisma Postgres, Neon, RDS etc.) normalmente não deixam o usuário
-- da aplicação criar uma role nova (CREATE ROLE) — só existe UMA role disponível, a
-- mesma que roda tudo. Então a separação admin/cliente não vem de duas roles: vem de uma
-- variável de sessão, `app.actor_role`, somada a `FORCE ROW LEVEL SECURITY` (que faz as
-- políticas valerem mesmo pra quem é dona das tabelas).
--
-- Regra de cada política abaixo: se `app.actor_role` NÃO for exatamente 'client' (ou
-- seja: nunca foi setada — caso do Jota Studio e da área da admin do Kardo, que nunca
-- tocam nessa variável — ou foi setada como 'admin'), a política de "acesso total"
-- libera tudo, igual ao comportamento de sempre. Só quando uma transação chama
--
--   SELECT set_config('app.actor_role', 'client', true);
--   SELECT set_config('app.client_id', '<Client.id>', true);
--   SELECT set_config('app.contact_id', '<ClientContact.id>', true);
--
-- (ver src/lib/db-context.ts) é que as políticas restritas do cliente passam a valer.
-- Isso significa que o Jota Studio continua funcionando exatamente como hoje, sem
-- precisar saber que isso existe.
-- =====================================================================================

CREATE OR REPLACE FUNCTION kardo_is_client_actor() RETURNS boolean AS $$
  SELECT current_setting('app.actor_role', true) = 'client';
$$ LANGUAGE sql STABLE;

-- ---------- Client: só a própria linha, quando atuando como cliente ----------
ALTER TABLE "Client" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Client" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS admin_full_access ON "Client";
CREATE POLICY admin_full_access ON "Client" FOR ALL
  USING (NOT kardo_is_client_actor()) WITH CHECK (NOT kardo_is_client_actor());

DROP POLICY IF EXISTS client_select_self ON "Client";
CREATE POLICY client_select_self ON "Client" FOR SELECT
  USING (kardo_is_client_actor() AND id = current_setting('app.client_id', true));

-- ---------- ClientContact: só o próprio contato (pra checar "active" e exibir nome) ----------
ALTER TABLE "ClientContact" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ClientContact" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS admin_full_access ON "ClientContact";
CREATE POLICY admin_full_access ON "ClientContact" FOR ALL
  USING (NOT kardo_is_client_actor()) WITH CHECK (NOT kardo_is_client_actor());

DROP POLICY IF EXISTS client_select_self ON "ClientContact";
CREATE POLICY client_select_self ON "ClientContact" FOR SELECT
  USING (kardo_is_client_actor() AND id = current_setting('app.contact_id', true));

-- ---------- PipelineStage: vê as colunas do próprio cliente, não cria/edita/reordena ----------
ALTER TABLE "PipelineStage" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PipelineStage" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS admin_full_access ON "PipelineStage";
CREATE POLICY admin_full_access ON "PipelineStage" FOR ALL
  USING (NOT kardo_is_client_actor()) WITH CHECK (NOT kardo_is_client_actor());

DROP POLICY IF EXISTS client_select_own ON "PipelineStage";
CREATE POLICY client_select_own ON "PipelineStage" FOR SELECT
  USING (kardo_is_client_actor() AND "clientId" = current_setting('app.client_id', true));

-- ---------- ContentCard: só os liberados (visibleToClient); só muda a etapa, nada mais ----------
ALTER TABLE "ContentCard" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ContentCard" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS admin_full_access ON "ContentCard";
CREATE POLICY admin_full_access ON "ContentCard" FOR ALL
  USING (NOT kardo_is_client_actor()) WITH CHECK (NOT kardo_is_client_actor());

DROP POLICY IF EXISTS client_select_visible ON "ContentCard";
CREATE POLICY client_select_visible ON "ContentCard" FOR SELECT
  USING (
    kardo_is_client_actor()
    AND "clientId" = current_setting('app.client_id', true)
    AND "visibleToClient" = true
  );

-- só pode mover um card que hoje está numa etapa "com o cliente", e só pra outra etapa
-- do mesmo cliente — a escolha de qual etapa exata (aprovar = próxima, ajuste = anterior)
-- é feita pela aplicação; o banco garante que o salto não sai desses limites. O trigger
-- abaixo garante que NENHUMA outra coluna (título, roteiro, nota interna etc.) muda
-- junto nessa mesma instrução.
DROP POLICY IF EXISTS client_update_stage_only ON "ContentCard";
CREATE POLICY client_update_stage_only ON "ContentCard" FOR UPDATE
  USING (
    kardo_is_client_actor()
    AND "clientId" = current_setting('app.client_id', true)
    AND "visibleToClient" = true
    AND EXISTS (
      SELECT 1 FROM "PipelineStage" s
      WHERE s.id = "ContentCard"."stageId" AND s."awaiting" = 'CLIENT'
    )
  )
  WITH CHECK (
    kardo_is_client_actor()
    AND "clientId" = current_setting('app.client_id', true)
    AND EXISTS (
      SELECT 1 FROM "PipelineStage" ns
      WHERE ns.id = "stageId" AND ns."clientId" = current_setting('app.client_id', true)
    )
  );

CREATE OR REPLACE FUNCTION kardo_content_card_client_lockdown() RETURNS trigger AS $$
BEGIN
  IF kardo_is_client_actor() THEN
    IF NEW.title IS DISTINCT FROM OLD.title
      OR NEW.format IS DISTINCT FROM OLD.format
      OR NEW.channel IS DISTINCT FROM OLD.channel
      OR NEW."pillarId" IS DISTINCT FROM OLD."pillarId"
      OR NEW."dueDate" IS DISTINCT FROM OLD."dueDate"
      OR NEW.priority IS DISTINCT FROM OLD.priority
      OR NEW.script IS DISTINCT FROM OLD.script
      OR NEW.caption IS DISTINCT FROM OLD.caption
      OR NEW."internalNotes" IS DISTINCT FROM OLD."internalNotes"
      OR NEW."visibleToClient" IS DISTINCT FROM OLD."visibleToClient"
      OR NEW.position IS DISTINCT FROM OLD.position
      OR NEW."createdById" IS DISTINCT FROM OLD."createdById"
      OR NEW."clientId" IS DISTINCT FROM OLD."clientId"
    THEN
      RAISE EXCEPTION 'cliente só pode mudar a etapa do card (stageId)';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS content_card_client_lockdown ON "ContentCard";
CREATE TRIGGER content_card_client_lockdown
  BEFORE UPDATE ON "ContentCard"
  FOR EACH ROW EXECUTE FUNCTION kardo_content_card_client_lockdown();

-- ---------- CardAttachment: vê e envia anexos de cards liberados ----------
ALTER TABLE "CardAttachment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CardAttachment" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS admin_full_access ON "CardAttachment";
CREATE POLICY admin_full_access ON "CardAttachment" FOR ALL
  USING (NOT kardo_is_client_actor()) WITH CHECK (NOT kardo_is_client_actor());

DROP POLICY IF EXISTS client_select_visible ON "CardAttachment";
CREATE POLICY client_select_visible ON "CardAttachment" FOR SELECT
  USING (kardo_is_client_actor() AND EXISTS (
    SELECT 1 FROM "ContentCard" c
    WHERE c.id = "CardAttachment"."cardId" AND c."clientId" = current_setting('app.client_id', true) AND c."visibleToClient" = true
  ));

DROP POLICY IF EXISTS client_insert_own_card ON "CardAttachment";
CREATE POLICY client_insert_own_card ON "CardAttachment" FOR INSERT
  WITH CHECK (kardo_is_client_actor() AND EXISTS (
    SELECT 1 FROM "ContentCard" c
    WHERE c.id = "cardId" AND c."clientId" = current_setting('app.client_id', true) AND c."visibleToClient" = true
  ));

-- ---------- CardComment: comenta como si mesmo, só em cards liberados ----------
ALTER TABLE "CardComment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CardComment" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS admin_full_access ON "CardComment";
CREATE POLICY admin_full_access ON "CardComment" FOR ALL
  USING (NOT kardo_is_client_actor()) WITH CHECK (NOT kardo_is_client_actor());

DROP POLICY IF EXISTS client_select_visible ON "CardComment";
CREATE POLICY client_select_visible ON "CardComment" FOR SELECT
  USING (kardo_is_client_actor() AND EXISTS (
    SELECT 1 FROM "ContentCard" c
    WHERE c.id = "CardComment"."cardId" AND c."clientId" = current_setting('app.client_id', true) AND c."visibleToClient" = true
  ));

DROP POLICY IF EXISTS client_insert_as_self ON "CardComment";
CREATE POLICY client_insert_as_self ON "CardComment" FOR INSERT
  WITH CHECK (
    kardo_is_client_actor()
    AND "authorType" = 'CLIENT'
    AND "authorContactId" = current_setting('app.contact_id', true)
    AND "authorId" IS NULL
    AND EXISTS (
      SELECT 1 FROM "ContentCard" c
      WHERE c.id = "cardId" AND c."clientId" = current_setting('app.client_id', true) AND c."visibleToClient" = true
    )
  );

-- ---------- CardApproval: registra a própria decisão (aprovar / pedir ajuste) ----------
ALTER TABLE "CardApproval" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CardApproval" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS admin_full_access ON "CardApproval";
CREATE POLICY admin_full_access ON "CardApproval" FOR ALL
  USING (NOT kardo_is_client_actor()) WITH CHECK (NOT kardo_is_client_actor());

DROP POLICY IF EXISTS client_select_visible ON "CardApproval";
CREATE POLICY client_select_visible ON "CardApproval" FOR SELECT
  USING (kardo_is_client_actor() AND EXISTS (
    SELECT 1 FROM "ContentCard" c
    WHERE c.id = "CardApproval"."cardId" AND c."clientId" = current_setting('app.client_id', true) AND c."visibleToClient" = true
  ));

DROP POLICY IF EXISTS client_insert_decision ON "CardApproval";
CREATE POLICY client_insert_decision ON "CardApproval" FOR INSERT
  WITH CHECK (
    kardo_is_client_actor()
    AND "status" IN ('APROVADO', 'AJUSTES')
    AND "decidedByContactId" = current_setting('app.contact_id', true)
    AND "decidedByStaffId" IS NULL
    AND EXISTS (
      SELECT 1 FROM "ContentCard" c
      WHERE c.id = "cardId" AND c."clientId" = current_setting('app.client_id', true) AND c."visibleToClient" = true
    )
  );

-- ---------- CardStageHistory: log de quando o próprio cliente moveu o card ----------
ALTER TABLE "CardStageHistory" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CardStageHistory" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS admin_full_access ON "CardStageHistory";
CREATE POLICY admin_full_access ON "CardStageHistory" FOR ALL
  USING (NOT kardo_is_client_actor()) WITH CHECK (NOT kardo_is_client_actor());

DROP POLICY IF EXISTS client_select_visible ON "CardStageHistory";
CREATE POLICY client_select_visible ON "CardStageHistory" FOR SELECT
  USING (kardo_is_client_actor() AND EXISTS (
    SELECT 1 FROM "ContentCard" c
    WHERE c.id = "CardStageHistory"."cardId" AND c."clientId" = current_setting('app.client_id', true) AND c."visibleToClient" = true
  ));

DROP POLICY IF EXISTS client_insert_own_move ON "CardStageHistory";
CREATE POLICY client_insert_own_move ON "CardStageHistory" FOR INSERT
  WITH CHECK (
    kardo_is_client_actor()
    AND "changedByContactId" = current_setting('app.contact_id', true)
    AND "changedById" IS NULL
    AND EXISTS (
      SELECT 1 FROM "ContentCard" c
      WHERE c.id = "cardId" AND c."clientId" = current_setting('app.client_id', true) AND c."visibleToClient" = true
    )
  );

-- ---------- CardChecklistItem: só visualiza (checklist é operacional da produção) ----------
ALTER TABLE "CardChecklistItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CardChecklistItem" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS admin_full_access ON "CardChecklistItem";
CREATE POLICY admin_full_access ON "CardChecklistItem" FOR ALL
  USING (NOT kardo_is_client_actor()) WITH CHECK (NOT kardo_is_client_actor());

DROP POLICY IF EXISTS client_select_visible ON "CardChecklistItem";
CREATE POLICY client_select_visible ON "CardChecklistItem" FOR SELECT
  USING (kardo_is_client_actor() AND EXISTS (
    SELECT 1 FROM "ContentCard" c
    WHERE c.id = "CardChecklistItem"."cardId" AND c."clientId" = current_setting('app.client_id', true) AND c."visibleToClient" = true
  ));

-- ---------- IdeaBank: só envia pelo formulário de pedido, não vê o banco de ideias ----------
ALTER TABLE "IdeaBank" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "IdeaBank" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS admin_full_access ON "IdeaBank";
CREATE POLICY admin_full_access ON "IdeaBank" FOR ALL
  USING (NOT kardo_is_client_actor()) WITH CHECK (NOT kardo_is_client_actor());

DROP POLICY IF EXISTS client_insert_request ON "IdeaBank";
CREATE POLICY client_insert_request ON "IdeaBank" FOR INSERT
  WITH CHECK (
    kardo_is_client_actor()
    AND "clientId" = current_setting('app.client_id', true)
    AND "source" = 'CLIENT_REQUEST'
    AND "status" = 'PENDING'
    AND "requestedByContactId" = current_setting('app.contact_id', true)
    AND "createdById" IS NULL
    AND "convertedCardId" IS NULL
  );

-- ---------- MaterialRequest: só visualiza (a admin cria o pedido) ----------
ALTER TABLE "MaterialRequest" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MaterialRequest" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS admin_full_access ON "MaterialRequest";
CREATE POLICY admin_full_access ON "MaterialRequest" FOR ALL
  USING (NOT kardo_is_client_actor()) WITH CHECK (NOT kardo_is_client_actor());

DROP POLICY IF EXISTS client_select_own ON "MaterialRequest";
CREATE POLICY client_select_own ON "MaterialRequest" FOR SELECT
  USING (kardo_is_client_actor() AND "clientId" = current_setting('app.client_id', true));

-- ---------- MaterialFile: envia e vê os arquivos dos pedidos do próprio cliente ----------
ALTER TABLE "MaterialFile" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MaterialFile" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS admin_full_access ON "MaterialFile";
CREATE POLICY admin_full_access ON "MaterialFile" FOR ALL
  USING (NOT kardo_is_client_actor()) WITH CHECK (NOT kardo_is_client_actor());

DROP POLICY IF EXISTS client_select_own ON "MaterialFile";
CREATE POLICY client_select_own ON "MaterialFile" FOR SELECT
  USING (kardo_is_client_actor() AND EXISTS (
    SELECT 1 FROM "MaterialRequest" mr
    WHERE mr.id = "MaterialFile"."requestId" AND mr."clientId" = current_setting('app.client_id', true)
  ));

DROP POLICY IF EXISTS client_insert_own ON "MaterialFile";
CREATE POLICY client_insert_own ON "MaterialFile" FOR INSERT
  WITH CHECK (
    kardo_is_client_actor()
    AND "uploadedByContactId" = current_setting('app.contact_id', true)
    AND EXISTS (
      SELECT 1 FROM "MaterialRequest" mr
      WHERE mr.id = "requestId" AND mr."clientId" = current_setting('app.client_id', true)
    )
  );

-- ---------- CustomPage e conteúdo: só o que a admin marcou como visível ----------
ALTER TABLE "CustomPage" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CustomPage" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS admin_full_access ON "CustomPage";
CREATE POLICY admin_full_access ON "CustomPage" FOR ALL
  USING (NOT kardo_is_client_actor()) WITH CHECK (NOT kardo_is_client_actor());

DROP POLICY IF EXISTS client_select_visible ON "CustomPage";
CREATE POLICY client_select_visible ON "CustomPage" FOR SELECT
  USING (kardo_is_client_actor() AND "clientId" = current_setting('app.client_id', true) AND "visibleToClient" = true);

ALTER TABLE "CustomPageTextContent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CustomPageTextContent" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS admin_full_access ON "CustomPageTextContent";
CREATE POLICY admin_full_access ON "CustomPageTextContent" FOR ALL
  USING (NOT kardo_is_client_actor()) WITH CHECK (NOT kardo_is_client_actor());

DROP POLICY IF EXISTS client_select_visible ON "CustomPageTextContent";
CREATE POLICY client_select_visible ON "CustomPageTextContent" FOR SELECT
  USING (kardo_is_client_actor() AND EXISTS (
    SELECT 1 FROM "CustomPage" p
    WHERE p.id = "CustomPageTextContent"."pageId" AND p."clientId" = current_setting('app.client_id', true) AND p."visibleToClient" = true
  ));

ALTER TABLE "CustomPageListItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CustomPageListItem" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS admin_full_access ON "CustomPageListItem";
CREATE POLICY admin_full_access ON "CustomPageListItem" FOR ALL
  USING (NOT kardo_is_client_actor()) WITH CHECK (NOT kardo_is_client_actor());

DROP POLICY IF EXISTS client_select_visible ON "CustomPageListItem";
CREATE POLICY client_select_visible ON "CustomPageListItem" FOR SELECT
  USING (kardo_is_client_actor() AND EXISTS (
    SELECT 1 FROM "CustomPage" p
    WHERE p.id = "CustomPageListItem"."pageId" AND p."clientId" = current_setting('app.client_id', true) AND p."visibleToClient" = true
  ));

ALTER TABLE "CustomPageFile" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CustomPageFile" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS admin_full_access ON "CustomPageFile";
CREATE POLICY admin_full_access ON "CustomPageFile" FOR ALL
  USING (NOT kardo_is_client_actor()) WITH CHECK (NOT kardo_is_client_actor());

DROP POLICY IF EXISTS client_select_visible ON "CustomPageFile";
CREATE POLICY client_select_visible ON "CustomPageFile" FOR SELECT
  USING (kardo_is_client_actor() AND EXISTS (
    SELECT 1 FROM "CustomPage" p
    WHERE p.id = "CustomPageFile"."pageId" AND p."clientId" = current_setting('app.client_id', true) AND p."visibleToClient" = true
  ));

-- ---------- File: lê o que subiu ou o que está anexado em algo liberado; só envia como si mesmo ----------
ALTER TABLE "File" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "File" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS admin_full_access ON "File";
CREATE POLICY admin_full_access ON "File" FOR ALL
  USING (NOT kardo_is_client_actor()) WITH CHECK (NOT kardo_is_client_actor());

DROP POLICY IF EXISTS client_insert_own ON "File";
CREATE POLICY client_insert_own ON "File" FOR INSERT
  WITH CHECK (
    kardo_is_client_actor()
    AND "uploadedByContactId" = current_setting('app.contact_id', true)
    AND "uploadedById" IS NULL
  );

DROP POLICY IF EXISTS client_select_reachable ON "File";
CREATE POLICY client_select_reachable ON "File" FOR SELECT
  USING (
    kardo_is_client_actor()
    AND (
      "uploadedByContactId" = current_setting('app.contact_id', true)
      OR EXISTS (
        SELECT 1 FROM "CardAttachment" ca JOIN "ContentCard" c ON c.id = ca."cardId"
        WHERE ca."fileId" = "File"."id" AND c."clientId" = current_setting('app.client_id', true) AND c."visibleToClient" = true
      )
      OR EXISTS (
        SELECT 1 FROM "MaterialFile" mf JOIN "MaterialRequest" mr ON mr.id = mf."requestId"
        WHERE mf."fileId" = "File"."id" AND mr."clientId" = current_setting('app.client_id', true)
      )
      OR EXISTS (
        SELECT 1 FROM "CustomPageFile" cf JOIN "CustomPage" cp ON cp.id = cf."pageId"
        WHERE cf."fileId" = "File"."id" AND cp."clientId" = current_setting('app.client_id', true) AND cp."visibleToClient" = true
      )
    )
  );

-- Todas as demais tabelas (ContentPillar, StrategyPage, DocumentFolder, Document, Note,
-- InternalTask, ChecklistTemplate, ChecklistTemplateItem, ClientLoginToken, StaffUser)
-- não têm RLS nenhuma: continuam exatamente como o Jota Studio já usa, e o cliente nunca
-- tem como chegar nelas porque nenhuma tela/ação do Kardo pro cliente as consulta.

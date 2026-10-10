-- KardoJota: primeira migration própria sobre o banco compartilhado com o Jota Studio.
-- Só adiciona (novas colunas nullable/com default, novas tabelas) e nunca remove nem
-- renomeia nada que o Jota Studio já usa — exceto "CardApproval"."decidedBy", uma coluna
-- declarada no schema original mas que nenhuma tela do Jota Studio chegou a usar
-- (substituída abaixo por duas FKs reais, para registrar o autor de verdade).

-- CreateEnum
CREATE TYPE "FileStorageProvider" AS ENUM ('POSTGRES', 'GOOGLE_DRIVE');

-- CreateEnum
CREATE TYPE "MaterialRequestStatus" AS ENUM ('OPEN', 'DONE');

-- AlterTable: suspensão de acesso do cliente
ALTER TABLE "ClientContact" ADD COLUMN "active" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable: prazo de quem está com a vez (distinto da data de publicação)
ALTER TABLE "ContentCard" ADD COLUMN "turnDueAt" TIMESTAMP(3);

-- AlterTable: autor do comentário quando é o cliente
ALTER TABLE "CardComment" ADD COLUMN "authorContactId" TEXT;
ALTER TABLE "CardComment" ADD CONSTRAINT "CardComment_authorContactId_fkey" FOREIGN KEY ("authorContactId") REFERENCES "ClientContact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable: autor real da decisão de aprovação (nunca usado até aqui)
ALTER TABLE "CardApproval" DROP COLUMN "decidedBy";
ALTER TABLE "CardApproval" ADD COLUMN "decidedByStaffId" TEXT;
ALTER TABLE "CardApproval" ADD COLUMN "decidedByContactId" TEXT;
ALTER TABLE "CardApproval" ADD CONSTRAINT "CardApproval_decidedByStaffId_fkey" FOREIGN KEY ("decidedByStaffId") REFERENCES "StaffUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CardApproval" ADD CONSTRAINT "CardApproval_decidedByContactId_fkey" FOREIGN KEY ("decidedByContactId") REFERENCES "ClientContact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable: quem moveu a etapa, quando foi o cliente
ALTER TABLE "CardStageHistory" ADD COLUMN "changedByContactId" TEXT;
ALTER TABLE "CardStageHistory" ADD CONSTRAINT "CardStageHistory_changedByContactId_fkey" FOREIGN KEY ("changedByContactId") REFERENCES "ClientContact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable: quem enviou o pedido pelo formulário (Banco de ideias)
ALTER TABLE "IdeaBank" ADD COLUMN "requestedByContactId" TEXT;
ALTER TABLE "IdeaBank" ADD CONSTRAINT "IdeaBank_requestedByContactId_fkey" FOREIGN KEY ("requestedByContactId") REFERENCES "ClientContact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable: a admin decide, por página, se o cliente vê
ALTER TABLE "CustomPage" ADD COLUMN "visibleToClient" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable: arquivos grandes (vídeo) ficam no Google Drive, não como bytea
ALTER TABLE "File" ALTER COLUMN "data" DROP NOT NULL;
ALTER TABLE "File" ADD COLUMN "storageProvider" "FileStorageProvider" NOT NULL DEFAULT 'POSTGRES';
ALTER TABLE "File" ADD COLUMN "externalId" TEXT;
ALTER TABLE "File" ADD COLUMN "externalUrl" TEXT;
ALTER TABLE "File" ADD COLUMN "uploadedByContactId" TEXT;
ALTER TABLE "File" ADD CONSTRAINT "File_uploadedByContactId_fkey" FOREIGN KEY ("uploadedByContactId") REFERENCES "ClientContact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable: convite / login do cliente por link mágico (token de uso único)
CREATE TABLE "ClientLoginToken" (
    "id" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClientLoginToken_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ClientLoginToken_tokenHash_key" ON "ClientLoginToken"("tokenHash");
CREATE INDEX "ClientLoginToken_contactId_idx" ON "ClientLoginToken"("contactId");
ALTER TABLE "ClientLoginToken" ADD CONSTRAINT "ClientLoginToken_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "ClientContact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: pedido de material (descrição + prazo)
CREATE TABLE "MaterialRequest" (
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

CREATE INDEX "MaterialRequest_clientId_createdAt_idx" ON "MaterialRequest"("clientId", "createdAt");
ALTER TABLE "MaterialRequest" ADD CONSTRAINT "MaterialRequest_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MaterialRequest" ADD CONSTRAINT "MaterialRequest_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "StaffUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable: arquivos enviados pelo cliente dentro de um pedido de material
CREATE TABLE "MaterialFile" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "fileId" TEXT NOT NULL,
    "uploadedByContactId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MaterialFile_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MaterialFile_requestId_createdAt_idx" ON "MaterialFile"("requestId", "createdAt");
ALTER TABLE "MaterialFile" ADD CONSTRAINT "MaterialFile_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "MaterialRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MaterialFile" ADD CONSTRAINT "MaterialFile_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "File"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MaterialFile" ADD CONSTRAINT "MaterialFile_uploadedByContactId_fkey" FOREIGN KEY ("uploadedByContactId") REFERENCES "ClientContact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable: modelos de checklist por formato (editáveis pela admin)
CREATE TABLE "ChecklistTemplate" (
    "id" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "label" TEXT NOT NULL,

    CONSTRAINT "ChecklistTemplate_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ChecklistTemplate_format_key" ON "ChecklistTemplate"("format");

CREATE TABLE "ChecklistTemplateItem" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ChecklistTemplateItem_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "ChecklistTemplateItem" ADD CONSTRAINT "ChecklistTemplateItem_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "ChecklistTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: cópia do checklist no card (editável sem afetar o modelo)
CREATE TABLE "CardChecklistItem" (
    "id" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "done" BOOLEAN NOT NULL DEFAULT false,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "CardChecklistItem_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CardChecklistItem_cardId_position_idx" ON "CardChecklistItem"("cardId", "position");
ALTER TABLE "CardChecklistItem" ADD CONSTRAINT "CardChecklistItem_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "ContentCard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- =====================================================================================
-- RLS — regras de permissão aplicadas no BANCO, não só escondidas na interface.
--
-- A conexão da admin (DATABASE_URL padrão) é a dona das tabelas (foi quem rodou estas
-- migrations) e por isso ignora RLS automaticamente — comportamento padrão do Postgres
-- para o owner. Toda requisição autenticada como CLIENTE roda dentro de uma transação
-- que primeiro faz:
--
--   SET LOCAL ROLE kardo_client;
--   SET LOCAL app.client_id = '<Client.id>';
--   SET LOCAL app.contact_id = '<ClientContact.id>';
--
-- (ver src/lib/db-context.ts). A partir daí o próprio Postgres passa a filtrar e
-- restringir linhas e colunas — mesmo que um bug na interface tentasse pedir outra
-- coisa, a query é recusada no banco.
--
-- Operação única pós-deploy, se o papel usado em produção (DATABASE_URL) tiver outro
-- nome: rode manualmente "GRANT kardo_client TO <papel_de_producao>;".
-- =====================================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'kardo_client') THEN
    CREATE ROLE kardo_client NOLOGIN;
  END IF;
END $$;

GRANT kardo_client TO CURRENT_USER;

-- ---------- Client: só a própria linha ----------
ALTER TABLE "Client" ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON "Client" TO kardo_client;
CREATE POLICY kardo_client_select ON "Client" FOR SELECT TO kardo_client
  USING (id = current_setting('app.client_id', true));

-- ---------- ClientContact: só o próprio contato (pra checar "active" e exibir nome) ----------
ALTER TABLE "ClientContact" ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON "ClientContact" TO kardo_client;
CREATE POLICY kardo_client_select ON "ClientContact" FOR SELECT TO kardo_client
  USING (id = current_setting('app.contact_id', true));

-- ---------- PipelineStage: vê as colunas do próprio cliente, não cria/edita/reordena ----------
ALTER TABLE "PipelineStage" ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON "PipelineStage" TO kardo_client;
CREATE POLICY kardo_client_select ON "PipelineStage" FOR SELECT TO kardo_client
  USING ("clientId" = current_setting('app.client_id', true));

-- ---------- ContentCard: só os liberados (visibleToClient); só muda a etapa, nada mais ----------
ALTER TABLE "ContentCard" ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON "ContentCard" TO kardo_client;
GRANT UPDATE ("stageId", "updatedAt") ON "ContentCard" TO kardo_client;

CREATE POLICY kardo_client_select ON "ContentCard" FOR SELECT TO kardo_client
  USING ("clientId" = current_setting('app.client_id', true) AND "visibleToClient" = true);

-- só pode mover um card que hoje está numa etapa "com o cliente", e só pra outra etapa
-- do mesmo cliente — a escolha de qual etapa exata (aprovar = próxima, ajuste = anterior)
-- é feita pela aplicação; o banco garante que o salto não sai desses limites.
CREATE POLICY kardo_client_update_stage ON "ContentCard" FOR UPDATE TO kardo_client
  USING (
    "clientId" = current_setting('app.client_id', true)
    AND "visibleToClient" = true
    AND EXISTS (
      SELECT 1 FROM "PipelineStage" s
      WHERE s.id = "ContentCard"."stageId" AND s."awaiting" = 'CLIENT'
    )
  )
  WITH CHECK (
    "clientId" = current_setting('app.client_id', true)
    AND EXISTS (
      SELECT 1 FROM "PipelineStage" ns
      WHERE ns.id = "stageId" AND ns."clientId" = current_setting('app.client_id', true)
    )
  );

-- ---------- CardAttachment: vê e envia anexos de cards liberados ----------
ALTER TABLE "CardAttachment" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT ON "CardAttachment" TO kardo_client;

CREATE POLICY kardo_client_select ON "CardAttachment" FOR SELECT TO kardo_client
  USING (EXISTS (
    SELECT 1 FROM "ContentCard" c
    WHERE c.id = "CardAttachment"."cardId" AND c."clientId" = current_setting('app.client_id', true) AND c."visibleToClient" = true
  ));

CREATE POLICY kardo_client_insert ON "CardAttachment" FOR INSERT TO kardo_client
  WITH CHECK (EXISTS (
    SELECT 1 FROM "ContentCard" c
    WHERE c.id = "cardId" AND c."clientId" = current_setting('app.client_id', true) AND c."visibleToClient" = true
  ));

-- ---------- CardComment: comenta como si mesmo, só em cards liberados ----------
ALTER TABLE "CardComment" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT ON "CardComment" TO kardo_client;

CREATE POLICY kardo_client_select ON "CardComment" FOR SELECT TO kardo_client
  USING (EXISTS (
    SELECT 1 FROM "ContentCard" c
    WHERE c.id = "CardComment"."cardId" AND c."clientId" = current_setting('app.client_id', true) AND c."visibleToClient" = true
  ));

CREATE POLICY kardo_client_insert ON "CardComment" FOR INSERT TO kardo_client
  WITH CHECK (
    "authorType" = 'CLIENT'
    AND "authorContactId" = current_setting('app.contact_id', true)
    AND "authorId" IS NULL
    AND EXISTS (
      SELECT 1 FROM "ContentCard" c
      WHERE c.id = "cardId" AND c."clientId" = current_setting('app.client_id', true) AND c."visibleToClient" = true
    )
  );

-- ---------- CardApproval: registra a própria decisão (aprovar / pedir ajuste) ----------
ALTER TABLE "CardApproval" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT ON "CardApproval" TO kardo_client;

CREATE POLICY kardo_client_select ON "CardApproval" FOR SELECT TO kardo_client
  USING (EXISTS (
    SELECT 1 FROM "ContentCard" c
    WHERE c.id = "CardApproval"."cardId" AND c."clientId" = current_setting('app.client_id', true) AND c."visibleToClient" = true
  ));

CREATE POLICY kardo_client_insert ON "CardApproval" FOR INSERT TO kardo_client
  WITH CHECK (
    "status" IN ('APROVADO', 'AJUSTES')
    AND "decidedByContactId" = current_setting('app.contact_id', true)
    AND "decidedByStaffId" IS NULL
    AND EXISTS (
      SELECT 1 FROM "ContentCard" c
      WHERE c.id = "cardId" AND c."clientId" = current_setting('app.client_id', true) AND c."visibleToClient" = true
    )
  );

-- ---------- CardStageHistory: log de quando o próprio cliente moveu o card ----------
ALTER TABLE "CardStageHistory" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT ON "CardStageHistory" TO kardo_client;

CREATE POLICY kardo_client_select ON "CardStageHistory" FOR SELECT TO kardo_client
  USING (EXISTS (
    SELECT 1 FROM "ContentCard" c
    WHERE c.id = "CardStageHistory"."cardId" AND c."clientId" = current_setting('app.client_id', true) AND c."visibleToClient" = true
  ));

CREATE POLICY kardo_client_insert ON "CardStageHistory" FOR INSERT TO kardo_client
  WITH CHECK (
    "changedByContactId" = current_setting('app.contact_id', true)
    AND "changedById" IS NULL
    AND EXISTS (
      SELECT 1 FROM "ContentCard" c
      WHERE c.id = "cardId" AND c."clientId" = current_setting('app.client_id', true) AND c."visibleToClient" = true
    )
  );

-- ---------- CardChecklistItem: só visualiza (checklist é operacional da produção) ----------
ALTER TABLE "CardChecklistItem" ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON "CardChecklistItem" TO kardo_client;

CREATE POLICY kardo_client_select ON "CardChecklistItem" FOR SELECT TO kardo_client
  USING (EXISTS (
    SELECT 1 FROM "ContentCard" c
    WHERE c.id = "CardChecklistItem"."cardId" AND c."clientId" = current_setting('app.client_id', true) AND c."visibleToClient" = true
  ));

-- ---------- IdeaBank: só envia pelo formulário de pedido, não vê o banco de ideias ----------
ALTER TABLE "IdeaBank" ENABLE ROW LEVEL SECURITY;
GRANT INSERT ON "IdeaBank" TO kardo_client;

CREATE POLICY kardo_client_insert ON "IdeaBank" FOR INSERT TO kardo_client
  WITH CHECK (
    "clientId" = current_setting('app.client_id', true)
    AND "source" = 'CLIENT_REQUEST'
    AND "status" = 'PENDING'
    AND "requestedByContactId" = current_setting('app.contact_id', true)
    AND "createdById" IS NULL
    AND "convertedCardId" IS NULL
  );

-- ---------- MaterialRequest: só visualiza (a admin cria o pedido) ----------
ALTER TABLE "MaterialRequest" ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON "MaterialRequest" TO kardo_client;

CREATE POLICY kardo_client_select ON "MaterialRequest" FOR SELECT TO kardo_client
  USING ("clientId" = current_setting('app.client_id', true));

-- ---------- MaterialFile: envia e vê os arquivos dos pedidos do próprio cliente ----------
ALTER TABLE "MaterialFile" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT ON "MaterialFile" TO kardo_client;

CREATE POLICY kardo_client_select ON "MaterialFile" FOR SELECT TO kardo_client
  USING (EXISTS (
    SELECT 1 FROM "MaterialRequest" mr
    WHERE mr.id = "MaterialFile"."requestId" AND mr."clientId" = current_setting('app.client_id', true)
  ));

CREATE POLICY kardo_client_insert ON "MaterialFile" FOR INSERT TO kardo_client
  WITH CHECK (
    "uploadedByContactId" = current_setting('app.contact_id', true)
    AND EXISTS (
      SELECT 1 FROM "MaterialRequest" mr
      WHERE mr.id = "requestId" AND mr."clientId" = current_setting('app.client_id', true)
    )
  );

-- ---------- CustomPage e conteúdo: só o que a admin marcou como visível ----------
ALTER TABLE "CustomPage" ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON "CustomPage" TO kardo_client;
CREATE POLICY kardo_client_select ON "CustomPage" FOR SELECT TO kardo_client
  USING ("clientId" = current_setting('app.client_id', true) AND "visibleToClient" = true);

ALTER TABLE "CustomPageTextContent" ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON "CustomPageTextContent" TO kardo_client;
CREATE POLICY kardo_client_select ON "CustomPageTextContent" FOR SELECT TO kardo_client
  USING (EXISTS (
    SELECT 1 FROM "CustomPage" p
    WHERE p.id = "CustomPageTextContent"."pageId" AND p."clientId" = current_setting('app.client_id', true) AND p."visibleToClient" = true
  ));

ALTER TABLE "CustomPageListItem" ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON "CustomPageListItem" TO kardo_client;
CREATE POLICY kardo_client_select ON "CustomPageListItem" FOR SELECT TO kardo_client
  USING (EXISTS (
    SELECT 1 FROM "CustomPage" p
    WHERE p.id = "CustomPageListItem"."pageId" AND p."clientId" = current_setting('app.client_id', true) AND p."visibleToClient" = true
  ));

ALTER TABLE "CustomPageFile" ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON "CustomPageFile" TO kardo_client;
CREATE POLICY kardo_client_select ON "CustomPageFile" FOR SELECT TO kardo_client
  USING (EXISTS (
    SELECT 1 FROM "CustomPage" p
    WHERE p.id = "CustomPageFile"."pageId" AND p."clientId" = current_setting('app.client_id', true) AND p."visibleToClient" = true
  ));

-- ---------- File: lê o que subiu ou o que está anexado em algo liberado; só envia como si mesmo ----------
ALTER TABLE "File" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT ON "File" TO kardo_client;

CREATE POLICY kardo_client_insert ON "File" FOR INSERT TO kardo_client
  WITH CHECK (
    "uploadedByContactId" = current_setting('app.contact_id', true)
    AND "uploadedById" IS NULL
  );

CREATE POLICY kardo_client_select ON "File" FOR SELECT TO kardo_client
  USING (
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
  );

-- Todas as demais tabelas (ContentPillar, StrategyPage, DocumentFolder, Document, Note,
-- InternalTask, ChecklistTemplate, ChecklistTemplateItem, ClientLoginToken, StaffUser)
-- não têm NENHUM grant para kardo_client: qualquer tentativa de acesso é recusada pelo
-- Postgres antes mesmo de RLS entrar em jogo.

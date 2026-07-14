-- =============================================================================
-- Optional PostgreSQL Row Level Security (RLS) for CollabDocs
-- Apply AFTER prisma db push / migrate, on Neon or self-hosted Postgres.
--
-- This is defense-in-depth on top of Prisma-scoped queries.
-- The app must SET LOCAL app.current_user_id = '<userId>' per transaction
-- for these policies to allow access. Until that session GUC is wired,
-- keep using the app role carefully or enable policies in "force" mode only
-- after integrating a Prisma $transaction helper.
-- =============================================================================

-- Example app role (run as superuser once):
-- CREATE ROLE collabdocs_app LOGIN PASSWORD 'change-me';
-- GRANT CONNECT ON DATABASE collabdocs TO collabdocs_app;
-- GRANT USAGE ON SCHEMA public TO collabdocs_app;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO collabdocs_app;
-- ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO collabdocs_app;

CREATE OR REPLACE FUNCTION app_current_user_id() RETURNS text AS $$
  SELECT NULLIF(current_setting('app.current_user_id', true), '');
$$ LANGUAGE sql STABLE;

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Documents: owner or explicit permission
DROP POLICY IF EXISTS documents_tenant_isolation ON documents;
CREATE POLICY documents_tenant_isolation ON documents
  FOR ALL
  USING (
    owner_id = app_current_user_id()
    OR EXISTS (
      SELECT 1 FROM permissions p
      WHERE p.document_id = documents.id
        AND p.user_id = app_current_user_id()
    )
  )
  WITH CHECK (owner_id = app_current_user_id());

-- Permissions: only participants of the document
DROP POLICY IF EXISTS permissions_tenant_isolation ON permissions;
CREATE POLICY permissions_tenant_isolation ON permissions
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM documents d
      WHERE d.id = permissions.document_id
        AND (
          d.owner_id = app_current_user_id()
          OR EXISTS (
            SELECT 1 FROM permissions p2
            WHERE p2.document_id = d.id AND p2.user_id = app_current_user_id()
          )
        )
    )
  );

-- Versions follow document access
DROP POLICY IF EXISTS versions_tenant_isolation ON document_versions;
CREATE POLICY versions_tenant_isolation ON document_versions
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM documents d
      WHERE d.id = document_versions.document_id
        AND (
          d.owner_id = app_current_user_id()
          OR EXISTS (
            SELECT 1 FROM permissions p
            WHERE p.document_id = d.id AND p.user_id = app_current_user_id()
          )
        )
    )
  );

-- Sync queue: only the acting user
DROP POLICY IF EXISTS sync_queue_tenant_isolation ON sync_queue;
CREATE POLICY sync_queue_tenant_isolation ON sync_queue
  FOR ALL
  USING (user_id = app_current_user_id())
  WITH CHECK (user_id = app_current_user_id());

-- AI + audit: own rows (owners can extend later)
DROP POLICY IF EXISTS ai_requests_tenant_isolation ON ai_requests;
CREATE POLICY ai_requests_tenant_isolation ON ai_requests
  FOR ALL
  USING (user_id = app_current_user_id())
  WITH CHECK (user_id = app_current_user_id());

DROP POLICY IF EXISTS audit_logs_tenant_isolation ON audit_logs;
CREATE POLICY audit_logs_tenant_isolation ON audit_logs
  FOR SELECT
  USING (user_id = app_current_user_id() OR user_id IS NULL);

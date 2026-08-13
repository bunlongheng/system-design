-- system_designs: the AI-callable artifact store. Mirrors the sibling
-- diagrams / mindmaps tables in the shared "2026" Postgres. A design is a
-- React Flow structure: nodes[] (services) + edges[] (connections).
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS system_designs (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL,
  title      text NOT NULL DEFAULT 'Untitled',
  slug       text,
  nodes      jsonb NOT NULL DEFAULT '[]'::jsonb,
  edges      jsonb NOT NULL DEFAULT '[]'::jsonb,
  type       text NOT NULL DEFAULT 'system-design',
  tags       text[] DEFAULT '{}'::text[],
  tokens_out integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_system_designs_user_id ON system_designs (user_id);
CREATE INDEX IF NOT EXISTS idx_system_designs_slug ON system_designs (user_id, slug);

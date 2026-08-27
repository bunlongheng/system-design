-- Public vs private diagrams. Anonymous visitors see is_public=true designs as
-- demos; the owner sees everything (public + private). Default TRUE so every
-- existing showcase diagram stays visible; the owner privatizes specific ones.
ALTER TABLE system_designs ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT true;

-- Backfill any pre-existing rows to public (they are showcase diagrams).
UPDATE system_designs SET is_public = true WHERE is_public IS NULL;

CREATE INDEX IF NOT EXISTS idx_system_designs_public ON system_designs (is_public) WHERE is_public = true;

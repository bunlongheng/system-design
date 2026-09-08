-- Soft delete: a deleted diagram goes to trash instead of vanishing, so a bad
-- cleanup is always recoverable. Every read path filters deleted_at IS NULL.
ALTER TABLE system_designs ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- Optional note on why a diagram was edited or trashed. Never required - any
-- diagram is editable at any age - but when a caller gives one it is kept here,
-- so a backfill leaves a trail rather than a silent rewrite.
ALTER TABLE system_designs ADD COLUMN IF NOT EXISTS update_reason text;

-- Trash listings and the "not deleted" filter both hit this.
CREATE INDEX IF NOT EXISTS system_designs_deleted_at_idx ON system_designs (deleted_at);

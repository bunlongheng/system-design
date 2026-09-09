-- What the owner had open on this diagram: which side panel, which badge style.
-- Reopening a diagram should put you back exactly where you left it rather than
-- resetting to a bare canvas, so the panel state travels with the row.
ALTER TABLE system_designs ADD COLUMN IF NOT EXISTS view_state jsonb;

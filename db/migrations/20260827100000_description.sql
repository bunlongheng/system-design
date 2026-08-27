-- A one-paragraph goal/description shown on the diagram detail view alongside a
-- step-by-step walkthrough (the steps are derived from the edges).
ALTER TABLE system_designs ADD COLUMN IF NOT EXISTS description text;

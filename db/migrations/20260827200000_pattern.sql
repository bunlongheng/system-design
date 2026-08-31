-- A one-line "what this really tests" tag - the architecture pattern the diagram
-- teaches (fan-out, idempotency, CDN read path, geospatial matching, ...). Shown
-- at the top of the detail view, above the longer goal/description.
ALTER TABLE system_designs ADD COLUMN IF NOT EXISTS pattern text;

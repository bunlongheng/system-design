-- Difficulty rank for the demo gallery (1 = easiest). The public /demo list is
-- ordered by this ascending so visitors ramp from Bitly up to Netflix. NULL sinks
-- to the end (owner's own non-demo diagrams have no rank).
ALTER TABLE system_designs ADD COLUMN IF NOT EXISTS difficulty integer;

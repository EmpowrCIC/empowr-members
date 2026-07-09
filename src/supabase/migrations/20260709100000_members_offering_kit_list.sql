-- Empowr Members — kit list per offering (Phase 1 Step 3)
-- Free text shown on the offering detail page and in booking
-- confirmation emails (e.g. "Quad skates only — bring your own",
-- "Skate hire included, sizes C10–UK7").

alter table mem_offerings add column kit_list text;

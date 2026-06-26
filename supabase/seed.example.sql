-- Example seed — SAFE FOR A PUBLIC REPO.
--
-- Inserts ONLY a clearly-fake placeholder challenge. No candidates, no users,
-- no real challenge text. Real challenges and candidates are created in the
-- Admin page and stored in the database — never in this repository.
--
-- Run this AFTER supabase/schema.sql if you want a starter row to edit/delete.

insert into challenges (id, title, intro, criteria)
values (
  gen_random_uuid(),
  'Example challenge (edit or delete me in Admin)',
  'Placeholder. Real challenges are created in the Admin page and stored in the database — never in this repository.',
  '["Edit these in the Admin page.","Challenges live in the database, not in GitHub."]'::jsonb
);

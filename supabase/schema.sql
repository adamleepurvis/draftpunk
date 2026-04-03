-- ============================================================
-- Draft Punk — Supabase Schema
-- Run this in the Supabase SQL Editor:
-- https://supabase.com/dashboard/project/ruhxfdtnxbaozmnbsmxv/sql/new
-- ============================================================

-- ── Tables ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS chapters (
  id        UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title     TEXT NOT NULL DEFAULT 'New Chapter',
  position  INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS scenes (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  chapter_id UUID NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
  title      TEXT NOT NULL DEFAULT 'New Scene',
  content    TEXT NOT NULL DEFAULT '',
  position   INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inbox (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  content    TEXT NOT NULL DEFAULT '',
  tags       TEXT[] DEFAULT '{}',
  photo_url  TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  promoted   BOOLEAN NOT NULL DEFAULT FALSE
);

-- ── Indexes ───────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_scenes_chapter_id ON scenes(chapter_id);
CREATE INDEX IF NOT EXISTS idx_scenes_position   ON scenes(position);
CREATE INDEX IF NOT EXISTS idx_chapters_position ON chapters(position);
CREATE INDEX IF NOT EXISTS idx_inbox_created_at  ON inbox(created_at DESC);

-- ── Row Level Security ────────────────────────────────────────
-- Single-user app with no auth — allow all operations via anon key.

ALTER TABLE chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE scenes   ENABLE ROW LEVEL SECURITY;
ALTER TABLE inbox    ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow_all_chapters" ON chapters FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_scenes"   ON scenes   FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_inbox"    ON inbox    FOR ALL TO anon USING (true) WITH CHECK (true);

-- ── Realtime ─────────────────────────────────────────────────
-- Enable realtime replication for all three tables.
-- You also need to enable Realtime in the Supabase Dashboard:
--   Database → Replication → Enable for: chapters, scenes, inbox

ALTER PUBLICATION supabase_realtime ADD TABLE chapters;
ALTER PUBLICATION supabase_realtime ADD TABLE scenes;
ALTER PUBLICATION supabase_realtime ADD TABLE inbox;

-- ── Status + color migration (run once) ──────────────────────
-- ALTER TABLE scenes   ADD COLUMN IF NOT EXISTS status TEXT;
-- ALTER TABLE scenes   ADD COLUMN IF NOT EXISTS color  TEXT;
-- ALTER TABLE chapters ADD COLUMN IF NOT EXISTS color  TEXT;

-- ── Notes migration (run once) ───────────────────────────────
-- ALTER TABLE scenes ADD COLUMN IF NOT EXISTS notes TEXT;

-- ── Trash migration (run once) ───────────────────────────────
-- ALTER TABLE chapters ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
-- ALTER TABLE scenes   ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- ── Auth migration (run after enabling auth) ─────────────────
-- Once you've enabled Supabase Auth and created a user, run this
-- to lock the database down to authenticated users only.
--
-- Steps:
--   1. Supabase Dashboard → Authentication → Providers → enable Email
--   2. Authentication → Users → Add user → set email + password
--   3. Run the SQL below:
--
-- DROP POLICY "allow_all_chapters" ON chapters;
-- DROP POLICY "allow_all_scenes"   ON scenes;
-- DROP POLICY "allow_all_inbox"    ON inbox;
--
-- CREATE POLICY "auth_chapters" ON chapters FOR ALL TO authenticated USING (true) WITH CHECK (true);
-- CREATE POLICY "auth_scenes"   ON scenes   FOR ALL TO authenticated USING (true) WITH CHECK (true);
-- CREATE POLICY "auth_inbox"    ON inbox    FOR ALL TO authenticated USING (true) WITH CHECK (true);
--
-- And for storage (run in SQL editor):
-- DROP POLICY "allow_all_inbox_photos" ON storage.objects;
-- CREATE POLICY "auth_inbox_photos" ON storage.objects FOR ALL TO authenticated
--   USING (bucket_id = 'inbox-photos') WITH CHECK (bucket_id = 'inbox-photos');

-- ── Storage ───────────────────────────────────────────────────
-- Create the inbox-photos bucket via the Supabase Dashboard:
--   Storage → New bucket → Name: "inbox-photos" → Public: ON
--
-- Then add this storage policy via the Dashboard (Storage → Policies):
--   Bucket: inbox-photos
--   Policy name: "allow_all_uploads"
--   Allowed operations: SELECT, INSERT, UPDATE, DELETE
--   Target roles: anon
--   USING expression: true
--   WITH CHECK expression: true
--
-- Or run this SQL after creating the bucket:

INSERT INTO storage.buckets (id, name, public)
VALUES ('inbox-photos', 'inbox-photos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "allow_all_inbox_photos"
  ON storage.objects FOR ALL TO anon
  USING (bucket_id = 'inbox-photos')
  WITH CHECK (bucket_id = 'inbox-photos');

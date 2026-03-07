-- Migration: add synopsis column to scenes
-- Run in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/ruhxfdtnxbaozmnbsmxv/sql/new

ALTER TABLE scenes ADD COLUMN IF NOT EXISTS synopsis TEXT DEFAULT '';

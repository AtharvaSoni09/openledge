-- Migration: Add terms acceptance and search interests to subscribers
-- Run this in your Supabase SQL Editor

ALTER TABLE subscribers ADD COLUMN IF NOT EXISTS accepted_terms_at TIMESTAMPTZ;
ALTER TABLE subscribers ADD COLUMN IF NOT EXISTS search_interests JSONB DEFAULT '[]'::jsonb;

-- Index for fast lookup
CREATE INDEX IF NOT EXISTS idx_subscribers_search_interests ON subscribers USING gin(search_interests);

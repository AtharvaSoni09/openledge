-- Starred bills table
-- Run this in your Supabase SQL Editor
CREATE TABLE IF NOT EXISTS starred_bills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subscriber_id UUID NOT NULL REFERENCES subscribers(id) ON DELETE CASCADE,
    legislation_id UUID NOT NULL REFERENCES legislation(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(subscriber_id, legislation_id)
);

CREATE INDEX IF NOT EXISTS idx_starred_bills_subscriber ON starred_bills(subscriber_id);

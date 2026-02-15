-- Bill status tracking — run in Supabase SQL Editor
-- Adds status tracking columns to legislation and update highlighting to starred_bills

-- 1. Add status columns to legislation
ALTER TABLE legislation ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Introduced';
ALTER TABLE legislation ADD COLUMN IF NOT EXISTS status_date TEXT;
ALTER TABLE legislation ADD COLUMN IF NOT EXISTS status_changed_at TIMESTAMPTZ;

-- 2. Add has_update flag to starred_bills (highlight when a tracked bill changes status)
ALTER TABLE starred_bills ADD COLUMN IF NOT EXISTS has_update BOOLEAN DEFAULT false;
ALTER TABLE starred_bills ADD COLUMN IF NOT EXISTS last_status TEXT;

-- 3. Backfill status from latest_action for existing bills
UPDATE legislation
SET
  status = CASE
    WHEN latest_action->>'text' ILIKE '%became public law%' THEN 'Signed into Law'
    WHEN latest_action->>'text' ILIKE '%passed%senate%' OR latest_action->>'text' ILIKE '%passed senate%' THEN 'Passed Senate'
    WHEN latest_action->>'text' ILIKE '%passed%house%' OR latest_action->>'text' ILIKE '%passed house%' THEN 'Passed House'
    WHEN latest_action->>'text' ILIKE '%passed%' THEN 'Passed'
    WHEN latest_action->>'text' ILIKE '%signed by%president%' THEN 'Sent to President'
    WHEN latest_action->>'text' ILIKE '%received in the senate%' THEN 'Received in Senate'
    WHEN latest_action->>'text' ILIKE '%received in the house%' THEN 'Received in House'
    WHEN latest_action->>'text' ILIKE '%placed on%calendar%' THEN 'On Calendar'
    WHEN latest_action->>'text' ILIKE '%reported%committee%' OR latest_action->>'text' ILIKE '%ordered to be reported%' THEN 'Reported by Committee'
    WHEN latest_action->>'text' ILIKE '%referred to%' THEN 'Referred to Committee'
    WHEN latest_action->>'text' ILIKE '%introduced%' THEN 'Introduced'
    ELSE 'Introduced'
  END,
  status_date = latest_action->>'actionDate',
  status_changed_at = NOW()
WHERE latest_action IS NOT NULL;

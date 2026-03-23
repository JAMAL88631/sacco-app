-- Optional but recommended: track exact rejection time for 12-hour visibility logic
ALTER TABLE loans
ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ;

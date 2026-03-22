-- Run this SQL in Supabase to enable role-based auth.

ALTER TABLE members
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE members
ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'member';

UPDATE members
SET role = CASE
  WHEN COALESCE(is_admin, FALSE) = TRUE THEN 'admin'
  ELSE 'member'
END
WHERE role IS NULL OR role NOT IN ('admin', 'member');

ALTER TABLE members
DROP CONSTRAINT IF EXISTS members_role_check;

ALTER TABLE members
ADD CONSTRAINT members_role_check CHECK (role IN ('admin', 'member'));

CREATE INDEX IF NOT EXISTS members_role_idx ON members(role);

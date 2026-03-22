-- Run this SQL in Supabase to enable notifications.

ALTER TABLE members
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id UUID REFERENCES members(id) ON DELETE CASCADE,
  created_by UUID REFERENCES members(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notification_reads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id UUID NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(notification_id, member_id)
);

CREATE INDEX IF NOT EXISTS notifications_recipient_idx ON notifications(recipient_id);
CREATE INDEX IF NOT EXISTS notifications_created_at_idx ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS notification_reads_member_idx ON notification_reads(member_id);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_reads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view members for notifications" ON members;
CREATE POLICY "Admins can view members for notifications" ON members
FOR SELECT USING (
  auth.uid() = id
  OR EXISTS (
    SELECT 1
    FROM members AS current_member
    WHERE current_member.id = auth.uid() AND current_member.is_admin = TRUE
  )
);

DROP POLICY IF EXISTS "Members can view their notifications" ON notifications;
CREATE POLICY "Members can view their notifications" ON notifications
FOR SELECT USING (
  recipient_id IS NULL OR recipient_id = auth.uid()
);

DROP POLICY IF EXISTS "Admins can insert notifications" ON notifications;
CREATE POLICY "Admins can insert notifications" ON notifications
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1
    FROM members
    WHERE members.id = auth.uid() AND members.is_admin = TRUE
  )
);

DROP POLICY IF EXISTS "Members can view their notification reads" ON notification_reads;
CREATE POLICY "Members can view their notification reads" ON notification_reads
FOR SELECT USING (member_id = auth.uid());

DROP POLICY IF EXISTS "Members can insert their notification reads" ON notification_reads;
CREATE POLICY "Members can insert their notification reads" ON notification_reads
FOR INSERT WITH CHECK (member_id = auth.uid());

DROP POLICY IF EXISTS "Members can update their notification reads" ON notification_reads;
CREATE POLICY "Members can update their notification reads" ON notification_reads
FOR UPDATE USING (member_id = auth.uid());

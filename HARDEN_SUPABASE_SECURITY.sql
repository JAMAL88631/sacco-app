-- Apply this after your base tables exist.
-- It keeps browser access read-only for members and moves sensitive writes to server APIs.

ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_reads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own profile" ON members;
DROP POLICY IF EXISTS "Users can update their own profile" ON members;
DROP POLICY IF EXISTS "Users can insert their profile" ON members;
DROP POLICY IF EXISTS "Admins can view members for notifications" ON members;

CREATE POLICY "Members can view only their own profile" ON members
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "System can create the current member profile" ON members
  FOR INSERT WITH CHECK (
    auth.uid() = id
    AND COALESCE(role, 'member') = 'member'
    AND COALESCE(is_admin, FALSE) = FALSE
    AND COALESCE(savings, 0) = 0
  );

DROP POLICY IF EXISTS "Users can view their own loans" ON loans;
DROP POLICY IF EXISTS "Users can insert loans" ON loans;
DROP POLICY IF EXISTS "Users can update their loans" ON loans;

CREATE POLICY "Members can view only their own loans" ON loans
  FOR SELECT USING (auth.uid() = member_id);

DROP POLICY IF EXISTS "Users can view their own transactions" ON transactions;
DROP POLICY IF EXISTS "Users can insert transactions" ON transactions;

CREATE POLICY "Members can view only their own transactions" ON transactions
  FOR SELECT USING (auth.uid() = member_id);

DROP POLICY IF EXISTS "Members can view their notifications" ON notifications;
DROP POLICY IF EXISTS "Admins can insert notifications" ON notifications;

CREATE POLICY "Members can view their notifications" ON notifications
  FOR SELECT USING (
    recipient_id IS NULL OR recipient_id = auth.uid()
  );

CREATE POLICY "Admins can insert notifications" ON notifications
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1
      FROM members
      WHERE members.id = auth.uid() AND members.is_admin = TRUE
    )
  );

DROP POLICY IF EXISTS "Members can view their notification reads" ON notification_reads;
DROP POLICY IF EXISTS "Members can insert their notification reads" ON notification_reads;
DROP POLICY IF EXISTS "Members can update their notification reads" ON notification_reads;

CREATE POLICY "Members can view their notification reads" ON notification_reads
  FOR SELECT USING (member_id = auth.uid());

CREATE POLICY "Members can insert their notification reads" ON notification_reads
  FOR INSERT WITH CHECK (member_id = auth.uid());

CREATE POLICY "Members can update their notification reads" ON notification_reads
  FOR UPDATE USING (member_id = auth.uid());

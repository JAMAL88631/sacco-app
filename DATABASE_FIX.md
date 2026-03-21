# Database Setup - Corrected Schema

## ERROR FIX: "could not find the created_at column"

This error means the members table is missing the `created_at` column. Use this corrected SQL:

## Option 1: Create Tables Fresh (Recommended)

Go to Supabase SQL Editor and paste this:

```sql
-- DROP old tables if they exist
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS loans CASCADE;
DROP TABLE IF EXISTS members CASCADE;

-- Create members table
CREATE TABLE members (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  phone_number TEXT,
  savings NUMERIC(15, 2) DEFAULT 0,
  loans_taken NUMERIC(15, 2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create loans table
CREATE TABLE loans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  amount NUMERIC(15, 2) NOT NULL,
  purpose TEXT,
  status TEXT DEFAULT 'pending',
  repaid NUMERIC(15, 2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  approved_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Create transactions table
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  amount NUMERIC(15, 2) NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Enable Row Level Security
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies
CREATE POLICY "Users can view their own profile" ON members
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON members
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their profile" ON members
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can view their own loans" ON loans
  FOR SELECT USING (auth.uid() = member_id);

CREATE POLICY "Users can insert loans" ON loans
  FOR INSERT WITH CHECK (auth.uid() = member_id);

CREATE POLICY "Users can update their loans" ON loans
  FOR UPDATE USING (auth.uid() = member_id);

CREATE POLICY "Users can view their own transactions" ON transactions
  FOR SELECT USING (auth.uid() = member_id);

CREATE POLICY "Users can insert transactions" ON transactions
  FOR INSERT WITH CHECK (auth.uid() = member_id);
```

## Option 2: Add Missing Column (If tables already exist)

If you already have the members table, add the missing column:

```sql
ALTER TABLE members ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE members ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
```

## Steps:

1. Go to **supabase.io**
2. Open your project
3. Click **SQL Editor**
4. Click **+ New Query**
5. Copy & paste the SQL above
6. Click **Run**
7. Check that all 3 tables appear in **Tables** section
8. Verify all 9 RLS policies are created

## Test:

1. Refresh browser: http://localhost:3000
2. Sign up with test account
3. Should see dashboard without errors

## If Still Error:

- Clear browser cache (Ctrl+Shift+Del)
- Check Supabase Tables section to verify columns exist
- Check RLS Policies exist
- Open browser console (F12) for error details

# SACCO App - Quick Database Setup

## Error: "Error loading members data"

This happens when the database tables don't exist. Follow these steps:

## Setup Instructions

### 1. Go to Supabase
- Visit: https://supabase.io
- Sign in to your account
- Open your project

### 2. Go to SQL Editor
- Click on "SQL Editor" in the left sidebar
- Click "+ New Query"

### 3. Copy and Paste This SQL

```sql
-- Create members table
CREATE TABLE IF NOT EXISTS members (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  phone_number TEXT,
  savings DECIMAL(15, 2) DEFAULT 0,
  loans_taken DECIMAL(15, 2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create loans table
CREATE TABLE IF NOT EXISTS loans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  amount DECIMAL(15, 2) NOT NULL,
  purpose TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'active', 'completed', 'rejected')),
  repaid DECIMAL(15, 2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  approved_at TIMESTAMP,
  completed_at TIMESTAMP
);

-- Create transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('deposit', 'withdrawal', 'loan_repayment', 'loan_disbursement')),
  amount DECIMAL(15, 2) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Enable Row Level Security
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies for members
DROP POLICY IF EXISTS "Users can view their own profile" ON members;
CREATE POLICY "Users can view their own profile" ON members
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON members;
CREATE POLICY "Users can update their own profile" ON members
  FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert their profile" ON members;
CREATE POLICY "Users can insert their profile" ON members
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Create RLS Policies for loans
DROP POLICY IF EXISTS "Users can view their own loans" ON loans;
CREATE POLICY "Users can view their own loans" ON loans
  FOR SELECT USING (auth.uid() = member_id);

DROP POLICY IF EXISTS "Users can insert loans" ON loans;
CREATE POLICY "Users can insert loans" ON loans
  FOR INSERT WITH CHECK (auth.uid() = member_id);

DROP POLICY IF EXISTS "Users can update their loans" ON loans;
CREATE POLICY "Users can update their loans" ON loans
  FOR UPDATE USING (auth.uid() = member_id);

-- Create RLS Policies for transactions
DROP POLICY IF EXISTS "Users can view their own transactions" ON transactions;
CREATE POLICY "Users can view their own transactions" ON transactions
  FOR SELECT USING (auth.uid() = member_id);

DROP POLICY IF EXISTS "Users can insert transactions" ON transactions;
CREATE POLICY "Users can insert transactions" ON transactions
  FOR INSERT WITH CHECK (auth.uid() = member_id);
```

### 4. Click "Run"

You should see success messages for each creation statement.

### 5. Verify Tables Were Created

- Go to "Tables" in the left sidebar
- You should see:
  - `members`
  - `loans`
  - `transactions`

### 6. Test the App

- Refresh your browser: http://localhost:3000
- Sign up with a test account
- You should now be able to access the dashboard!

## If Still Getting Errors

### Check 1: Browser Console
- Press `F12` to open Developer Tools
- Click "Console" tab
- Look for error messages

### Check 2: Supabase Logs
- In Supabase, go to "Logs" → "Edge Functions"
- Look for errors from your calls

### Check 3: RLS Policies
- In Supabase, go to "Authentication" → "Policies"
- Make sure all 9 policies appear:
  - 3 for members
  - 3 for loans
  - 3 for transactions

### Check 4: Try Again
- Clear browser cache: Ctrl+Shift+Del
- Refresh the page
- Try signing up again

## Still Not Working?

1. Make sure Supabase URL is correct in `lib/supabaseClient.js`
2. Make sure the Anon Key is correct
3. Check that auth is enabled in your Supabase project
4. Verify all tables exist and have correct names

## Success Indicators

✅ You see the Login/Signup page  
✅ You can create an account  
✅ You see the Dashboard after login  
✅ Deposits/withdrawals work  
✅ Loans work  

If you see all of these, your setup is complete!

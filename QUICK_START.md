# SACCO App - Quick Start Guide

## ⚡ Get Started in 5 Minutes

### Step 1: Install & Run
```bash
cd c:\Users\PC\Desktop\sacco-app
npm install
npm run dev
```

### Step 2: Set Up Database (Supabase)

Go to [supabase.io](https://supabase.io) and create a project, then:

**Copy & paste this SQL into Supabase SQL Editor:**

```sql
-- Create members table
CREATE TABLE members (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  phone_number TEXT,
  savings DECIMAL(15, 2) DEFAULT 0,
  loans_taken DECIMAL(15, 2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create loans table
CREATE TABLE loans (
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
CREATE TABLE transactions (
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
CREATE POLICY "Users can view their own profile" ON members
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON members
  FOR UPDATE USING (auth.uid() = id);

-- Create RLS Policies for loans
CREATE POLICY "Users can view their own loans" ON loans
  FOR SELECT USING (auth.uid() = member_id);

CREATE POLICY "Users can insert loans" ON loans
  FOR INSERT WITH CHECK (auth.uid() = member_id);

CREATE POLICY "Users can update their loans" ON loans
  FOR UPDATE USING (auth.uid() = member_id);

-- Create RLS Policies for transactions
CREATE POLICY "Users can view their own transactions" ON transactions
  FOR SELECT USING (auth.uid() = member_id);

CREATE POLICY "Users can insert transactions" ON transactions
  FOR INSERT WITH CHECK (auth.uid() = member_id);
```

### Step 3: Open Browser
Visit: **http://localhost:3000**

### Step 4: Create Account & Test

1. **Sign Up**
   - Email: test@example.com
   - Password: password123
   - Name: Test User
   - Phone: 1234567890

2. **Test Savings**
   - Click "Savings" tab
   - Deposit: 5000
   - Withdraw: 1000

3. **Test Loans**
   - Click "Loans" tab
   - Apply for: 10000 KES
   - Purpose: Emergency
   - Make Payment: 2000 KES

## File Overview

| File | Purpose |
|------|---------|
| `pages/auth.js` | Login & Sign Up pages |
| `pages/memberDashboard.js` | Main dashboard with all features |
| `pages/index.js` | Redirects to /auth |
| `lib/supabaseClient.js` | Database connection |
| `DATABASE_SETUP.md` | Detailed database schema |
| `README_SETUP.md` | Full documentation |

## Key Features

✅ Sign up with email & password  
✅ Deposit & withdraw savings  
✅ Apply for loans  
✅ Repay loans with progress tracking  
✅ View transaction history  
✅ Mobile-responsive design  
✅ Real-time updates  

## Common Commands

| Command | What it does |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm start` | Run production build |
| `npm run lint` | Check code quality |

## Need Help?

1. Check `DATABASE_SETUP.md` for database issues
2. Check `README_SETUP.md` for feature documentation
3. Verify Supabase credentials in `lib/supabaseClient.js`
4. Ensure all database tables are created

## Next Steps

- ✅ Database is set up
- ✅ App is running
- ✅ Create an account
- ✅ Test all features
- Optional: Deploy to Vercel for production

Enjoy! 🎉

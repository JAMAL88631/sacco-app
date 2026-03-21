# SACCO App - Database Setup Guide

## Overview
The SACCO app uses Supabase as the backend. This guide will help you set up all required tables and their structure.

## Database Tables

### 1. Members Table
Create a table called `members` with the following columns:

```sql
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
```

### 2. Loans Table
Create a table called `loans` with the following columns:

```sql
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
```

### 3. Transactions Table
Create a table called `transactions` with the following columns:

```sql
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('deposit', 'withdrawal', 'loan_repayment', 'loan_disbursement')),
  amount DECIMAL(15, 2) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Setup Instructions

### Step 1: Access Supabase
1. Go to [supabase.io](https://supabase.io)
2. Sign in to your project
3. Navigate to the SQL Editor

### Step 2: Create Tables
1. Copy and paste each SQL statement above into the SQL Editor
2. Click "Run" to execute each statement
3. Verify that all tables are created in the "Tables" section

### Step 3: Enable Row Level Security (RLS)
1. Navigate to the "Authentication" section
2. Enable Row Level Security for each table
3. Create policies to allow users to see only their own data:

```sql
-- Policies for members table
CREATE POLICY "Users can view their own profile" ON members
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON members
  FOR UPDATE USING (auth.uid() = id);

-- Policies for loans table
CREATE POLICY "Users can view their own loans" ON loans
  FOR SELECT USING (auth.uid() = member_id);

CREATE POLICY "Users can insert loans" ON loans
  FOR INSERT WITH CHECK (auth.uid() = member_id);

CREATE POLICY "Users can update their loans" ON loans
  FOR UPDATE USING (auth.uid() = member_id);

-- Policies for transactions table
CREATE POLICY "Users can view their own transactions" ON transactions
  FOR SELECT USING (auth.uid() = member_id);

CREATE POLICY "Users can insert transactions" ON transactions
  FOR INSERT WITH CHECK (auth.uid() = member_id);
```

## Supabase Configuration

The app already has your Supabase credentials configured in:
- `lib/supabaseClient.js`

You can update these if needed:
- **Supabase URL**: Your project's public URL from Project Settings > API
- **Anon Key**: Your public anon key from Project Settings > API

## Features Implemented

✅ User Authentication (Sign Up & Login)
✅ Member Profile Management
✅ Savings Management (Deposit & Withdraw)
✅ Loan Application
✅ Loan Repayment Tracking
✅ Transaction History
✅ Dashboard with Overview, Savings, Loans, and Transactions tabs
✅ Responsive Design with Tailwind CSS
✅ Error Handling and Validation

## Running the App

```bash
npm install
npm run dev
```

Visit `http://localhost:3000` and navigate to the login/signup page.

## Testing the App

1. **Sign Up**: Create a new account with email, password, name, and phone
2. **Make Deposits**: Add funds to your savings
3. **Apply for Loans**: Request a loan for emergencies, business, etc.
4. **Make Withdrawals**: Withdraw from your savings
5. **Repay Loans**: Make loan payments and track progress
6. **View Transactions**: Check your transaction history in the Transactions tab

## Troubleshooting

- **Auth errors**: Check that auth is enabled in Supabase
- **Table not found**: Ensure all tables are created with exact names
- **RLS issues**: Make sure policies allow proper access
- **CORS errors**: Verify Supabase URL and keys are correct in supabaseClient.js

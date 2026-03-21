-- Run this SQL in Supabase to create the correct tables with proper column types

-- Drop existing tables if they have wrong schema (CAREFUL: this deletes data!)
-- DROP TABLE IF EXISTS transactions CASCADE;
-- DROP TABLE IF EXISTS loans CASCADE;
-- DROP TABLE IF EXISTS members CASCADE;

-- Create members table
CREATE TABLE IF NOT EXISTS members (
  id UUID PRIMARY KEY,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  savings NUMERIC DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create loans table with member_id as UUID (TEXT type for Supabase)
CREATE TABLE IF NOT EXISTS loans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  purpose TEXT,
  status TEXT DEFAULT 'pending',
  repaid NUMERIC DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create transactions table with member_id as UUID (TEXT type)
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS loans_member_id_idx ON loans(member_id);
CREATE INDEX IF NOT EXISTS transactions_member_id_idx ON transactions(member_id);

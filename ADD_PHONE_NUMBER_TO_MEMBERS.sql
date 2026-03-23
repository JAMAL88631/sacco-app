-- Run once in Supabase SQL Editor to support profile completion details.
ALTER TABLE members
ADD COLUMN IF NOT EXISTS phone_number TEXT;

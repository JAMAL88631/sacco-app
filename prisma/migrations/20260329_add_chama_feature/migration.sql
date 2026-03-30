CREATE TABLE IF NOT EXISTS savings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  amount NUMERIC(12, 2) NOT NULL,
  savings_type TEXT NOT NULL DEFAULT 'REGULAR',
  locked BOOLEAN NOT NULL DEFAULT FALSE,
  unlock_date TIMESTAMP,
  source TEXT,
  reference_id UUID,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS savings_member_id_idx ON savings(member_id);
CREATE INDEX IF NOT EXISTS savings_reference_id_idx ON savings(reference_id);

CREATE TABLE IF NOT EXISTS chamas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  created_by UUID NOT NULL REFERENCES members(id) ON DELETE RESTRICT,
  contribution_amount NUMERIC(12, 2) NOT NULL DEFAULT 500,
  savings_amount NUMERIC(12, 2) NOT NULL DEFAULT 50,
  total_amount_due NUMERIC(12, 2) NOT NULL DEFAULT 550,
  start_date TIMESTAMP NOT NULL DEFAULT date_trunc('month', CURRENT_TIMESTAMP),
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS chama_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chama_id UUID NOT NULL REFERENCES chamas(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  cycle_number INTEGER NOT NULL,
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chama_members_chama_member_unique UNIQUE (chama_id, member_id),
  CONSTRAINT chama_members_chama_cycle_unique UNIQUE (chama_id, cycle_number)
);

CREATE INDEX IF NOT EXISTS chama_members_member_id_idx ON chama_members(member_id);

CREATE TABLE IF NOT EXISTS chama_cycles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chama_id UUID NOT NULL REFERENCES chamas(id) ON DELETE CASCADE,
  cycle_number INTEGER NOT NULL,
  cycle_month DATE NOT NULL,
  payout_member_id UUID REFERENCES members(id) ON DELETE SET NULL,
  payout_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'OPEN',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  closed_at TIMESTAMP,
  CONSTRAINT chama_cycles_chama_cycle_unique UNIQUE (chama_id, cycle_number),
  CONSTRAINT chama_cycles_chama_month_unique UNIQUE (chama_id, cycle_month)
);

CREATE INDEX IF NOT EXISTS chama_cycles_payout_member_id_idx ON chama_cycles(payout_member_id);

CREATE TABLE IF NOT EXISTS chama_contributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chama_id UUID NOT NULL REFERENCES chamas(id) ON DELETE CASCADE,
  cycle_id UUID NOT NULL REFERENCES chama_cycles(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  payment_month DATE NOT NULL,
  amount_paid NUMERIC(12, 2) NOT NULL,
  chama_amount NUMERIC(12, 2) NOT NULL,
  savings_amount NUMERIC(12, 2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'PAID',
  paid_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  savings_entry_id UUID UNIQUE REFERENCES savings(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chama_contributions_cycle_member_unique UNIQUE (chama_id, cycle_id, member_id)
);

CREATE INDEX IF NOT EXISTS chama_contributions_member_id_idx ON chama_contributions(member_id);

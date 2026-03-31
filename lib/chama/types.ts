export type ChamaStatus = 'ACTIVE' | 'COMPLETED' | 'PAUSED';
export type ContributionStatus = 'paid' | 'pending';

export interface ChamaRecord {
  id: string;
  name: string;
  description: string | null;
  created_by: string;
  contribution_amount: number;
  savings_amount: number;
  total_amount_due: number;
  start_date: string;
  status: ChamaStatus;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface ChamaMemberRecord {
  id: string;
  chama_id: string;
  member_id: string;
  cycle_number: number;
  joined_at?: string | null;
}

export interface ChamaCycleRecord {
  id: string;
  chama_id: string;
  cycle_number: number;
  cycle_month: string;
  payout_member_id: string | null;
  payout_amount: number;
  status: string;
}

export interface ChamaContributionRecord {
  id: string;
  chama_id: string;
  cycle_id: string;
  member_id: string;
  payment_month: string;
  amount_paid: number;
  chama_amount: number;
  savings_amount: number;
  status: string;
  paid_at?: string | null;
}

export interface ChamaDashboardMember {
  memberId: string;
  name: string;
  email: string;
  cycleNumber: number;
  status: ContributionStatus;
}

export interface ChamaDashboardPayload {
  chama: {
    id: string;
    name: string;
    description: string | null;
    status: ChamaStatus;
  };
  currentCycleNumber: number;
  currentCycleStartAt: string | null;
  nextCycleStartAt: string | null;
  amountDue: number;
  currentCyclePaidAmount: number;
  currentCycleRemainingAmount: number;
  arrears: number;
  overdueCycles: number;
  lateFineTotal: number;
  totalOutstandingAmount: number;
  assignedCycleNumber: number;
  payoutRecipient: {
    memberId: string;
    name: string;
    email: string;
    cycleNumber: number;
  } | null;
  currentCycle: {
    id: string;
    cycleMonth: string;
    payoutAmount: number;
  } | null;
  currentUserStatus: ContributionStatus;
  totals: {
    totalMembers: number;
    totalPaidThisCycle: number;
    expectedThisCycle: number;
  };
  members: ChamaDashboardMember[];
}

export interface ChamaListItem {
  chamaId: string;
  name: string;
  status: ChamaStatus;
  assignedCycleNumber: number;
  currentCycleNumber: number;
}

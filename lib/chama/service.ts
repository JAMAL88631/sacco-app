import { createServiceClient } from '../serverAuth';
import {
  CHAMA_CONTRIBUTION_AMOUNT,
  CHAMA_LATE_FINE_AMOUNT,
  CHAMA_LOCK_PERIOD_MONTHS,
  CHAMA_LOCKED_SAVINGS_AMOUNT,
  CHAMA_MONTHLY_TOTAL,
} from './constants';
import type {
  ChamaContributionRecord,
  ChamaCycleRecord,
  ChamaDashboardMember,
  ChamaDashboardPayload,
  ChamaListItem,
  ChamaMemberRecord,
  ChamaRecord,
} from './types';

const MANDATORY_CHAMA_NAME = 'Western Sacco Union Chama';
const MANDATORY_CHAMA_DESCRIPTION = 'Automatic monthly rotational savings group for all members.';
const DEFAULT_LEGACY_CYCLE_LENGTH = 1;
const CHAMA_CYCLE_LENGTH_DAYS = 30;

function toMonthStart(value: string | Date) {
  const date = value instanceof Date ? new Date(value) : new Date(value);
  const normalized = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
  normalized.setUTCHours(0, 0, 0, 0);
  return normalized;
}

function addMonths(value: string | Date, months: number) {
  const date = toMonthStart(value);
  date.setUTCMonth(date.getUTCMonth() + months);
  return date;
}

function addDays(value: string | Date, days: number) {
  const date = value instanceof Date ? new Date(value) : new Date(value);
  date.setUTCDate(date.getUTCDate() + days);
  return date;
}

function differenceInCycleWindows(start: string | Date, end: Date) {
  const startDate = valueToDate(start);
  const endDate = valueToDate(end);
  const diffMs = endDate.getTime() - startDate.getTime();

  if (diffMs <= 0) {
    return 0;
  }

  return Math.floor(diffMs / (CHAMA_CYCLE_LENGTH_DAYS * 24 * 60 * 60 * 1000));
}

function valueToDate(value: string | Date) {
  return value instanceof Date ? new Date(value) : new Date(value);
}

function parseMoney(value: unknown) {
  return Number(value || 0);
}

function roundCurrency(value: number) {
  return Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
}

function isDuplicateError(error: unknown) {
  const code = String((error as { code?: string } | null)?.code || '');
  const message = String((error as { message?: string } | null)?.message || '').toLowerCase();
  return code === '23505' || message.includes('duplicate key');
}

function isMissingColumnError(error: unknown, columnName: string) {
  const code = String((error as { code?: string } | null)?.code || '');
  const message = String((error as { message?: string } | null)?.message || '').toLowerCase();
  const details = String((error as { details?: string } | null)?.details || '').toLowerCase();
  const column = String(columnName || '').toLowerCase();

  return (
    code === 'PGRST204' ||
    ((message.includes(column) || details.includes(column)) &&
      (message.includes('schema cache') ||
        details.includes('schema cache') ||
        message.includes('could not find') ||
        details.includes('could not find') ||
        message.includes('does not exist') ||
        details.includes('does not exist')))
  );
}

function isInvalidIntegerSyntaxError(error: unknown) {
  const message = String((error as { message?: string } | null)?.message || '').toLowerCase();
  return message.includes('invalid input syntax for type integer');
}

function getIncompatibleMembershipSchemaError() {
  return new Error(
    'Your existing chama_members table uses a legacy integer member reference and is incompatible with the current UUID-based members table. Please run the new Chama migration SQL before opening this feature.'
  );
}

function normalizeChamaRecord(record: Partial<ChamaRecord> & { id: string; name: string }) {
  return {
    id: record.id,
    name: record.name,
    description: record.description ?? null,
    created_by: record.created_by ?? '',
    contribution_amount: parseMoney(record.contribution_amount) || CHAMA_CONTRIBUTION_AMOUNT,
    savings_amount: parseMoney(record.savings_amount) || CHAMA_LOCKED_SAVINGS_AMOUNT,
    total_amount_due: parseMoney(record.total_amount_due) || CHAMA_MONTHLY_TOTAL,
    start_date: record.start_date || toMonthStart(new Date()).toISOString(),
    status: (record.status as ChamaRecord['status']) || 'ACTIVE',
    created_at: record.created_at ?? null,
    updated_at: record.updated_at ?? null,
  } satisfies ChamaRecord;
}

function normalizeChamaMemberRecord(record: {
  id: string;
  chama_id?: string;
  member_id?: string;
  user_id?: string;
  cycle_number?: number;
  joined_at?: string | null;
}) {
  return {
    id: record.id,
    chama_id: record.chama_id || '',
    member_id: record.member_id || record.user_id || '',
    cycle_number: Number(record.cycle_number || 0),
    joined_at: record.joined_at ?? null,
  } satisfies ChamaMemberRecord;
}

async function fetchMembershipByMember(
  serviceClient: ReturnType<typeof createServiceClient>,
  chamaId: string,
  memberId: string
) {
  const selectVariants = [
    { selectClause: 'id, chama_id, member_id, cycle_number, joined_at', memberColumn: 'member_id' },
    { selectClause: 'id, chama_id, user_id, cycle_number, joined_at', memberColumn: 'user_id' },
  ] as const;

  for (const variant of selectVariants) {
    const result = await serviceClient
      .from('chama_members')
      .select(variant.selectClause)
      .eq('chama_id', chamaId)
      .eq(variant.memberColumn, memberId)
      .maybeSingle();

    if (!result.error) {
      return result.data ? normalizeChamaMemberRecord(result.data as never) : null;
    }

    if (isInvalidIntegerSyntaxError(result.error)) {
      throw getIncompatibleMembershipSchemaError();
    }

    const retryableSchemaIssue =
      isMissingColumnError(result.error, 'member_id') || isMissingColumnError(result.error, 'user_id');

    if (!retryableSchemaIssue) {
      throw result.error;
    }
  }

  throw new Error('Could not read the chama member record with the available schema.');
}

async function fetchAllMemberships(serviceClient: ReturnType<typeof createServiceClient>, chamaId: string) {
  const selectVariants = [
    'id, chama_id, member_id, cycle_number, joined_at',
    'id, chama_id, user_id, cycle_number, joined_at',
  ];

  for (const selectClause of selectVariants) {
    const result = await serviceClient
      .from('chama_members')
      .select(selectClause)
      .eq('chama_id', chamaId)
      .order('cycle_number', { ascending: true });

    if (!result.error) {
      return (result.data || []).map((item) => normalizeChamaMemberRecord(item as never));
    }

    const retryableSchemaIssue =
      isMissingColumnError(result.error, 'member_id') || isMissingColumnError(result.error, 'user_id');

    if (!retryableSchemaIssue) {
      throw result.error;
    }
  }

  throw new Error('Could not read chama members with the available schema.');
}

async function insertMembership(
  serviceClient: ReturnType<typeof createServiceClient>,
  chamaId: string,
  memberId: string,
  cycleNumber: number
) {
  const variants = [
    {
      payload: { chama_id: chamaId, member_id: memberId, cycle_number: cycleNumber },
      selectClause: 'id, chama_id, member_id, cycle_number, joined_at',
    },
    {
      payload: { chama_id: chamaId, user_id: memberId, cycle_number: cycleNumber },
      selectClause: 'id, chama_id, user_id, cycle_number, joined_at',
    },
  ];

  for (const variant of variants) {
    const result = await serviceClient
      .from('chama_members')
      .insert([variant.payload])
      .select(variant.selectClause)
      .single();

    if (result.data) {
      return normalizeChamaMemberRecord(result.data as never);
    }

    if (result.error && !isDuplicateError(result.error)) {
      if (isInvalidIntegerSyntaxError(result.error)) {
        throw getIncompatibleMembershipSchemaError();
      }

      const retryableSchemaIssue =
        isMissingColumnError(result.error, 'member_id') || isMissingColumnError(result.error, 'user_id');

      if (!retryableSchemaIssue) {
        throw result.error;
      }
    }
  }

  return null;
}

async function fetchChamaByName(serviceClient: ReturnType<typeof createServiceClient>, name: string) {
  const selectVariants = [
    'id, name, description, created_by, contribution_amount, savings_amount, total_amount_due, start_date, status, created_at, updated_at',
    'id, name, description, created_by, start_date, status, created_at',
    'id, name, created_by, start_date, status, created_at',
    'id, name, created_at',
    'id, name',
  ];

  for (const selectClause of selectVariants) {
    const result = await serviceClient
      .from('chamas')
      .select(selectClause)
      .eq('name', name)
      .limit(5);

    if (!result.error) {
      const firstMatch = Array.isArray(result.data) ? result.data[0] : null;
      return firstMatch
        ? normalizeChamaRecord(firstMatch as Partial<ChamaRecord> & { id: string; name: string })
        : null;
    }

    const isSchemaShapeIssue =
      isMissingColumnError(result.error, 'description') ||
      isMissingColumnError(result.error, 'created_by') ||
      isMissingColumnError(result.error, 'contribution_amount') ||
      isMissingColumnError(result.error, 'savings_amount') ||
      isMissingColumnError(result.error, 'total_amount_due') ||
      isMissingColumnError(result.error, 'start_date') ||
      isMissingColumnError(result.error, 'status') ||
      isMissingColumnError(result.error, 'updated_at');

    if (!isSchemaShapeIssue) {
      throw result.error;
    }
  }

  throw new Error('Could not read the chama record with the available schema.');
}

async function getMandatoryChama(memberId: string) {
  const serviceClient = createServiceClient();
  let existingChama: ChamaRecord | null = null;

  try {
    existingChama = await fetchChamaByName(serviceClient, MANDATORY_CHAMA_NAME);
  } catch (error) {
    throw new Error(`Could not read the mandatory chama: ${(error as Error).message || 'unknown error'}`);
  }

  if (existingChama) {
    return existingChama;
  }

  const { data: createdChama, error: createError } = await serviceClient
    .from('chamas')
    .insert([
      {
        name: MANDATORY_CHAMA_NAME,
        description: MANDATORY_CHAMA_DESCRIPTION,
        created_by: memberId,
        cycle_length: DEFAULT_LEGACY_CYCLE_LENGTH,
        contribution_amount: CHAMA_CONTRIBUTION_AMOUNT,
        savings_amount: CHAMA_LOCKED_SAVINGS_AMOUNT,
        total_amount_due: CHAMA_MONTHLY_TOTAL,
        start_date: toMonthStart(new Date()).toISOString(),
        status: 'ACTIVE',
      },
    ])
    .select('id, name, description, created_by, contribution_amount, savings_amount, total_amount_due, start_date, status, created_at, updated_at')
    .single();

  if (createError && !isDuplicateError(createError)) {
    const insertVariants = [
      {
        payload: {
          name: MANDATORY_CHAMA_NAME,
          description: MANDATORY_CHAMA_DESCRIPTION,
          created_by: memberId,
          cycle_length: DEFAULT_LEGACY_CYCLE_LENGTH,
          start_date: toMonthStart(new Date()).toISOString(),
          status: 'ACTIVE',
        },
        selectClause: 'id, name, description, created_by, start_date, status, created_at',
      },
      {
        payload: {
          name: MANDATORY_CHAMA_NAME,
          created_by: memberId,
          cycle_length: DEFAULT_LEGACY_CYCLE_LENGTH,
          start_date: toMonthStart(new Date()).toISOString(),
          status: 'ACTIVE',
        },
        selectClause: 'id, name, created_by, start_date, status, created_at',
      },
      {
        payload: {
          name: MANDATORY_CHAMA_NAME,
          created_by: memberId,
          cycle_length: DEFAULT_LEGACY_CYCLE_LENGTH,
        },
        selectClause: 'id, name, created_by, created_at',
      },
      {
        payload: {
          name: MANDATORY_CHAMA_NAME,
          cycle_length: DEFAULT_LEGACY_CYCLE_LENGTH,
        },
        selectClause: 'id, name, created_at',
      },
      {
        payload: {
          name: MANDATORY_CHAMA_NAME,
          cycle_length: DEFAULT_LEGACY_CYCLE_LENGTH,
        },
        selectClause: 'id, name',
      },
    ];

    const isSchemaShapeIssue =
      isMissingColumnError(createError, 'description') ||
      isMissingColumnError(createError, 'created_by') ||
      isMissingColumnError(createError, 'contribution_amount') ||
      isMissingColumnError(createError, 'savings_amount') ||
      isMissingColumnError(createError, 'total_amount_due') ||
      isMissingColumnError(createError, 'cycle_length') ||
      isMissingColumnError(createError, 'start_date') ||
      isMissingColumnError(createError, 'status') ||
      isMissingColumnError(createError, 'updated_at');

    if (!isSchemaShapeIssue) {
      throw createError;
    }

    for (const variant of insertVariants) {
      const fallbackCreate = await serviceClient.from('chamas').insert([variant.payload]).select(variant.selectClause).single();

      if (fallbackCreate.data) {
        return normalizeChamaRecord(fallbackCreate.data as Partial<ChamaRecord> & { id: string; name: string });
      }

      if (fallbackCreate.error && !isDuplicateError(fallbackCreate.error)) {
        const retryableSchemaIssue =
          isMissingColumnError(fallbackCreate.error, 'description') ||
          isMissingColumnError(fallbackCreate.error, 'created_by') ||
          isMissingColumnError(fallbackCreate.error, 'start_date') ||
          isMissingColumnError(fallbackCreate.error, 'status');

        if (!retryableSchemaIssue) {
          throw new Error(fallbackCreate.error.message || 'Fallback create failed.');
        }
      }
    }
  }

  if (createdChama) {
    return normalizeChamaRecord(createdChama as Partial<ChamaRecord> & { id: string; name: string });
  }

  let refetchedChama: ChamaRecord | null = null;
  try {
    refetchedChama = await fetchChamaByName(serviceClient, MANDATORY_CHAMA_NAME);
  } catch (error) {
    throw new Error(`Mandatory chama was not readable after create: ${(error as Error).message || 'unknown error'}`);
  }

  if (!refetchedChama) {
    throw new Error('Mandatory chama create appeared to succeed, but no readable chama row could be found afterward.');
  }

  return refetchedChama;
}

async function ensureMandatoryMembership(memberId: string) {
  const serviceClient = createServiceClient();
  const mandatoryChama = await getMandatoryChama(memberId);

  const existingMembership = await fetchMembershipByMember(serviceClient, mandatoryChama.id, memberId);

  if (existingMembership) {
    return {
      chama: mandatoryChama,
      membership: existingMembership,
    };
  }

  const { data: currentMembers, error: currentMembersError } = await serviceClient
    .from('chama_members')
    .select('cycle_number')
    .eq('chama_id', mandatoryChama.id)
    .order('cycle_number', { ascending: false })
    .limit(1);

  if (currentMembersError) {
    throw currentMembersError;
  }

  const nextCycleNumber = Number(currentMembers?.[0]?.cycle_number || 0) + 1;
  const createdMembership = await insertMembership(serviceClient, mandatoryChama.id, memberId, nextCycleNumber);

  if (createdMembership) {
    return {
      chama: mandatoryChama,
      membership: createdMembership,
    };
  }

  const refetchedMembership = await fetchMembershipByMember(serviceClient, mandatoryChama.id, memberId);

  if (!refetchedMembership) {
    throw new Error('Could not provision mandatory chama membership.');
  }

  return {
    chama: mandatoryChama,
    membership: refetchedMembership,
  };
}

async function getChamaMembers(chamaId: string) {
  const serviceClient = createServiceClient();
  return fetchAllMemberships(serviceClient, chamaId);
}

async function getMembersByIds(memberIds: string[]) {
  if (!memberIds.length) {
    return [];
  }

  const serviceClient = createServiceClient();
  const { data, error } = await serviceClient
    .from('members')
    .select('id, name, email')
    .in('id', memberIds);

  if (error) {
    throw error;
  }

  return data || [];
}

async function ensureCurrentCycle(chama: ChamaRecord, chamaMembers: ChamaMemberRecord[]) {
  const serviceClient = createServiceClient();
  const currentCycleNumber = Math.max(1, differenceInCycleWindows(chama.start_date, new Date()) + 1);
  const cycleMonth = addDays(chama.start_date, (currentCycleNumber - 1) * CHAMA_CYCLE_LENGTH_DAYS).toISOString().slice(0, 10);
  const payoutMember = chamaMembers.find((member) => member.cycle_number === currentCycleNumber) || null;

  const { data: existingCycle, error: existingCycleError } = await serviceClient
    .from('chama_cycles')
    .select('*')
    .eq('chama_id', chama.id)
    .eq('cycle_number', currentCycleNumber)
    .maybeSingle();

  if (existingCycleError) {
    throw existingCycleError;
  }

  if (existingCycle) {
    return {
      currentCycleNumber,
      cycle: existingCycle as ChamaCycleRecord,
      payoutMember,
    };
  }

  const payoutAmount = chamaMembers.length * parseMoney(chama.contribution_amount);
  const { data: createdCycle, error: createCycleError } = await serviceClient
    .from('chama_cycles')
    .insert([
      {
        chama_id: chama.id,
        cycle_number: currentCycleNumber,
        cycle_month: cycleMonth,
        payout_member_id: payoutMember?.member_id || null,
        payout_amount: payoutAmount,
        status: 'OPEN',
      },
    ])
    .select('*')
    .single();

  if (createCycleError && !isDuplicateError(createCycleError)) {
    throw createCycleError;
  }

  if (createdCycle) {
    return {
      currentCycleNumber,
      cycle: createdCycle as ChamaCycleRecord,
      payoutMember,
    };
  }

  const { data: refetchedCycle, error: refetchCycleError } = await serviceClient
    .from('chama_cycles')
    .select('*')
    .eq('chama_id', chama.id)
    .eq('cycle_number', currentCycleNumber)
    .maybeSingle();

  if (refetchCycleError) {
    throw refetchCycleError;
  }

  return {
    currentCycleNumber,
    cycle: refetchedCycle as ChamaCycleRecord | null,
    payoutMember,
  };
}

async function getContributionsForChama(chamaId: string) {
  const serviceClient = createServiceClient();
  const { data, error } = await serviceClient
    .from('chama_contributions')
    .select('*')
    .eq('chama_id', chamaId);

  if (error) {
    throw error;
  }

  return (data || []) as ChamaContributionRecord[];
}

export async function createChama({
  createdBy,
  cycleNumber,
  description,
  name,
  startDate,
}: {
  createdBy: string;
  cycleNumber?: number;
  description?: string;
  name: string;
  startDate?: string;
}) {
  void cycleNumber;
  void description;
  void name;
  void startDate;

  const { chama, membership } = await ensureMandatoryMembership(createdBy);
  return {
    chamaId: chama.id,
    assignedCycleNumber: membership.cycle_number,
  };
}

export async function joinChama({
  chamaId,
  cycleNumber,
  memberId,
}: {
  chamaId: string;
  cycleNumber: number;
  memberId: string;
}) {
  void chamaId;
  void cycleNumber;

  const { chama, membership } = await ensureMandatoryMembership(memberId);
  return {
    chamaId: chama.id,
    assignedCycleNumber: membership.cycle_number,
  };
}

export async function getChamaDashboard({
  chamaId,
  memberId,
}: {
  chamaId: string;
  memberId: string;
}): Promise<ChamaDashboardPayload> {
  const { chama: mandatoryChama, membership } = await ensureMandatoryMembership(memberId);
  const resolvedChamaId = chamaId || mandatoryChama.id;
  if (resolvedChamaId !== mandatoryChama.id) {
    throw new Error('Only the mandatory chama is available for members.');
  }

  const chama = mandatoryChama;
  const chamaMembers = await getChamaMembers(chama.id);

  const memberProfiles = await getMembersByIds(chamaMembers.map((item) => item.member_id));
  const profileMap = new Map(memberProfiles.map((profile) => [profile.id, profile]));
  const { currentCycleNumber, cycle, payoutMember } = await ensureCurrentCycle(chama, chamaMembers);
  const contributions = await getContributionsForChama(chamaId);
  const cycleContributions = contributions.filter((item) => item.cycle_id === cycle?.id);
  const dueAmount = parseMoney(chama.total_amount_due) || CHAMA_MONTHLY_TOTAL;
  const paidMemberIds = new Set(
    cycleContributions.filter((item) => parseMoney(item.amount_paid) >= dueAmount).map((item) => item.member_id)
  );
  const currentMemberContribution = cycleContributions.find((item) => item.member_id === memberId);
  const currentCyclePaidAmount = roundCurrency(parseMoney(currentMemberContribution?.amount_paid));
  const currentCycleRemainingAmount = Math.max(0, roundCurrency(dueAmount - currentCyclePaidAmount));
  const currentUserStatus = currentCycleRemainingAmount <= 0 ? 'paid' : 'pending';

  const dueCycleNumbers = chamaMembers
    .filter((item) => item.member_id === memberId)
    .flatMap((item) => Array.from({ length: currentCycleNumber }, (_, index) => index + 1).filter((cycleNumber) => cycleNumber >= item.cycle_number));

  const paidCycleIdsByMember = new Set(
    contributions.filter((item) => item.member_id === memberId).map((item) => item.cycle_id)
  );

  const arrearsCycles = dueCycleNumbers.filter((cycleNumber) => {
    const cycleId = cycleNumber === currentCycleNumber ? cycle?.id : null;
    if (cycleId && paidCycleIdsByMember.has(cycleId)) {
      return false;
    }
    return cycleNumber < currentCycleNumber;
  }).length;
  const lateFineTotal = arrearsCycles * CHAMA_LATE_FINE_AMOUNT;

  const members: ChamaDashboardMember[] = chamaMembers.map((item) => {
    const profile = profileMap.get(item.member_id);
    return {
      memberId: item.member_id,
      name: String(profile?.name || 'Member'),
      email: String(profile?.email || ''),
      cycleNumber: item.cycle_number,
      status: paidMemberIds.has(item.member_id) ? 'paid' : 'pending',
    };
  });

  const payoutProfile = payoutMember ? profileMap.get(payoutMember.member_id) : null;

  return {
    chama: {
      id: chama.id,
      name: chama.name,
      description: chama.description,
      status: chama.status,
    },
    currentCycleNumber,
    amountDue: dueAmount,
    currentCyclePaidAmount,
    currentCycleRemainingAmount,
    arrears: arrearsCycles * CHAMA_MONTHLY_TOTAL + lateFineTotal,
    overdueCycles: arrearsCycles,
    lateFineTotal,
    assignedCycleNumber: membership.cycle_number,
    payoutRecipient: payoutMember
      ? {
          memberId: payoutMember.member_id,
          name: String(payoutProfile?.name || 'Member'),
          email: String(payoutProfile?.email || ''),
          cycleNumber: payoutMember.cycle_number,
        }
      : null,
    currentCycle: cycle
      ? {
          id: cycle.id,
          cycleMonth: cycle.cycle_month,
          payoutAmount: parseMoney(cycle.payout_amount),
        }
      : null,
    currentUserStatus,
    totals: {
      totalMembers: chamaMembers.length,
      totalPaidThisCycle: cycleContributions.length,
      expectedThisCycle: chamaMembers.length,
    },
    members,
  };
}

export async function listChamaMembers({
  chamaId,
  memberId,
}: {
  chamaId: string;
  memberId: string;
}) {
  const dashboard = await getChamaDashboard({ chamaId, memberId });
  return {
    currentCycleNumber: dashboard.currentCycleNumber,
    members: dashboard.members,
  };
}

export async function payChamaContribution({
  amount,
  chamaId,
  memberId,
}: {
  amount: number;
  chamaId: string;
  memberId: string;
}) {
  const paymentAmount = roundCurrency(amount);
  if (!Number.isFinite(paymentAmount) || paymentAmount <= 0) {
    throw new Error('Enter a valid payment amount.');
  }

  const serviceClient = createServiceClient();
  const { chama: mandatoryChama, membership } = await ensureMandatoryMembership(memberId);
  const resolvedChamaId = chamaId || mandatoryChama.id;
  if (resolvedChamaId !== mandatoryChama.id) {
    throw new Error('Only the mandatory chama is available for members.');
  }

  const chama = mandatoryChama;
  const chamaMembers = await getChamaMembers(chama.id);
  void membership;

  const { currentCycleNumber, cycle } = await ensureCurrentCycle(chama, chamaMembers);
  if (!cycle) {
    throw new Error('Current cycle is not available.');
  }

  const { data: existingPayment, error: existingPaymentError } = await serviceClient
    .from('chama_contributions')
    .select('id, amount_paid, chama_amount, savings_amount, savings_entry_id')
    .eq('chama_id', chama.id)
    .eq('cycle_id', cycle.id)
    .eq('member_id', memberId)
    .maybeSingle();

  if (existingPaymentError) {
    throw existingPaymentError;
  }

  const totalDue = parseMoney(chama.total_amount_due) || CHAMA_MONTHLY_TOTAL;
  const existingPaidAmount = roundCurrency(parseMoney(existingPayment?.amount_paid));
  const remainingAmount = Math.max(0, roundCurrency(totalDue - existingPaidAmount));
  if (remainingAmount <= 0) {
    throw new Error('You have already completed payment for the current cycle.');
  }

  if (paymentAmount > remainingAmount) {
    throw new Error(`Payment exceeds the remaining balance of KES ${remainingAmount.toLocaleString()}.`);
  }

  const unlockDate = addMonths(chama.start_date, CHAMA_LOCK_PERIOD_MONTHS).toISOString();
  const savingsPortion = roundCurrency((paymentAmount * CHAMA_LOCKED_SAVINGS_AMOUNT) / CHAMA_MONTHLY_TOTAL);
  const contributionPortion = roundCurrency(paymentAmount - savingsPortion);

  const { data: member, error: memberError } = await serviceClient
    .from('members')
    .select('id, savings')
    .eq('id', memberId)
    .single();

  if (memberError || !member) {
    throw memberError || new Error('Member profile not found.');
  }

  const { error: updateSavingsError } = await serviceClient
    .from('members')
    .update({ savings: parseMoney(member.savings) + savingsPortion })
    .eq('id', memberId);

  if (updateSavingsError) {
    throw updateSavingsError;
  }

  const { data: savingsEntry, error: savingsError } = await serviceClient
    .from('savings')
    .insert([
      {
        member_id: memberId,
        amount: savingsPortion,
        savings_type: 'LONG_TERM',
        locked: true,
        unlock_date: unlockDate,
        source: 'CHAMA_CONTRIBUTION',
      },
    ])
    .select('id')
    .single();

  if (savingsError) {
    throw savingsError;
  }

  const nextAmountPaid = roundCurrency(existingPaidAmount + paymentAmount);
  const nextChamaAmount = roundCurrency(parseMoney(existingPayment?.chama_amount) + contributionPortion);
  const nextSavingsAmount = roundCurrency(parseMoney(existingPayment?.savings_amount) + savingsPortion);
  const nextStatus = nextAmountPaid >= totalDue ? 'PAID' : 'PENDING';

  let contributionError = null;
  if (existingPayment?.id) {
    const updateContribution = await serviceClient
      .from('chama_contributions')
      .update({
        amount_paid: nextAmountPaid,
        chama_amount: nextChamaAmount,
        savings_amount: nextSavingsAmount,
        status: nextStatus,
        paid_at: new Date().toISOString(),
      })
      .eq('id', existingPayment.id);
    contributionError = updateContribution.error;
  } else {
    const insertContribution = await serviceClient
      .from('chama_contributions')
      .insert([
        {
          chama_id: chama.id,
          cycle_id: cycle.id,
          member_id: memberId,
          payment_month: cycle.cycle_month,
          amount_paid: nextAmountPaid,
          chama_amount: nextChamaAmount,
          savings_amount: nextSavingsAmount,
          status: nextStatus,
          savings_entry_id: savingsEntry.id,
        },
      ]);
    contributionError = insertContribution.error;
  }

  if (contributionError) {
    throw contributionError;
  }

  const { error: transactionError } = await serviceClient.from('transactions').insert([
    {
      member_id: memberId,
      type: 'chama_contribution',
      amount: contributionPortion,
      description: `Chama contribution payment for cycle ${currentCycleNumber}`,
    },
    {
      member_id: memberId,
      type: 'chama_locked_savings',
      amount: savingsPortion,
      description: `Locked long-term savings payment for cycle ${currentCycleNumber}`,
    },
  ]);

  if (transactionError) {
    throw transactionError;
  }

  return {
    chamaId: chama.id,
    currentCycleNumber,
    paidAmount: paymentAmount,
    totalPaidAmount: nextAmountPaid,
    remainingAmount: Math.max(0, roundCurrency(totalDue - nextAmountPaid)),
    savingsAmount: savingsPortion,
    contributionAmount: contributionPortion,
  };
}

export async function listMemberChamas(memberId: string): Promise<ChamaListItem[]> {
  const { chama, membership } = await ensureMandatoryMembership(memberId);
  return [
    {
      chamaId: chama.id,
      name: chama.name,
      status: chama.status,
      assignedCycleNumber: membership.cycle_number,
      currentCycleNumber: Math.max(1, differenceInCycleWindows(chama.start_date, new Date()) + 1),
    },
  ];
}

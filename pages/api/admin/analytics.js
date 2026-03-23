import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://qgvnjjgrwqhaonzoipxq.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_dCxpfTDMRO0AiRsQ5m-v7w_04CnGRYh';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const LOAN_INTEREST_RATE = 0.1;

function normalizeRole(member) {
  if (!member) {
    return 'member';
  }

  if (member.role === 'admin' || member.role === 'member') {
    return member.role;
  }

  return member.is_admin ? 'admin' : 'member';
}

function getHomeRouteForRole(role) {
  return role === 'admin' ? '/admin' : '/dashboard';
}

function isSavingsType(typeValue) {
  const type = String(typeValue || '').toLowerCase();
  return type.includes('deposit') || type.includes('saving') || type === 'credit';
}

function isLoanDisbursementType(typeValue) {
  const type = String(typeValue || '').toLowerCase();
  return type.includes('loan_disbursement') || type.includes('loan disbursement');
}

function normalizeLoanStatus(statusValue) {
  return String(statusValue || '').trim().toLowerCase();
}

function isIssuedLoan(statusValue) {
  const status = normalizeLoanStatus(statusValue);
  return status === 'approved' || status === 'active' || status === 'completed';
}

function isActiveLoan(statusValue) {
  const status = normalizeLoanStatus(statusValue);
  return status === 'approved' || status === 'active';
}

function getLoanTotalDueAmount(amountValue) {
  const principal = Number(amountValue || 0);
  return Math.round(principal * (1 + LOAN_INTEREST_RATE));
}

function dedupeById(rows) {
  const map = new Map();
  (rows || []).forEach((row) => {
    if (!row?.id) {
      return;
    }
    if (!map.has(row.id)) {
      map.set(row.id, row);
    }
  });
  return Array.from(map.values());
}

function isMissingCreatedAtError(error) {
  const message = String(error?.message || '').toLowerCase();
  const details = String(error?.details || '').toLowerCase();
  return message.includes('created_at') || details.includes('created_at');
}

function isMissingPhoneNumberError(error) {
  const message = String(error?.message || '').toLowerCase();
  const details = String(error?.details || '').toLowerCase();
  return message.includes('phone_number') || details.includes('phone_number');
}

async function fetchRowsWithCreatedAtFallback(client, table, selectWithCreatedAt, selectWithoutCreatedAt) {
  const withCreatedAt = await client
    .from(table)
    .select(selectWithCreatedAt)
    .order('created_at', { ascending: false });

  if (!withCreatedAt.error) {
    return withCreatedAt.data || [];
  }

  if (!isMissingCreatedAtError(withCreatedAt.error)) {
    throw withCreatedAt.error;
  }

  const withoutCreatedAt = await client.from(table).select(selectWithoutCreatedAt);

  if (withoutCreatedAt.error) {
    throw withoutCreatedAt.error;
  }

  return (withoutCreatedAt.data || []).map((row) => ({
    ...row,
    created_at: null,
  }));
}

async function fetchMembersWithColumnFallback(client) {
  const withAllColumns = await client
    .from('members')
    .select('id,name,email,phone_number,savings,created_at')
    .order('created_at', { ascending: false });

  if (!withAllColumns.error) {
    return withAllColumns.data || [];
  }

  if (isMissingPhoneNumberError(withAllColumns.error)) {
    const withoutPhone = await fetchRowsWithCreatedAtFallback(
      client,
      'members',
      'id,name,email,savings,created_at',
      'id,name,email,savings'
    );

    return withoutPhone.map((row) => ({
      ...row,
      phone_number: null,
    }));
  }

  if (isMissingCreatedAtError(withAllColumns.error)) {
    const withoutCreatedAt = await client
      .from('members')
      .select('id,name,email,phone_number,savings');

    if (!withoutCreatedAt.error) {
      return (withoutCreatedAt.data || []).map((row) => ({
        ...row,
        created_at: null,
      }));
    }

    if (isMissingPhoneNumberError(withoutCreatedAt.error)) {
      const fallback = await client
        .from('members')
        .select('id,name,email,savings');

      if (fallback.error) {
        throw fallback.error;
      }

      return (fallback.data || []).map((row) => ({
        ...row,
        phone_number: null,
        created_at: null,
      }));
    }
  }

  throw withAllColumns.error;
}

function toDateSafe(value) {
  const parsed = value ? new Date(value) : null;
  if (!parsed || Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
}

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function startOfWeek(date) {
  const current = startOfDay(date);
  const day = current.getDay();
  const offset = day === 0 ? -6 : 1 - day;
  current.setDate(current.getDate() + offset);
  return current;
}

function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function buildTimeBuckets(view) {
  const now = new Date();

  if (view === 'daily') {
    return Array.from({ length: 7 }, (_, index) => {
      const current = startOfDay(now);
      current.setDate(current.getDate() - (6 - index));
      const key = current.toISOString().slice(0, 10);

      return {
        key,
        label: current.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
        date: current,
      };
    });
  }

  if (view === 'weekly') {
    return Array.from({ length: 8 }, (_, index) => {
      const current = startOfWeek(now);
      current.setDate(current.getDate() - (7 * (7 - index)));
      const key = current.toISOString().slice(0, 10);

      return {
        key,
        label: `W${index + 1}`,
        date: current,
      };
    });
  }

  return Array.from({ length: 12 }, (_, index) => {
    const current = startOfMonth(now);
    current.setMonth(current.getMonth() - (11 - index));
    const key = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`;

    return {
      key,
      label: current.toLocaleDateString('en-GB', { month: 'short' }),
      date: current,
    };
  });
}

function bucketKeyForDate(date, view) {
  if (view === 'daily') {
    return startOfDay(date).toISOString().slice(0, 10);
  }

  if (view === 'weekly') {
    return startOfWeek(date).toISOString().slice(0, 10);
  }

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function buildAnalyticsPayload({ members, loans, transactions, view }) {
  const uniqueMembers = dedupeById(members);
  const uniqueLoans = dedupeById(loans);
  const uniqueTransactions = dedupeById(transactions);

  const buckets = buildTimeBuckets(view);
  const rangeStartDate = buckets[0]?.date || new Date(0);

  const memberMap = new Map(uniqueMembers.map((member) => [member.id, member]));

  const filteredMembers = uniqueMembers.filter((member) => {
    const createdAt = toDateSafe(member.created_at);
    return createdAt ? createdAt >= rangeStartDate : false;
  });

  const filteredLoans = uniqueLoans.filter((loan) => {
    const createdAt = toDateSafe(loan.created_at);
    return createdAt ? createdAt >= rangeStartDate : false;
  });

  const filteredTransactions = uniqueTransactions.filter((transaction) => {
    const createdAt = toDateSafe(transaction.created_at);
    return createdAt ? createdAt >= rangeStartDate : false;
  });

  const savingsGrowthMap = new Map(buckets.map((bucket) => [bucket.key, 0]));

  filteredTransactions.forEach((transaction) => {
    if (!isSavingsType(transaction.type)) {
      return;
    }

    const createdAt = toDateSafe(transaction.created_at);
    if (!createdAt) {
      return;
    }

    const bucketKey = bucketKeyForDate(createdAt, view);
    if (savingsGrowthMap.has(bucketKey)) {
      savingsGrowthMap.set(bucketKey, Number(savingsGrowthMap.get(bucketKey) || 0) + Number(transaction.amount || 0));
    }
  });

  let runningSavings = 0;
  const savingsGrowth = buckets.map((bucket) => {
    runningSavings += Number(savingsGrowthMap.get(bucket.key) || 0);

    return {
      label: bucket.label,
      value: runningSavings,
    };
  });

  const loanByPurpose = filteredLoans.reduce((accumulator, loan) => {
    if (!isIssuedLoan(loan.status)) {
      return accumulator;
    }
    const purpose = loan.purpose?.trim() || 'General';
    accumulator.set(purpose, Number(accumulator.get(purpose) || 0) + Number(loan.amount || 0));
    return accumulator;
  }, new Map());

  const loanDistribution = Array.from(loanByPurpose.entries())
    .map(([name, amount]) => ({ name, amount }))
    .sort((left, right) => right.amount - left.amount)
    .slice(0, 6);

  const repaymentStatusMap = new Map([
    ['Repaid', 0],
    ['Outstanding', 0],
    ['Pending', 0],
    ['Rejected', 0],
  ]);

  filteredLoans.forEach((loan) => {
    const status = normalizeLoanStatus(loan.status);
    const amount = getLoanTotalDueAmount(loan.amount);
    const repaid = Number(loan.repaid || 0);

    if (status === 'rejected') {
      repaymentStatusMap.set('Rejected', Number(repaymentStatusMap.get('Rejected') || 0) + 1);
      return;
    }

    if (status === 'pending') {
      repaymentStatusMap.set('Pending', Number(repaymentStatusMap.get('Pending') || 0) + 1);
      return;
    }

    if (status === 'completed' || (amount > 0 && repaid >= amount)) {
      repaymentStatusMap.set('Repaid', Number(repaymentStatusMap.get('Repaid') || 0) + 1);
      return;
    }

    repaymentStatusMap.set('Outstanding', Number(repaymentStatusMap.get('Outstanding') || 0) + 1);
  });

  const repaymentStatus = Array.from(repaymentStatusMap.entries())
    .map(([name, value]) => ({ name, value }))
    .filter((entry) => entry.value > 0);

  const recentTransactions = filteredTransactions
    .slice()
    .sort((left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime())
    .slice(0, 6)
    .map((transaction) => ({
      ...transaction,
      memberName: memberMap.get(transaction.member_id)?.name || 'Member',
    }));

  const newMembers = filteredMembers
    .slice()
    .sort((left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime())
    .slice(0, 6);

  const registeredMembers = uniqueMembers
    .slice()
    .sort((left, right) => {
      const leftDate = toDateSafe(left.created_at)?.getTime() || 0;
      const rightDate = toDateSafe(right.created_at)?.getTime() || 0;
      if (leftDate !== rightDate) {
        return rightDate - leftDate;
      }
      return String(left.name || '').localeCompare(String(right.name || ''));
    })
    .map((member) => ({
      id: member.id,
      name: member.name || 'Member',
      email: member.email || 'No email',
      phone_number: member.phone_number || 'No phone number',
      created_at: member.created_at || null,
    }));

  const totalMembers = uniqueMembers.length;
  const totalSavingsFromTransactions = uniqueTransactions.reduce((sum, transaction) => {
    if (!isSavingsType(transaction.type)) {
      return sum;
    }
    return sum + Number(transaction.amount || 0);
  }, 0);
  const totalSavingsFromMembers = uniqueMembers.reduce((sum, member) => sum + Number(member.savings || 0), 0);
  const totalSavings =
    totalSavingsFromTransactions > 0 ? totalSavingsFromTransactions : totalSavingsFromMembers;

  const totalLoansIssued = uniqueLoans.reduce((sum, loan) => {
    if (!isIssuedLoan(loan.status)) {
      return sum;
    }
    return sum + Number(loan.amount || 0);
  }, 0);
  const totalLoansFromTransactions = uniqueTransactions.reduce((sum, transaction) => {
    if (!isLoanDisbursementType(transaction.type)) {
      return sum;
    }
    return sum + Number(transaction.amount || 0);
  }, 0);
  const resolvedTotalLoansIssued =
    totalLoansIssued > 0 ? totalLoansIssued : totalLoansFromTransactions;

  const activeLoans = uniqueLoans.filter((loan) => {
    if (!isActiveLoan(loan.status)) {
      return false;
    }
    return Number(loan.repaid || 0) < getLoanTotalDueAmount(loan.amount);
  }).length;

  return {
    overview: {
      totalMembers,
      totalSavings,
      totalLoansIssued: resolvedTotalLoansIssued,
      activeLoans,
    },
    charts: {
      savingsGrowth,
      loanDistribution,
      repaymentStatus,
    },
    activity: {
      recentTransactions,
      newMembers,
      registeredMembers,
      rangeStart: rangeStartDate.toISOString(),
    },
    updatedAt: new Date().toISOString(),
  };
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  const headerValue = req.headers.authorization || '';
  const accessToken = headerValue.startsWith('Bearer ') ? headerValue.slice(7) : '';
  const viewParam = String(req.query.view || 'monthly').toLowerCase();
  const view = viewParam === 'daily' || viewParam === 'weekly' || viewParam === 'monthly' ? viewParam : 'monthly';

  if (!accessToken) {
    return res.status(401).json({ error: 'Missing access token.' });
  }

  const authClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  try {
    const {
      data: { user },
      error: userError,
    } = await authClient.auth.getUser(accessToken);

    if (userError || !user) {
      return res.status(401).json({ error: 'Invalid session.' });
    }

    const { data: profile, error: profileError } = await authClient
      .from('members')
      .select('id, role, is_admin')
      .eq('id', user.id)
      .single();

    if (profileError && profileError.code !== 'PGRST116') {
      throw profileError;
    }

    const role = normalizeRole(profile);

    if (role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required.', homeRoute: getHomeRouteForRole(role) });
    }

    // Use service role for aggregate reads when available so totals are not constrained by RLS.
    const dataClient = supabaseServiceRoleKey
      ? createClient(supabaseUrl, supabaseServiceRoleKey, {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
          },
        })
      : authClient;

    const [members, rawLoans, rawTransactions] = await Promise.all([
      fetchMembersWithColumnFallback(dataClient),
      fetchRowsWithCreatedAtFallback(
        dataClient,
        'loans',
        'id,amount,repaid,status,purpose,created_at',
        'id,amount,repaid,status,purpose'
      ),
      fetchRowsWithCreatedAtFallback(
        dataClient,
        'transactions',
        'id,member_id,type,amount,description,created_at',
        'id,member_id,type,amount,description'
      ),
    ]);

    const loans = (rawLoans || []).map((loan) => ({
      ...loan,
      amount: Number(loan.amount || 0),
      repaid: Number(loan.repaid || 0),
    }));
    const transactions = (rawTransactions || []).map((transaction) => ({
      ...transaction,
      amount: Number(transaction.amount || 0),
    }));

    const payload = buildAnalyticsPayload({
      members,
      loans,
      transactions,
      view,
    });

    const serviceRoleEnabled = Boolean(supabaseServiceRoleKey);
    const likelyRestrictedMode = !serviceRoleEnabled;

    return res.status(200).json({
      ...payload,
      meta: {
        serviceRoleEnabled,
        dataScope: serviceRoleEnabled ? 'global' : 'session',
        rowCounts: {
          members: members.length,
          loans: loans.length,
          transactions: transactions.length,
        },
        warning: likelyRestrictedMode
          ? 'Analytics is running in session scope. Restart server after setting SUPABASE_SERVICE_ROLE_KEY for global totals.'
          : null,
      },
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message || 'Could not load admin analytics.',
    });
  }
}

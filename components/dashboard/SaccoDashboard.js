import { useCallback, useMemo, useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Landmark, TrendingUp, WalletCards, WalletMinimal } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import ActivityTabs from './ActivityTabs';
import DashboardHeader from './DashboardHeader';
import DashboardSidebar from './DashboardSidebar';
import StatCard from './StatCard';
import TrustScoreCard from './TrustScoreCard';

const fallbackMember = {
  name: 'Member',
  id: 'Not available',
  email: 'No email',
};

const initialRequests = [
  { id: 1, label: 'Guarantor requests', value: '1', meta: 'Awaiting your review' },
  { id: 2, label: 'Approvals waiting', value: '0', meta: 'No pending approvals' },
  { id: 3, label: 'Last update', value: 'Today', meta: 'All request data synced' },
];

const defaultActionState = { amount: '', recipient: '', purpose: '' };

function formatKes(value) {
  return `KES ${Number(value || 0).toLocaleString()}`;
}

function buildScore(savings, loanBalance, transactionCount) {
  const savingPattern = Math.min(100, 20 + Math.round(savings / 900));
  const repaymentHistory = Math.max(15, Math.min(100, 70 - Math.round(loanBalance / 2500)));
  const accountActivity = Math.min(100, 15 + transactionCount * 8);
  const total = Math.round((savingPattern + repaymentHistory + accountActivity) / 3);

  return {
    value: total,
    grade: total >= 75 ? 'A' : total >= 60 ? 'B' : total >= 40 ? 'C' : 'D',
    status: total >= 60 ? 'Stable' : 'Needs attention',
    summary: 'This score updates as you save, borrow responsibly, and keep your account active.',
    metrics: [
      {
        label: 'Saving pattern',
        value: savingPattern,
        rating: savingPattern >= 70 ? 'Good' : savingPattern >= 40 ? 'Fair' : 'Low',
        note: 'Regular deposits improve this result.',
      },
      {
        label: 'Repayment history',
        value: repaymentHistory,
        rating: repaymentHistory >= 70 ? 'Good' : repaymentHistory >= 40 ? 'Fair' : 'Low',
        note: 'Lower outstanding pressure supports a healthier score.',
      },
      {
        label: 'Account activity',
        value: accountActivity,
        rating: accountActivity >= 70 ? 'Good' : accountActivity >= 40 ? 'Fair' : 'Low',
        note: 'Frequent account activity helps this trend upward.',
      },
    ],
  };
}

function ActionModal({ open, title, fields, values, onChange, onClose, onSubmit, submitLabel, busy = false }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
        <h3 className="font-serif text-2xl font-bold text-[#182235]">{title}</h3>
        <div className="mt-5 space-y-4">
          {fields.map((field) => (
            <label key={field.name} className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-600">{field.label}</span>
              <input
                type={field.type ?? 'text'}
                value={values[field.name]}
                onChange={(event) => onChange(field.name, event.target.value)}
                placeholder={field.placeholder}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-300"
              />
            </label>
          ))}
        </div>
        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={busy}
            className="flex-1 rounded-xl bg-[#182235] px-4 py-3 text-sm font-semibold text-amber-300 transition hover:bg-[#101827] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? 'Saving...' : submitLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SaccoDashboard() {
  const router = useRouter();
  const [member, setMember] = useState(fallbackMember);
  const [memberId, setMemberId] = useState('');
  const [activeSidebarItem, setActiveSidebarItem] = useState('account');
  const [activeTab, setActiveTab] = useState('Repayments');
  const [flashMessage, setFlashMessage] = useState('');
  const [availableBalance, setAvailableBalance] = useState(0);
  const [savings, setSavings] = useState(0);
  const [loans, setLoans] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [requests] = useState(initialRequests);
  const [actionType, setActionType] = useState('');
  const [actionValues, setActionValues] = useState(defaultActionState);
  const [loading, setLoading] = useState(true);
  const [savingAction, setSavingAction] = useState(false);

  const loanBalance = loans.reduce((sum, loan) => sum + Number(loan.balance || 0), 0);
  const activeLoanCount = loans.filter((loan) => loan.status === 'Active').length;
  const trustScore = useMemo(
    () => buildScore(savings, loanBalance, transactions.length),
    [savings, loanBalance, transactions.length]
  );

  const savingsHistory = useMemo(() => {
    const deposits = transactions.filter((tx) => tx.type === 'credit');
    const totalRecent = deposits.slice(0, 3);

    if (totalRecent.length === 0) {
      return [
        { id: 1, label: 'Current savings', value: savings, meta: 'No recent deposit history yet' },
      ];
    }

    return totalRecent.map((entry) => ({
      id: entry.id,
      label: entry.label,
      value: entry.amount,
      meta: `${entry.meta} · ${entry.date}`,
    }));
  }, [savings, transactions]);

  const repayments = useMemo(() => {
    if (loans.length === 0) {
      return [
        { id: 1, label: 'Next due date', value: 'No active loan', meta: 'Create a loan to generate a schedule' },
        { id: 2, label: 'Amount due', value: formatKes(0), meta: 'No repayment pending' },
        { id: 3, label: 'Status', value: 'No schedule', meta: 'Nothing due right now' },
      ];
    }

    const primaryLoan = loans[0];
    return [
      { id: 1, label: 'Next due date', value: primaryLoan.nextReview, meta: primaryLoan.name },
      { id: 2, label: 'Amount due', value: formatKes(Math.max(0, Math.round(primaryLoan.balance / 4))), meta: 'Estimated installment' },
      { id: 3, label: 'Status', value: primaryLoan.status, meta: 'Latest loan state' },
    ];
  }, [loans]);

  const panelContent = useMemo(
    () => ({
      Repayments: {
        title: 'Upcoming repayments',
        subtitle: 'Your current repayment plan and next due items.',
        items: repayments.map((item) => ({ label: item.label, value: item.value, meta: item.meta })),
      },
      'My Loans': {
        title: 'Loan summary',
        subtitle: 'Your current loan positions and review dates.',
        items: (loans.length
          ? loans
          : [{ id: 'none', name: 'No active loans', amount: 0, balance: 0, nextReview: 'N/A', status: 'Idle' }]
        )
          .slice(0, 3)
          .map((loan) => ({
            label: loan.name,
            value: formatKes(loan.balance),
            meta: `Original ${formatKes(loan.amount)} · ${loan.nextReview}`,
          })),
      },
      Transactions: {
        title: 'Recent transactions',
        subtitle: 'Latest activity affecting your account.',
        items: (transactions.length
          ? transactions
          : [{ id: 'empty', label: 'No transactions yet', amount: 0, type: 'credit', date: 'N/A', meta: 'Create one from the action buttons' }]
        )
          .slice(0, 3)
          .map((tx) => ({
            label: tx.label,
            value: `${tx.type === 'credit' ? '+' : '-'}${formatKes(tx.amount)}`,
            meta: `${tx.meta} · ${tx.date}`,
          })),
      },
      'Savings History': {
        title: 'Savings trend',
        subtitle: 'A quick view of current savings progress.',
        items: savingsHistory.slice(0, 3).map((entry) => ({
          label: entry.label,
          value: formatKes(entry.value),
          meta: entry.meta,
        })),
      },
      Growth: {
        title: 'Growth snapshot',
        subtitle: 'Simple indicators driven by your current account data.',
        items: [
          { label: 'Savings growth', value: `${Math.min(40, Math.round(savings / 1500))}%`, meta: 'Based on cumulative savings level' },
          { label: 'Loan improvement', value: `${Math.max(0, 20 - activeLoanCount * 3)}%`, meta: 'Better when balances reduce' },
          { label: 'Trust movement', value: `+${Math.max(1, Math.round(trustScore.value / 12))} pts`, meta: 'Derived from score trend' },
        ],
      },
      Requests: {
        title: 'Pending requests',
        subtitle: 'Mock request items until backend data is connected.',
        items: requests,
      },
    }),
    [activeLoanCount, loans, repayments, requests, savings, savingsHistory, transactions, trustScore.value]
  );

  const statCards = useMemo(
    () => [
      {
        title: 'Available Balance',
        value: formatKes(availableBalance),
        hint: activeSidebarItem === 'profile' ? 'Profile updates may unlock more actions.' : 'Funds ready for transfers and member activity.',
        tone: 'primary',
        icon: <WalletMinimal className="h-5 w-5" />,
      },
      {
        title: 'Savings',
        value: formatKes(savings),
        hint: 'Built from your current deposits.',
        icon: <WalletCards className="h-5 w-5" />,
      },
      {
        title: 'Loan Balance',
        value: formatKes(loanBalance),
        hint: activeSidebarItem === 'loan' ? 'This updates whenever you submit a facility.' : 'Total outstanding loan balance.',
        icon: <TrendingUp className="h-5 w-5" />,
      },
      {
        title: 'Active Loans',
        value: String(activeLoanCount),
        hint: activeLoanCount > 0 ? 'Facilities currently being serviced.' : 'No open facilities right now.',
        icon: <Landmark className="h-5 w-5" />,
      },
    ],
    [activeLoanCount, activeSidebarItem, availableBalance, loanBalance, savings]
  );

  const titleBySection = {
    account: 'Account overview',
    loan: 'Loan workspace',
    profile: 'Profile overview',
  };

  const descriptionBySection = {
    account: 'Track balances, trust score, and recent activity in one place.',
    loan: 'Create loans, monitor balances, and review repayment details.',
    profile: 'Member details are loaded from your account and local profile state.',
  };

  const showMessage = (message) => setFlashMessage(message);

  const hydrateFromBackend = useCallback(async () => {
    setLoading(true);

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        router.push('/auth');
        return;
      }

      setMemberId(user.id);

      const { data: memberData, error: memberError } = await supabase
        .from('members')
        .select('*')
        .eq('id', user.id)
        .single();

      let resolvedMember = memberData;

      if (memberError && memberError.code === 'PGRST116') {
        const newMemberData = {
          id: user.id,
          email: user.email || '',
          name: user.user_metadata?.full_name || 'Member',
          savings: 0,
        };

        const { data: insertedMember, error: insertError } = await supabase
          .from('members')
          .insert([newMemberData])
          .select()
          .single();

        if (insertError) throw insertError;
        resolvedMember = insertedMember;
      } else if (memberError) {
        throw memberError;
      }

      setMember({
        name: resolvedMember?.name || user.user_metadata?.full_name || 'Member',
        id: resolvedMember?.id || user.id,
        email: resolvedMember?.email || user.email || '',
      });
      setSavings(Number(resolvedMember?.savings || 0));
      setAvailableBalance(Number(resolvedMember?.savings || 0));

      const { data: loanData, error: loanError } = await supabase
        .from('loans')
        .select('*')
        .eq('member_id', user.id)
        .order('created_at', { ascending: false });

      if (loanError) throw loanError;

      setLoans(
        (loanData || []).map((loan) => ({
          id: loan.id,
          name: loan.purpose || 'Loan',
          amount: Number(loan.amount || 0),
          balance: Math.max(0, Number(loan.amount || 0) - Number(loan.repaid || 0)),
          status: loan.status === 'approved' ? 'Active' : loan.status === 'completed' ? 'Completed' : loan.status === 'active' ? 'Active' : 'Pending',
          nextReview: loan.created_at ? new Date(loan.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A',
        }))
      );

      const { data: transactionData, error: transactionError } = await supabase
        .from('transactions')
        .select('*')
        .eq('member_id', user.id)
        .order('created_at', { ascending: false });

      if (transactionError) throw transactionError;

      setTransactions(
        (transactionData || []).map((tx) => ({
          id: tx.id,
          label: tx.description || tx.type,
          amount: Number(tx.amount || 0),
          type: tx.type === 'deposit' || tx.type === 'loan_disbursement' ? 'credit' : 'debit',
          date: tx.created_at
            ? new Date(tx.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
            : 'N/A',
          meta: tx.type.replace(/_/g, ' '),
        }))
      );
    } catch (error) {
      showMessage(`Could not load dashboard data: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void hydrateFromBackend();
  }, [hydrateFromBackend]);

  const openAction = (type) => {
    setActionType(type);
    setActionValues(defaultActionState);
  };

  const closeAction = () => {
    setActionType('');
    setActionValues(defaultActionState);
    setSavingAction(false);
  };

  const updateActionValue = (name, value) => {
    setActionValues((prev) => ({ ...prev, [name]: value }));
  };

  const appendLocalTransaction = (transaction) => {
    setTransactions((prev) => [{ id: `local-${prev.length + 1}`, ...transaction }, ...prev]);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/auth');
  };

  const submitDeposit = async () => {
    const amount = Number(actionValues.amount);
    if (!amount || amount <= 0 || !memberId) {
      showMessage('Enter a valid deposit amount.');
      return;
    }

    setSavingAction(true);
    try {
      const nextSavings = savings + amount;

      const { error: updateError } = await supabase
        .from('members')
        .update({ savings: nextSavings })
        .eq('id', memberId);

      if (updateError) throw updateError;

      const { error: transactionError } = await supabase.from('transactions').insert([
        {
          member_id: memberId,
          type: 'deposit',
          amount,
          description: 'Savings deposit',
        },
      ]);

      if (transactionError) throw transactionError;

      showMessage(`Savings increased by ${formatKes(amount)}.`);
      setActiveTab('Savings History');
      closeAction();
      await hydrateFromBackend();
    } catch (error) {
      setSavingAction(false);
      showMessage(`Deposit failed: ${error.message}`);
    }
  };

  const submitLoan = async () => {
    const amount = Number(actionValues.amount);
    const purpose = actionValues.purpose.trim();

    if (!amount || amount <= 0 || !purpose || !memberId) {
      showMessage('Enter a valid amount and loan purpose.');
      return;
    }

    setSavingAction(true);
    try {
      const { error } = await supabase.from('loans').insert([
        {
          member_id: memberId,
          amount,
          purpose,
          status: 'pending',
          repaid: 0,
        },
      ]);

      if (error) throw error;

      showMessage(`Loan request for ${formatKes(amount)} created.`);
      setActiveSidebarItem('loan');
      setActiveTab('My Loans');
      closeAction();
      await hydrateFromBackend();
    } catch (error) {
      setSavingAction(false);
      showMessage(`Loan request failed: ${error.message}`);
    }
  };

  const submitTransfer = () => {
    const amount = Number(actionValues.amount);
    const recipient = actionValues.recipient.trim();

    if (!amount || amount <= 0 || !recipient) {
      showMessage('Enter a recipient and valid transfer amount.');
      return;
    }

    if (amount > availableBalance) {
      showMessage('Transfer amount exceeds available balance.');
      return;
    }

    setAvailableBalance((prev) => prev - amount);
    appendLocalTransaction({
      label: 'Share transfer',
      amount,
      type: 'debit',
      date: 'Just now',
      meta: `Sent to ${recipient}`,
    });
    showMessage(`Transfer of ${formatKes(amount)} sent to ${recipient}.`);
    setActiveTab('Transactions');
    closeAction();
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#ffffff_0%,#f6f7fb_52%,#eef2f8_100%)] text-slate-900">
      <div className="grid min-h-screen lg:grid-cols-[252px_minmax(0,1fr)]">
        <div className="hidden lg:block">
          <DashboardSidebar activeItem={activeSidebarItem} onSelect={setActiveSidebarItem} />
        </div>

        <main className="min-w-0">
          <div className="border-b border-slate-200 bg-[#182235] px-4 py-3 text-white lg:hidden">
            <div className="flex flex-wrap items-center gap-2">
              {[
                ['account', 'My Account'],
                ['loan', 'Apply Loan'],
                ['profile', 'Profile'],
              ].map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setActiveSidebarItem(id)}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                    activeSidebarItem === id ? 'bg-white text-[#182235]' : 'bg-[#24314b] text-slate-200'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <DashboardHeader
            memberName={member.name}
            memberId={member.id}
            email={member.email}
            busy={loading || savingAction}
            onTransferShares={() => openAction('transfer')}
            onApplyLoan={() => {
              setActiveSidebarItem('loan');
              setActiveTab('My Loans');
              openAction('loan');
            }}
            onDepositSavings={() => {
              setActiveSidebarItem('account');
              setActiveTab('Savings History');
              openAction('deposit');
            }}
            onViewStatement={() => {
              setActiveTab('Transactions');
              showMessage('Statement view opened.');
            }}
            onNotify={showMessage}
            onLogout={handleLogout}
          />

          <div className="space-y-6 px-4 py-6 sm:px-6">
            <section className="rounded-2xl border border-slate-200 bg-white/80 px-5 py-4 shadow-[0_10px_30px_rgba(15,23,42,0.04)] backdrop-blur">
              <h2 className="text-lg font-bold text-[#182235]">{titleBySection[activeSidebarItem]}</h2>
              <p className="mt-1 text-sm text-slate-500">{descriptionBySection[activeSidebarItem]}</p>
            </section>

            {flashMessage ? (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
                {flashMessage}
              </div>
            ) : null}

            <section className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
              {statCards.map((card) => (
                <StatCard key={card.title} {...card} />
              ))}
            </section>

            <TrustScoreCard score={trustScore} />

            <ActivityTabs
              activeTab={activeTab}
              onChange={setActiveTab}
              onGrowthTips={() => showMessage('Helpful tips opened.')}
              panelContent={panelContent}
            />
          </div>
        </main>
      </div>

      <ActionModal
        open={actionType === 'deposit'}
        title="Deposit Savings"
        fields={[{ name: 'amount', label: 'Amount', placeholder: 'Enter amount', type: 'number' }]}
        values={actionValues}
        onChange={updateActionValue}
        onClose={closeAction}
        onSubmit={submitDeposit}
        submitLabel="Save Deposit"
        busy={savingAction}
      />

      <ActionModal
        open={actionType === 'loan'}
        title="Apply Loan"
        fields={[
          { name: 'amount', label: 'Loan Amount', placeholder: 'Enter amount', type: 'number' },
          { name: 'purpose', label: 'Purpose', placeholder: 'Business, school fees, emergency...' },
        ]}
        values={actionValues}
        onChange={updateActionValue}
        onClose={closeAction}
        onSubmit={submitLoan}
        submitLabel="Submit Loan"
        busy={savingAction}
      />

      <ActionModal
        open={actionType === 'transfer'}
        title="Transfer Shares"
        fields={[
          { name: 'recipient', label: 'Recipient', placeholder: 'Member or account name' },
          { name: 'amount', label: 'Amount', placeholder: 'Enter amount', type: 'number' },
        ]}
        values={actionValues}
        onChange={updateActionValue}
        onClose={closeAction}
        onSubmit={submitTransfer}
        submitLabel="Send Transfer"
        busy={savingAction}
      />
    </div>
  );
}

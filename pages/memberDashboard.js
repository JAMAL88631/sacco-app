import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';
import NotificationBell from '../components/NotificationBell';
import AdminNotificationPanel from '../components/AdminNotificationPanel';
import { useToast } from '../components/ToastProvider';
import { clearRoleSession, getHomeRouteForRole, normalizeRole } from '../lib/auth';
import {
  fetchMembersForNotifications,
  fetchNotificationsForMember,
  markAllNotificationsRead,
  markNotificationRead,
  sendNotification,
} from '../lib/notifications';

const LOAN_INTEREST_RATE = 0.1;
const REJECTED_LOAN_VISIBLE_HOURS = 12;

function formatKes(value) {
  return `KES ${Number(value || 0).toLocaleString()}`;
}

function getLoanTotalDue(loan) {
  const principal = Number(loan?.amount || 0);
  return Math.round(principal * (1 + LOAN_INTEREST_RATE));
}

function isMissingRejectedAtColumnError(error) {
  const message = String(error?.message || '').toLowerCase();
  const details = String(error?.details || '').toLowerCase();
  return message.includes('rejected_at') || details.includes('rejected_at');
}

function TabButton({ tab, activeTab, onClick }) {
  return (
    <button
      type="button"
      onClick={() => onClick(tab)}
      className={`inline-flex h-9 min-w-[110px] items-center justify-center rounded-md border px-3 text-xs font-semibold capitalize tracking-[0.04em] transition sm:min-w-[120px] ${
        activeTab === tab
          ? 'border-sky-200 bg-sky-300 text-slate-900 shadow-[0_10px_22px_rgba(125,211,252,0.18)]'
          : 'border-white/10 bg-white/5 text-yellow-200 hover:bg-white/12'
      }`}
      style={
        activeTab === tab
          ? {
              backgroundColor: '#7dd3fc',
              color: '#0f172a',
              borderColor: '#bae6fd',
              borderRadius: '10px',
              minHeight: '36px',
              paddingLeft: '12px',
              paddingRight: '12px',
            }
          : {
              color: '#facc15',
              borderRadius: '10px',
              minHeight: '36px',
              paddingLeft: '12px',
              paddingRight: '12px',
            }
      }
    >
      {tab}
    </button>
  );
}

function SectionCard({ title, children, className = '', bodyClassName = '' }) {
  return (
    <section className={`rounded-[1.75rem] border border-white/10 bg-white/95 p-6 text-center shadow-[0_20px_60px_rgba(0,0,0,0.22)] ${className}`}>
      <h2 className="text-2xl font-bold text-green-600 sm:text-3xl" style={{ color: '#16a34a' }}>{title}</h2>
      <div className={`mt-6 ${bodyClassName}`}>{children}</div>
    </section>
  );
}

function SummaryCard({ title, value, subtitle }) {
  return (
    <div className="rounded-[1.75rem] border border-white/10 bg-[linear-gradient(180deg,#102045_0%,#0b1733_100%)] p-5 text-center shadow-[0_16px_40px_rgba(15,23,42,0.28)]">
      <h3 className="text-xl font-bold text-green-600 sm:text-2xl" style={{ color: '#16a34a' }}>{title}</h3>
      <p className="mt-5 text-2xl font-bold text-green-700 sm:text-3xl" style={{ color: '#15803d' }}>{value}</p>
      <p className="mt-3 text-lg text-yellow-700" style={{ color: '#ca8a04' }}>{subtitle}</p>
    </div>
  );
}

function StyledInput({ value, onChange, placeholder, type = 'text' }) {
  return (
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className="mx-auto mt-3 block w-56 max-w-full rounded-full border border-sky-100 bg-white px-4 py-2 text-center text-sm text-slate-900 shadow-[0_10px_24px_rgba(15,23,42,0.08)] outline-none transition placeholder:text-slate-400 focus:border-sky-300 focus:ring-2 focus:ring-sky-100 sm:w-64"
    />
  );
}

export default function MemberDashboard() {
  const router = useRouter();
  const { showToast } = useToast();
  const hasInitializedAdminTab = useRef(false);
  const [member, setMember] = useState(null);
  const [memberId, setMemberId] = useState('');
  const [loans, setLoans] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [depositAmount, setDepositAmount] = useState('');
  const [loanAmount, setLoanAmount] = useState('');
  const [loanPurpose, setLoanPurpose] = useState('');
  const [repaymentAmount, setRepaymentAmount] = useState('');
  const [selectedLoanId, setSelectedLoanId] = useState('');
  const [profileFullName, setProfileFullName] = useState('');
  const [profilePhoneNumber, setProfilePhoneNumber] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [adminMembers, setAdminMembers] = useState([]);
  const [notificationAudience, setNotificationAudience] = useState('all');
  const [notificationRecipientId, setNotificationRecipientId] = useState('');
  const [notificationTitle, setNotificationTitle] = useState('');
  const [notificationBody, setNotificationBody] = useState('');
  const [adminLoanRequests, setAdminLoanRequests] = useState([]);
  const [processingLoanId, setProcessingLoanId] = useState('');

  const loadDashboard = useCallback(async () => {
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
        const newMember = {
          id: user.id,
          email: user.email || '',
          name: user.user_metadata?.full_name || 'Member',
          savings: 0,
          role: 'member',
          is_admin: false,
        };

        const { data: insertedMember, error: insertError } = await supabase
          .from('members')
          .insert([newMember])
          .select()
          .single();

        if (insertError) throw insertError;
        resolvedMember = insertedMember;
      } else if (memberError) {
        throw memberError;
      }

      const { data: loanData, error: loanError } = await supabase
        .from('loans')
        .select('*')
        .eq('member_id', user.id)
        .order('created_at', { ascending: false });

      if (loanError) throw loanError;

      const { data: transactionData, error: transactionError } = await supabase
        .from('transactions')
        .select('*')
        .eq('member_id', user.id)
        .order('created_at', { ascending: false });

      if (transactionError) throw transactionError;

      const resolvedRole = normalizeRole(resolvedMember);
      const isAdminRoute = router.pathname === '/admin';

      if (isAdminRoute && resolvedRole !== 'admin') {
        router.replace(getHomeRouteForRole(resolvedRole));
        return;
      }

      setMember({
        name: resolvedMember?.name || user.user_metadata?.full_name || 'Member',
        email: resolvedMember?.email || user.email || '',
        phoneNumber: resolvedMember?.phone_number || user.user_metadata?.phone_number || '',
        savings: Number(resolvedMember?.savings || 0),
        isAdmin: resolvedRole === 'admin',
        role: resolvedRole,
      });
      setProfileFullName((resolvedMember?.name || user.user_metadata?.full_name || '').trim());
      setProfilePhoneNumber((resolvedMember?.phone_number || user.user_metadata?.phone_number || '').trim());
      setLoans(
        (loanData || []).map((loan) => ({
          ...loan,
          amount: Number(loan.amount || 0),
          repaid: Number(loan.repaid || 0),
          rejected_at: loan.rejected_at || null,
        }))
      );
      setTransactions(
        (transactionData || []).map((tx) => ({
          ...tx,
          amount: Number(tx.amount || 0),
        }))
      );

      if (resolvedRole === 'admin') {
        const { data: pendingLoanData, error: pendingLoanError } = await supabase
          .from('loans')
          .select('id, member_id, amount, purpose, status, repaid, created_at')
          .eq('status', 'pending')
          .order('created_at', { ascending: false });

        if (pendingLoanError) throw pendingLoanError;

        const pendingMemberIds = Array.from(
          new Set((pendingLoanData || []).map((loan) => loan.member_id).filter(Boolean))
        );

        let pendingMembersById = new Map();
        if (pendingMemberIds.length > 0) {
          const { data: pendingMembers, error: pendingMembersError } = await supabase
            .from('members')
            .select('id,name,email')
            .in('id', pendingMemberIds);

          if (pendingMembersError) throw pendingMembersError;

          pendingMembersById = new Map((pendingMembers || []).map((item) => [item.id, item]));
        }

        setAdminLoanRequests(
          (pendingLoanData || []).map((loan) => ({
            ...loan,
            amount: Number(loan.amount || 0),
            repaid: Number(loan.repaid || 0),
            memberName: pendingMembersById.get(loan.member_id)?.name || 'Member',
            memberEmail: pendingMembersById.get(loan.member_id)?.email || 'No email',
          }))
        );
      } else {
        setAdminLoanRequests([]);
      }
    } catch (error) {
      showToast({
        type: 'error',
        title: 'Dashboard error',
        description: error.message || 'Could not load dashboard.',
      });
    } finally {
      setLoading(false);
    }
  }, [router, showToast]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const loadNotifications = useCallback(
    async (currentMemberId) => {
      if (!currentMemberId) {
        return;
      }

      try {
        const { items, unreadCount } = await fetchNotificationsForMember(currentMemberId, 40);
        setNotifications(items);
        setUnreadNotifications(unreadCount);
      } catch (error) {
        showToast({
          type: 'error',
          title: 'Notification error',
          description: error.message || 'Could not load notifications.',
        });
      }
    },
    [showToast]
  );

  useEffect(() => {
    if (!memberId) {
      return undefined;
    }

    void loadNotifications(memberId);

    const intervalId = window.setInterval(() => {
      void loadNotifications(memberId);
    }, 15000);

    return () => window.clearInterval(intervalId);
  }, [loadNotifications, memberId]);

  useEffect(() => {
    if (!member?.isAdmin) {
      return;
    }

    void fetchMembersForNotifications()
      .then((data) => setAdminMembers(data))
      .catch((error) => {
        showToast({
          type: 'error',
          title: 'Member lookup failed',
          description: error.message || 'Could not load members.',
        });
      });
  }, [member?.isAdmin, showToast]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    await clearRoleSession();
    router.push('/auth');
  };

  const handleToggleNotifications = async () => {
    const nextOpen = !isNotificationOpen;
    setIsNotificationOpen(nextOpen);

    if (nextOpen) {
      await loadNotifications(memberId);
    }
  };

  const handleMarkNotificationRead = async (notificationId) => {
    try {
      await markNotificationRead(notificationId, memberId);
      await loadNotifications(memberId);
    } catch (error) {
      showToast({
        type: 'error',
        title: 'Notification update failed',
        description: error.message || 'Could not mark notification as read.',
      });
    }
  };

  const handleMarkAllNotificationsRead = async () => {
    try {
      await markAllNotificationsRead(notifications, memberId);
      await loadNotifications(memberId);
    } catch (error) {
      showToast({
        type: 'error',
        title: 'Notification update failed',
        description: error.message || 'Could not mark notifications as read.',
      });
    }
  };

  const handleDeposit = async () => {
    const amount = Number(depositAmount);
    if (!amount || amount <= 0) {
      showToast({
        type: 'error',
        title: 'Invalid amount',
        description: 'Enter a valid deposit amount.',
      });
      return;
    }

    setBusy(true);
    try {
      const nextSavings = Number(member?.savings || 0) + amount;

      const { error: memberUpdateError } = await supabase
        .from('members')
        .update({ savings: nextSavings })
        .eq('id', memberId);

      if (memberUpdateError) throw memberUpdateError;

      const { error: transactionError } = await supabase.from('transactions').insert([
        {
          member_id: memberId,
          type: 'deposit',
          amount,
          description: 'Savings deposit',
        },
      ]);

      if (transactionError) throw transactionError;

      setDepositAmount('');
      setActiveTab('transactions');
      showToast({
        type: 'success',
        title: 'Deposit successful',
        description: `${formatKes(amount)} has been added to your savings.`,
      });
      await loadDashboard();
    } catch (error) {
      showToast({
        type: 'error',
        title: 'Deposit failed',
        description: error.message || 'Deposit failed.',
      });
    } finally {
      setBusy(false);
    }
  };

  const handleLoanRequest = async () => {
    const amount = Number(loanAmount);
    if (!amount || amount <= 0) {
      showToast({
        type: 'error',
        title: 'Invalid amount',
        description: 'Enter a valid loan amount.',
      });
      return;
    }

    if (!loanPurpose.trim()) {
      showToast({
        type: 'error',
        title: 'Missing purpose',
        description: 'Enter a loan purpose.',
      });
      return;
    }

    setBusy(true);
    try {
      const { error } = await supabase.from('loans').insert([
        {
          member_id: memberId,
          amount,
          purpose: loanPurpose.trim(),
          status: 'pending',
          repaid: 0,
        },
      ]);

      if (error) throw error;

      setLoanAmount('');
      setLoanPurpose('');
      setActiveTab('loans');
      const totalDue = Math.round(amount * (1 + LOAN_INTEREST_RATE));
      showToast({
        type: 'success',
        title: 'Loan application sent',
        description: `Your request for ${formatKes(amount)} has been submitted. Total due with interest: ${formatKes(totalDue)}.`,
      });
      await loadDashboard();
    } catch (error) {
      showToast({
        type: 'error',
        title: 'Loan request failed',
        description: error.message || 'Loan request failed.',
      });
    } finally {
      setBusy(false);
    }
  };

  const repayableLoans = useMemo(
    () =>
      loans.filter((loan) => {
        const status = String(loan.status || '').toLowerCase();
        const outstanding = Math.max(0, getLoanTotalDue(loan) - Number(loan.repaid || 0));
        return (status === 'approved' || status === 'active') && outstanding > 0;
      }),
    [loans]
  );

  const selectedRepaymentLoan = useMemo(
    () => repayableLoans.find((loan) => String(loan.id) === String(selectedLoanId)),
    [repayableLoans, selectedLoanId]
  );

  const visibleLoansInTab = useMemo(() => {
    const maxRejectedAgeMs = REJECTED_LOAN_VISIBLE_HOURS * 60 * 60 * 1000;
    const now = Date.now();

    return loans.filter((loan) => {
      const status = String(loan.status || '').toLowerCase();
      if (status !== 'rejected') {
        return true;
      }

      const rejectedTimestamp = loan.rejected_at ? new Date(loan.rejected_at).getTime() : NaN;
      if (Number.isNaN(rejectedTimestamp)) {
        return false;
      }

      return now - rejectedTimestamp < maxRejectedAgeMs;
    });
  }, [loans]);

  const handleLoanRepayment = async () => {
    const amount = Number(repaymentAmount);

    if (!selectedLoanId) {
      showToast({
        type: 'error',
        title: 'Select a loan',
        description: 'Choose a loan to repay first.',
      });
      return;
    }

    if (!amount || amount <= 0) {
      showToast({
        type: 'error',
        title: 'Invalid amount',
        description: 'Enter a valid repayment amount.',
      });
      return;
    }

    if (!selectedRepaymentLoan) {
      showToast({
        type: 'error',
        title: 'Loan not found',
        description: 'Please refresh and try again.',
      });
      return;
    }

    const outstandingBalance = Math.max(
      0,
      getLoanTotalDue(selectedRepaymentLoan) - Number(selectedRepaymentLoan.repaid || 0)
    );

    if (amount > outstandingBalance) {
      showToast({
        type: 'error',
        title: 'Amount too high',
        description: `Repayment cannot exceed outstanding balance of ${formatKes(outstandingBalance)}.`,
      });
      return;
    }

    setBusy(true);
    try {
      const nextRepaid = Number(selectedRepaymentLoan.repaid || 0) + amount;
      const totalDue = getLoanTotalDue(selectedRepaymentLoan);
      const nextStatus =
        nextRepaid >= totalDue
          ? 'completed'
          : selectedRepaymentLoan.status;

      const { error: updateError } = await supabase
        .from('loans')
        .update({ repaid: nextRepaid, status: nextStatus })
        .eq('id', selectedRepaymentLoan.id)
        .eq('member_id', memberId);

      if (updateError) throw updateError;

      const { error: transactionError } = await supabase.from('transactions').insert([
        {
          member_id: memberId,
          type: 'loan_repayment',
          amount,
          description: `Loan repayment${selectedRepaymentLoan.purpose ? ` - ${selectedRepaymentLoan.purpose}` : ''}`,
        },
      ]);

      if (transactionError) throw transactionError;

      setRepaymentAmount('');
      setActiveTab('transactions');
      showToast({
        type: 'success',
        title: 'Repayment successful',
        description: `${formatKes(amount)} has been applied to your loan.`,
      });
      await loadDashboard();
    } catch (error) {
      showToast({
        type: 'error',
        title: 'Repayment failed',
        description: error.message || 'Could not process repayment.',
      });
    } finally {
      setBusy(false);
    }
  };

  const handleSendNotification = async () => {
    if (!notificationTitle.trim()) {
      showToast({
        type: 'error',
        title: 'Missing title',
        description: 'Enter a notification title.',
      });
      return;
    }

    if (!notificationBody.trim()) {
      showToast({
        type: 'error',
        title: 'Missing message',
        description: 'Enter a notification message.',
      });
      return;
    }

    if (notificationAudience === 'user' && !notificationRecipientId) {
      showToast({
        type: 'error',
        title: 'Member required',
        description: 'Choose a member to notify.',
      });
      return;
    }

    setBusy(true);

    try {
      await sendNotification({
        createdBy: memberId,
        recipientId: notificationAudience === 'user' ? notificationRecipientId : null,
        title: notificationTitle,
        body: notificationBody,
      });

      setNotificationTitle('');
      setNotificationBody('');
      setNotificationRecipientId('');
      setNotificationAudience('all');
      showToast({
        type: 'info',
        title: 'Notification sent',
        description: 'Your alert has been delivered successfully.',
      });
      await loadNotifications(memberId);
    } catch (error) {
      showToast({
        type: 'error',
        title: 'Send failed',
        description: error.message || 'Could not send notification.',
      });
    } finally {
      setBusy(false);
    }
  };

  const handleApproveLoan = async (loan) => {
    if (!loan?.id) {
      return;
    }

    setProcessingLoanId(String(loan.id));
    try {
      const { error: updateError } = await supabase
        .from('loans')
        .update({ status: 'approved' })
        .eq('id', loan.id)
        .eq('status', 'pending');

      if (updateError) throw updateError;

      const { error: transactionError } = await supabase.from('transactions').insert([
        {
          member_id: loan.member_id,
          type: 'loan_disbursement',
          amount: Number(loan.amount || 0),
          description: `Loan disbursement${loan.purpose ? ` - ${loan.purpose}` : ''}`,
        },
      ]);

      if (transactionError) throw transactionError;

      showToast({
        type: 'success',
        title: 'Loan approved',
        description: `${formatKes(loan.amount)} approved for ${loan.memberName}.`,
      });
      await loadDashboard();
    } catch (error) {
      showToast({
        type: 'error',
        title: 'Approval failed',
        description: error.message || 'Could not approve loan.',
      });
    } finally {
      setProcessingLoanId('');
    }
  };

  const handleRejectLoan = async (loan) => {
    if (!loan?.id) {
      return;
    }

    setProcessingLoanId(String(loan.id));
    try {
      const rejectionPayload = {
        status: 'rejected',
        rejected_at: new Date().toISOString(),
      };

      let { error } = await supabase
        .from('loans')
        .update(rejectionPayload)
        .eq('id', loan.id)
        .eq('status', 'pending');

      if (error && isMissingRejectedAtColumnError(error)) {
        const fallback = await supabase
          .from('loans')
          .update({ status: 'rejected' })
          .eq('id', loan.id)
          .eq('status', 'pending');
        error = fallback.error;
      }

      if (error) throw error;

      showToast({
        type: 'info',
        title: 'Loan rejected',
        description: `Loan request from ${loan.memberName} has been rejected.`,
      });
      await loadDashboard();
    } catch (error) {
      showToast({
        type: 'error',
        title: 'Rejection failed',
        description: error.message || 'Could not reject loan.',
      });
    } finally {
      setProcessingLoanId('');
    }
  };

  const handleUpdateProfile = async () => {
    const trimmedName = profileFullName.trim();
    const trimmedPhone = profilePhoneNumber.trim();

    if (!trimmedName || !trimmedPhone) {
      showToast({
        type: 'error',
        title: 'Missing details',
        description: 'Full name and phone number are required.',
      });
      return;
    }

    setProfileSaving(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const accessToken = session?.access_token;
      if (!accessToken) {
        showToast({
          type: 'error',
          title: 'Session expired',
          description: 'Please log in again.',
        });
        setProfileSaving(false);
        return;
      }

      const response = await fetch('/api/complete-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          accessToken,
          fullName: trimmedName,
          phoneNumber: trimmedPhone,
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error || 'Could not update profile.');
      }

      showToast({
        type: 'success',
        title: 'Profile updated',
        description: 'Your personal details were saved successfully.',
      });
      await loadDashboard();
    } catch (error) {
      showToast({
        type: 'error',
        title: 'Update failed',
        description: error.message || 'Could not update personal details.',
      });
    } finally {
      setProfileSaving(false);
    }
  };

  const totals = useMemo(() => {
    const totalSavings = Number(member?.savings || 0);
    const activeLoans = loans.filter((loan) => {
      const status = String(loan.status || '').toLowerCase();
      return status === 'approved' || status === 'active';
    });
    const totalLoanBalance = activeLoans.reduce(
      (sum, loan) => sum + Math.max(0, getLoanTotalDue(loan) - Number(loan.repaid || 0)),
      0
    );
    const totalRepaid = loans.reduce((sum, loan) => sum + loan.repaid, 0);

    return {
      totalSavings,
      availableFunds: totalSavings,
      activeLoansCount: activeLoans.length,
      totalLoanBalance,
      totalRepaid,
    };
  }, [loans, member]);

  useEffect(() => {
    if (!member) {
      return;
    }

    if (!hasInitializedAdminTab.current && router.pathname === '/admin' && activeTab === 'overview') {
      hasInitializedAdminTab.current = true;
      setActiveTab('admin alerts');
    }
  }, [activeTab, member, router.pathname]);

  useEffect(() => {
    if (repayableLoans.length === 0) {
      setSelectedLoanId('');
      return;
    }

    const hasCurrentSelection = repayableLoans.some((loan) => String(loan.id) === String(selectedLoanId));
    if (!hasCurrentSelection) {
      setSelectedLoanId(String(repayableLoans[0].id));
    }
  }, [repayableLoans, selectedLoanId]);

  if (loading) {
    return <div className="min-h-screen bg-[radial-gradient(circle_at_top,#1e3a8a_0%,#102045_42%,#081226_100%)] p-6 text-lg text-white">Loading dashboard...</div>;
  }

  if (!member) {
    return (
      <div className="min-h-screen bg-[radial-gradient(circle_at_top,#1e3a8a_0%,#102045_42%,#081226_100%)] p-6 text-white">
        <p>Could not load dashboard.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#1e3a8a_0%,#102045_42%,#081226_100%)] px-4 py-6 text-white sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-5xl">
        <header className="rounded-[1.9rem] border border-white/10 bg-white/95 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.28)]">
          <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
            <div className="flex-1 text-center md:text-left">
              <h1 className="text-4xl font-black tracking-tight text-green-600 sm:text-5xl" style={{ color: '#16a34a' }}>Welcome, {member.name.toLowerCase()}</h1>
              <p className="mt-4 text-xl text-yellow-700 sm:text-2xl" style={{ color: '#ca8a04' }}>{member.email}</p>
            </div>

            <div className="flex items-start gap-3 self-start">
              {member.isAdmin ? (
                <button
                  type="button"
                  onClick={() => router.push('/admin-analytics')}
                  className="rounded-2xl border border-sky-200 bg-sky-300 px-4 py-2 text-base text-slate-900 sm:text-lg"
                  style={{ backgroundColor: '#7dd3fc', color: '#0f172a', borderColor: '#bae6fd' }}
                >
                  Analytics
                </button>
              ) : null}
              <NotificationBell
                notifications={notifications}
                unreadCount={unreadNotifications}
                isOpen={isNotificationOpen}
                onToggle={handleToggleNotifications}
                onMarkRead={handleMarkNotificationRead}
                onMarkAllRead={handleMarkAllNotificationsRead}
              />
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-2xl border border-sky-200 bg-sky-300 px-4 py-2 text-base text-slate-900 sm:text-lg"
                style={{ backgroundColor: '#7dd3fc', color: '#0f172a', borderColor: '#bae6fd' }}
              >
                Logout
              </button>
            </div>
          </div>
        </header>

        <div className="mt-6 space-y-6">
          <aside className="rounded-[1.9rem] border border-white/10 bg-white/10 p-4 shadow-[0_18px_50px_rgba(0,0,0,0.18)] backdrop-blur">
            <div className="mb-4 text-center">
              <p className="text-sm font-semibold uppercase tracking-[0.25em]" style={{ color: '#facc15' }}>Menu</p>
            </div>
            <nav className="flex flex-wrap items-center justify-center gap-2">
              {[
                'overview',
                'savings',
                'loans',
                'transactions',
                'profile',
                ...(member.isAdmin ? ['loan approvals', 'admin alerts'] : []),
              ].map((tab) => (
                <TabButton key={tab} tab={tab} activeTab={activeTab} onClick={setActiveTab} />
              ))}
            </nav>
          </aside>

          <div>
            {activeTab === 'overview' && (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <SummaryCard title="Total Savings" value={formatKes(totals.totalSavings)} subtitle="Available funds" />
                <SummaryCard title="Active Loans" value={String(totals.activeLoansCount)} subtitle={`Total: ${formatKes(totals.totalLoanBalance)}`} />
                <SummaryCard title="Total Repaid" value={formatKes(totals.totalRepaid)} subtitle="Loan payments made" />
              </div>
            )}

            {activeTab === 'savings' && (
              <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
                <SectionCard title="Deposit Savings">
                  <label className="block text-lg font-medium" style={{ color: '#ca8a04' }}>Amount</label>
                  <StyledInput
                    type="number"
                    value={depositAmount}
                    onChange={(event) => setDepositAmount(event.target.value)}
                    placeholder="Enter amount"
                  />
                  <div className="mt-4 flex justify-center">
                    <button
                      type="button"
                      onClick={handleDeposit}
                      disabled={busy}
                      className="rounded-2xl border border-sky-200 bg-sky-300 px-4 py-2 text-lg text-slate-900 disabled:opacity-60"
                      style={{ backgroundColor: '#7dd3fc', color: '#0f172a', borderColor: '#bae6fd' }}
                    >
                      Deposit
                    </button>
                  </div>
                </SectionCard>

                <SectionCard title="Savings Summary">
                  <p className="text-3xl text-green-700" style={{ color: '#15803d' }}>{formatKes(totals.totalSavings)}</p>
                  <p className="mt-4 text-lg text-yellow-700" style={{ color: '#ca8a04' }}>Current savings balance</p>
                </SectionCard>
              </div>
            )}

            {activeTab === 'loans' && (
              <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
                <SectionCard title="Apply for Loan">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-lg font-medium" style={{ color: '#ca8a04' }}>Loan Amount</label>
                      <StyledInput
                        type="number"
                        value={loanAmount}
                        onChange={(event) => setLoanAmount(event.target.value)}
                        placeholder="Enter amount"
                      />
                    </div>

                    <div>
                      <label className="block text-lg font-medium" style={{ color: '#ca8a04' }}>Purpose</label>
                      <StyledInput
                        value={loanPurpose}
                        onChange={(event) => setLoanPurpose(event.target.value)}
                        placeholder="Loan purpose"
                      />
                    </div>
                  </div>

                  <div className="mt-4 flex justify-center">
                    <button
                      type="button"
                      onClick={handleLoanRequest}
                      disabled={busy}
                      className="rounded-2xl border border-sky-200 bg-sky-300 px-4 py-2 text-lg text-slate-900 disabled:opacity-60"
                      style={{ backgroundColor: '#7dd3fc', color: '#0f172a', borderColor: '#bae6fd' }}
                    >
                      Request Loan
                    </button>
                  </div>

                  <div className="mt-8 border-t border-slate-200 pt-6">
                    <h3 className="text-lg font-semibold" style={{ color: '#16a34a' }}>Repay Loan</h3>
                    {repayableLoans.length === 0 ? (
                      <p className="mt-3 text-sm" style={{ color: '#ca8a04' }}>No active loan with outstanding balance.</p>
                    ) : (
                      <div className="mt-3 space-y-4">
                        <div>
                          <label className="block text-sm font-medium" style={{ color: '#ca8a04' }}>Select Loan</label>
                          <select
                            value={selectedLoanId}
                            onChange={(event) => setSelectedLoanId(event.target.value)}
                            className="mx-auto mt-2 block w-56 max-w-full rounded-full border border-sky-100 bg-white px-4 py-2 text-center text-sm text-slate-900 shadow-[0_10px_24px_rgba(15,23,42,0.08)] outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-100 sm:w-64"
                          >
                            {repayableLoans.map((loan) => {
                              const balance = Math.max(0, getLoanTotalDue(loan) - Number(loan.repaid || 0));
                              return (
                                <option key={loan.id} value={String(loan.id)}>
                                  {(loan.purpose || 'Loan')} - {formatKes(balance)} balance
                                </option>
                              );
                            })}
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium" style={{ color: '#ca8a04' }}>Repayment Amount</label>
                          <StyledInput
                            type="number"
                            value={repaymentAmount}
                            onChange={(event) => setRepaymentAmount(event.target.value)}
                            placeholder="Enter amount"
                          />
                          {selectedRepaymentLoan ? (
                            <p className="mt-2 text-xs" style={{ color: '#ca8a04' }}>
                              Outstanding:{' '}
                              {formatKes(
                                Math.max(
                                  0,
                                  getLoanTotalDue(selectedRepaymentLoan) - Number(selectedRepaymentLoan.repaid || 0)
                                )
                              )}
                            </p>
                          ) : null}
                        </div>

                        <div className="flex justify-center">
                          <button
                            type="button"
                            onClick={handleLoanRepayment}
                            disabled={busy}
                            className="rounded-2xl border border-sky-200 bg-sky-300 px-4 py-2 text-lg text-slate-900 disabled:opacity-60"
                            style={{ backgroundColor: '#7dd3fc', color: '#0f172a', borderColor: '#bae6fd' }}
                          >
                            Repay Loan
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </SectionCard>

                <SectionCard title="Your Loans">
                  <div className="space-y-4">
                    {visibleLoansInTab.length === 0 ? (
                      <p className="text-xl" style={{ color: '#ca8a04' }}>No loans found.</p>
                    ) : (
                      visibleLoansInTab.map((loan) => (
                        <div key={loan.id} className="rounded border border-slate-200 p-4 text-center">
                          <p className="text-xl font-semibold" style={{ color: '#16a34a' }}>{loan.purpose || 'Loan'}</p>
                          <p className="mt-2 text-base" style={{ color: '#ca8a04' }}>Status: {loan.status}</p>
                          <p className="mt-2 text-base" style={{ color: '#15803d' }}>Amount: {formatKes(loan.amount)}</p>
                          <p className="mt-2 text-base" style={{ color: '#15803d' }}>Total Due (10%): {formatKes(getLoanTotalDue(loan))}</p>
                          <p className="mt-2 text-base" style={{ color: '#15803d' }}>Repaid: {formatKes(loan.repaid)}</p>
                          <p className="mt-2 text-base" style={{ color: '#ca8a04' }}>
                            Balance: {formatKes(Math.max(0, getLoanTotalDue(loan) - Number(loan.repaid || 0)))}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </SectionCard>
              </div>
            )}

            {activeTab === 'transactions' && (
              <SectionCard
                title="Transactions"
                className="bg-[linear-gradient(180deg,#102045_0%,#0b1733_100%)]"
                bodyClassName="text-white"
              >
                <div className="space-y-4">
                  {transactions.length === 0 ? (
                    <p className="text-xl">No transactions yet.</p>
                  ) : (
                    transactions.map((tx) => (
                      <div
                        key={tx.id}
                        className="rounded-2xl border border-white/10 bg-[linear-gradient(180deg,#13284f_0%,#0f1f3f_100%)] p-4 text-center shadow-[0_10px_25px_rgba(2,8,23,0.22)]"
                      >
                        <p className="text-xl font-semibold" style={{ color: '#16a34a' }}>{tx.description || tx.type}</p>
                        <p className="mt-2 text-lg font-semibold" style={{ color: '#15803d' }}>{formatKes(tx.amount)}</p>
                        <p className="mt-2 text-sm font-medium" style={{ color: '#ca8a04' }}>
                          {tx.created_at ? new Date(tx.created_at).toLocaleDateString() : ''}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </SectionCard>
            )}

            {activeTab === 'profile' && (
              <SectionCard title="Personal Details">
                <div className="mx-auto w-full max-w-[320px] space-y-2.5 text-left">
                  <div>
                    <label className="block text-sm font-semibold" style={{ color: '#ca8a04' }}>Email Address</label>
                    <input
                      type="email"
                      value={member.email}
                      disabled
                      className="mt-1 w-[320px] max-w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-900 opacity-100 disabled:opacity-100"
                      style={{ backgroundColor: '#ffffff', color: '#0f172a', WebkitTextFillColor: '#0f172a' }}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold" style={{ color: '#ca8a04' }}>Full Name</label>
                    <input
                      type="text"
                      value={profileFullName}
                      onChange={(event) => setProfileFullName(event.target.value)}
                      placeholder="Enter full name"
                      className="mt-1 w-[320px] max-w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-900 outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
                      disabled={profileSaving}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold" style={{ color: '#ca8a04' }}>Phone Number</label>
                    <input
                      type="tel"
                      value={profilePhoneNumber}
                      onChange={(event) => setProfilePhoneNumber(event.target.value)}
                      placeholder="+2547..."
                      className="mt-1 w-[320px] max-w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-900 outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
                      disabled={profileSaving}
                    />
                  </div>

                  <div className="pt-2 text-center">
                    <button
                      type="button"
                      onClick={handleUpdateProfile}
                      disabled={profileSaving}
                      className="rounded-2xl border border-sky-200 bg-sky-300 px-5 py-2.5 text-base font-semibold text-slate-900 disabled:opacity-60"
                      style={{ backgroundColor: '#7dd3fc', color: '#0f172a', borderColor: '#bae6fd' }}
                    >
                      {profileSaving ? 'Saving...' : 'Save Details'}
                    </button>
                  </div>
                </div>
              </SectionCard>
            )}

            {activeTab === 'admin alerts' && member.isAdmin ? (
              <AdminNotificationPanel
                audience={notificationAudience}
                onAudienceChange={setNotificationAudience}
                selectedRecipientId={notificationRecipientId}
                onRecipientChange={setNotificationRecipientId}
                members={adminMembers.filter((adminMember) => adminMember.id !== memberId)}
                title={notificationTitle}
                onTitleChange={setNotificationTitle}
                body={notificationBody}
                onBodyChange={setNotificationBody}
                onSend={handleSendNotification}
                busy={busy}
              />
            ) : null}

            {activeTab === 'loan approvals' && member.isAdmin ? (
              <SectionCard title="Loan Approvals">
                <div className="space-y-4">
                  {adminLoanRequests.length === 0 ? (
                    <p className="text-xl" style={{ color: '#ca8a04' }}>No pending loan requests.</p>
                  ) : (
                    adminLoanRequests.map((loan) => (
                      <div
                        key={loan.id}
                        className="rounded-2xl border border-white/10 bg-[linear-gradient(180deg,#13284f_0%,#0f1f3f_100%)] p-4 text-left shadow-[0_10px_25px_rgba(2,8,23,0.22)]"
                      >
                        <p className="text-lg font-semibold" style={{ color: '#16a34a' }}>
                          {loan.memberName}
                        </p>
                        <p className="mt-1 text-sm" style={{ color: '#ca8a04' }}>{loan.memberEmail}</p>
                        <p className="mt-2 text-sm" style={{ color: '#15803d' }}>
                          Amount: {formatKes(loan.amount)}
                        </p>
                        <p className="mt-1 text-sm" style={{ color: '#ca8a04' }}>
                          Purpose: {loan.purpose || 'General loan'}
                        </p>
                        <p className="mt-1 text-sm" style={{ color: '#ca8a04' }}>
                          Requested:{' '}
                          {loan.created_at ? new Date(loan.created_at).toLocaleDateString() : 'N/A'}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => handleApproveLoan(loan)}
                            disabled={processingLoanId === String(loan.id)}
                            className="rounded-xl border border-emerald-300 bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-900 disabled:opacity-60"
                          >
                            {processingLoanId === String(loan.id) ? 'Processing...' : 'Approve & Disburse'}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRejectLoan(loan)}
                            disabled={processingLoanId === String(loan.id)}
                            className="rounded-xl border border-rose-300 bg-rose-300 px-4 py-2 text-sm font-semibold text-slate-900 disabled:opacity-60"
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </SectionCard>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

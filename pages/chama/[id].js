import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import ChamaDashboardPanel from '../../components/chama/ChamaDashboardPanel';
import { useToast } from '../../components/ToastProvider';
import { supabase } from '../../lib/supabaseClient';

export default function ChamaDashboardPage() {
  const router = useRouter();
  const { id } = router.query;
  const { showToast } = useToast();
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState(null);

  const fetchWithSession = useCallback(async (url, options = {}) => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    const accessToken = session?.access_token;
    if (!accessToken) {
      router.replace('/auth');
      throw new Error('Session expired. Please log in again.');
    }

    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
        ...(options.headers || {}),
      },
    });

    const payload = await response.json().catch(() => ({}));
    if (response.status === 401) {
      router.replace('/auth');
      throw new Error(payload?.error || 'Session expired. Please log in again.');
    }

    if (!response.ok) {
      throw new Error(payload?.error || 'Request failed.');
    }

    return payload;
  }, [router]);

  const loadDashboard = useCallback(async () => {
    if (!id) {
      return;
    }

    setLoading(true);
    try {
      const payload = await fetchWithSession(`/api/chama/${id}/dashboard`, { method: 'GET' });
      setDashboard(payload);
    } catch (error) {
      showToast({
        type: 'error',
        title: 'Chama load failed',
        description: error.message || 'Could not load chama dashboard.',
      });
    } finally {
      setLoading(false);
    }
  }, [fetchWithSession, id, showToast]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const handlePay = async (amount) => {
    if (!id) {
      return;
    }

    if (!amount || amount <= 0) {
      showToast({
        type: 'error',
        title: 'Invalid amount',
        description: 'Enter a valid payment amount.',
      });
      return;
    }

    setBusy(true);
    try {
      const payload = await fetchWithSession('/api/chama/pay', {
        method: 'POST',
        body: JSON.stringify({
          chamaId: id,
          amount,
        }),
      });

      showToast({
        type: 'success',
        title: 'Contribution recorded',
        description: `KES ${Number(payload?.paidAmount || amount).toLocaleString()} received. Remaining cycle balance: KES ${Number(
          payload?.remainingAmount || 0
        ).toLocaleString()}.`,
      });
      await loadDashboard();
    } catch (error) {
      showToast({
        type: 'error',
        title: 'Payment failed',
        description: error.message || 'Could not complete chama payment.',
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#1e3a8a_0%,#102045_42%,#081226_100%)] px-4 py-6 text-white sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-5xl space-y-6">
        <div className="flex justify-between gap-3">
          <Link
            href="/dashboard"
            className="rounded-2xl border border-sky-200 bg-sky-300 px-5 py-3 text-base font-semibold text-slate-900"
            style={{ backgroundColor: '#7dd3fc', color: '#0f172a', borderColor: '#bae6fd' }}
          >
            Main Dashboard
          </Link>
        </div>

        {loading ? (
          <div className="rounded-[1.75rem] border border-white/10 bg-white/95 p-6 text-center shadow-[0_20px_60px_rgba(0,0,0,0.22)]">
            <p style={{ color: '#ca8a04' }}>Loading chama dashboard...</p>
          </div>
        ) : dashboard ? (
          <ChamaDashboardPanel data={dashboard} busy={busy} onPay={handlePay} />
        ) : (
          <div className="rounded-[1.75rem] border border-white/10 bg-white/95 p-6 text-center shadow-[0_20px_60px_rgba(0,0,0,0.22)]">
            <p style={{ color: '#ca8a04' }}>No chama data available.</p>
          </div>
        )}
      </div>
    </div>
  );
}

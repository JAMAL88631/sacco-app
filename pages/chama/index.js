import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useToast } from '../../components/ToastProvider';
import { supabase } from '../../lib/supabaseClient';

const OPEN_TIMEOUT_MS = 8000;

function waitForTimeout(ms) {
  return new Promise((_, reject) => {
    window.setTimeout(() => reject(new Error('Opening the mandatory chama is taking too long. Please try again.')), ms);
  });
}

export default function ChamaHomePage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(true);

  const openMandatoryChama = useCallback(async () => {
    setLoading(true);
    setErrorMessage('');

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const accessToken = session?.access_token;
      if (!accessToken) {
        router.replace('/auth');
        return;
      }

      const payload = await Promise.race([
        fetch('/api/chama/list', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
        }).then(async (response) => {
          const body = await response.json().catch(() => ({}));
          if (!response.ok) {
            throw new Error(body?.error || 'Could not open the mandatory chama dashboard.');
          }
          return body;
        }),
        waitForTimeout(OPEN_TIMEOUT_MS),
      ]);

      const mandatoryChama = payload?.chamas?.[0];
      if (!mandatoryChama?.chamaId) {
        throw new Error('Mandatory chama was not provisioned.');
      }

      router.replace(`/chama/${mandatoryChama.chamaId}`);
    } catch (error) {
      const message = error.message || 'Could not open the mandatory chama dashboard.';
      setErrorMessage(message);
      showToast({
        type: 'error',
        title: 'Chama unavailable',
        description: message,
      });
    } finally {
      setLoading(false);
    }
  }, [router, showToast]);

  useEffect(() => {
    void openMandatoryChama();
  }, [openMandatoryChama]);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#1e3a8a_0%,#102045_42%,#081226_100%)] px-4 py-6 text-white sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[60vh] w-full max-w-5xl items-center justify-center">
        <div className="rounded-[1.75rem] border border-white/10 bg-white/95 p-8 text-center shadow-[0_20px_60px_rgba(0,0,0,0.22)]">
          <p className="text-sm font-semibold uppercase tracking-[0.3em]" style={{ color: '#facc15' }}>
            Chama
          </p>
          <h1 className="mt-4 text-3xl font-black text-green-600 sm:text-4xl" style={{ color: '#16a34a' }}>
            {loading ? 'Opening your mandatory chama dashboard' : 'Mandatory chama access'}
          </h1>
          <p className="mt-4 text-base" style={{ color: '#ca8a04' }}>
            Every member is automatically enrolled, so there is nothing to create or join.
          </p>

          {errorMessage ? (
            <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-left">
              <p className="text-sm font-semibold text-rose-700">We could not open the chama automatically.</p>
              <p className="mt-2 text-sm text-rose-600">{errorMessage}</p>
            </div>
          ) : null}

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => void openMandatoryChama()}
              disabled={loading}
              className="rounded-2xl border border-sky-200 bg-sky-300 px-5 py-3 text-base font-semibold text-slate-900 disabled:opacity-60"
              style={{ backgroundColor: '#7dd3fc', color: '#0f172a', borderColor: '#bae6fd' }}
            >
              {loading ? 'Opening...' : 'Try Again'}
            </button>
            <Link
              href="/dashboard"
              className="rounded-2xl border border-slate-300 bg-white px-5 py-3 text-base font-semibold text-slate-900"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

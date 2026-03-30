import { useEffect, useState } from 'react';
import type { ChamaDashboardPayload } from '../../lib/chama/types';
import ChamaContributionCard from './ChamaContributionCard';
import ChamaMembersList from './ChamaMembersList';

interface ChamaDashboardPanelProps {
  data: ChamaDashboardPayload;
  busy: boolean;
  onPay: () => void;
}

const CHAMA_CYCLE_LENGTH_DAYS = 30;

function addDays(date: Date, days: number) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
}

function formatDateTime(value: Date | null) {
  if (!value) {
    return 'Not available';
  }

  return value.toLocaleString('en-KE', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function ChamaDashboardPanel({ data, busy, onPay }: ChamaDashboardPanelProps) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNow(new Date());
    }, 60000);

    return () => window.clearInterval(intervalId);
  }, []);

  const currentCycleStart = data.currentCycle?.cycleMonth
    ? new Date(`${data.currentCycle.cycleMonth}T00:00:00`)
    : null;
  const nextCycleStart = currentCycleStart ? addDays(currentCycleStart, CHAMA_CYCLE_LENGTH_DAYS) : null;
  const remainingMs = nextCycleStart ? nextCycleStart.getTime() - now.getTime() : null;
  const daysLeft = remainingMs !== null ? (remainingMs > 0 ? Math.ceil(remainingMs / (24 * 60 * 60 * 1000)) : 0) : null;
  const showCycleWarning = daysLeft !== null && daysLeft <= 7 && data.currentUserStatus !== 'paid';

  return (
    <div className="space-y-6">
      <header className="rounded-[1.9rem] border border-white/10 bg-white/95 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.28)]">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.3em]" style={{ color: '#facc15' }}>
              Chama Dashboard
            </p>
            <h1 className="mt-3 text-4xl font-black text-green-600 sm:text-5xl" style={{ color: '#16a34a' }}>
              {data.chama.name}
            </h1>
            <p className="mt-3 text-base sm:text-lg" style={{ color: '#ca8a04' }}>
              {data.chama.description || 'Monthly rotational savings and payout overview.'}
            </p>
          </div>
          <div className="rounded-2xl bg-[linear-gradient(180deg,#102045_0%,#0b1733_100%)] px-5 py-4 text-white shadow-[0_16px_40px_rgba(15,23,42,0.28)]">
            <p className="text-sm font-semibold uppercase tracking-[0.2em]" style={{ color: '#facc15' }}>
              Current Cycle
            </p>
            <p className="mt-2 text-3xl font-black">#{data.currentCycleNumber}</p>
          </div>
        </div>
      </header>

      <section className="rounded-[1.9rem] border border-white/10 bg-[linear-gradient(180deg,#102045_0%,#0b1733_100%)] p-6 text-white shadow-[0_24px_80px_rgba(0,0,0,0.28)]">
        {showCycleWarning ? (
          <div className="mb-5 rounded-2xl border border-amber-300 bg-amber-100/95 p-4 text-center shadow-[0_10px_30px_rgba(245,158,11,0.18)]">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-700">
              Cycle Warning
            </p>
            <p className="mt-2 text-base font-semibold text-amber-900">
              {daysLeft === 0
                ? `Cycle #${data.currentCycleNumber} ends today.`
                : `Cycle #${data.currentCycleNumber} ends in ${daysLeft} day${daysLeft === 1 ? '' : 's'}.`}
            </p>
            <p className="mt-1 text-sm text-amber-800">
              Next cycle starts on {formatDateTime(nextCycleStart)}.
            </p>
            <p className="mt-2 text-sm font-medium text-amber-900">
              Make sure you make your payments before the deadline.
            </p>
          </div>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.2em]" style={{ color: '#facc15' }}>
              Paying Toward
            </p>
            <p className="mt-3 text-3xl font-black text-green-400">#{data.currentCycleNumber}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.2em]" style={{ color: '#facc15' }}>
              Next Cycle
            </p>
            <p className="mt-3 text-3xl font-black text-green-400">#{data.currentCycleNumber + 1}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.2em]" style={{ color: '#facc15' }}>
              Days Left
            </p>
            <p className="mt-3 text-3xl font-black text-green-400">
              {daysLeft ?? 'N/A'}
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.2em]" style={{ color: '#facc15' }}>
              Next Start
            </p>
            <p className="mt-3 text-base font-bold text-green-400">
              {formatDateTime(nextCycleStart)}
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-sm font-semibold uppercase tracking-[0.2em]" style={{ color: '#facc15' }}>
              Current Cycle Start
            </p>
            <p className="mt-2 text-lg font-semibold text-green-400">
              {formatDateTime(currentCycleStart)}
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-sm font-semibold uppercase tracking-[0.2em]" style={{ color: '#facc15' }}>
              Next Cycle Start
            </p>
            <p className="mt-2 text-lg font-semibold text-green-400">
              {formatDateTime(nextCycleStart)}
            </p>
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-[1.75rem] border border-white/10 bg-[linear-gradient(180deg,#102045_0%,#0b1733_100%)] p-5 text-center text-white shadow-[0_16px_40px_rgba(15,23,42,0.28)]">
          <p className="text-sm font-semibold uppercase tracking-[0.2em]" style={{ color: '#facc15' }}>
            Assigned Cycle
          </p>
          <p className="mt-4 text-3xl font-black text-green-400">#{data.assignedCycleNumber}</p>
        </div>
        <div className="rounded-[1.75rem] border border-white/10 bg-[linear-gradient(180deg,#102045_0%,#0b1733_100%)] p-5 text-center text-white shadow-[0_16px_40px_rgba(15,23,42,0.28)]">
          <p className="text-sm font-semibold uppercase tracking-[0.2em]" style={{ color: '#facc15' }}>
            Payout Recipient
          </p>
          <p className="mt-4 text-xl font-bold text-green-400">
            {data.payoutRecipient ? data.payoutRecipient.name : 'No recipient'}
          </p>
        </div>
        <div className="rounded-[1.75rem] border border-white/10 bg-[linear-gradient(180deg,#102045_0%,#0b1733_100%)] p-5 text-center text-white shadow-[0_16px_40px_rgba(15,23,42,0.28)]">
          <p className="text-sm font-semibold uppercase tracking-[0.2em]" style={{ color: '#facc15' }}>
            Paid This Cycle
          </p>
          <p className="mt-4 text-3xl font-black text-green-400">
            {data.totals.totalPaidThisCycle}/{data.totals.expectedThisCycle}
          </p>
        </div>
        <div className="rounded-[1.75rem] border border-white/10 bg-[linear-gradient(180deg,#102045_0%,#0b1733_100%)] p-5 text-center text-white shadow-[0_16px_40px_rgba(15,23,42,0.28)]">
          <p className="text-sm font-semibold uppercase tracking-[0.2em]" style={{ color: '#facc15' }}>
            Rotation Pot
          </p>
          <p className="mt-4 text-3xl font-black text-green-400">
            KES {Number(data.currentCycle?.payoutAmount || 0).toLocaleString()}
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <ChamaContributionCard
          amountDue={data.amountDue}
          currentCyclePaidAmount={data.currentCyclePaidAmount}
          currentCycleRemainingAmount={data.currentCycleRemainingAmount}
          arrears={data.arrears}
          overdueCycles={data.overdueCycles}
          lateFineTotal={data.lateFineTotal}
          currentUserStatus={data.currentUserStatus}
          busy={busy}
          onPay={onPay}
        />
        <ChamaMembersList members={data.members} />
      </div>
    </div>
  );
}

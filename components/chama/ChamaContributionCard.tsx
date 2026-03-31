import { useState } from 'react';
import { CHAMA_MONTHLY_TOTAL } from '../../lib/chama/constants';

interface ChamaContributionCardProps {
  amountDue: number;
  currentCyclePaidAmount: number;
  currentCycleRemainingAmount: number;
  arrears: number;
  overdueCycles: number;
  lateFineTotal: number;
  totalOutstandingAmount: number;
  currentUserStatus: 'paid' | 'pending';
  busy: boolean;
  onPay: (amount: number) => void;
}

export default function ChamaContributionCard({
  amountDue,
  currentCyclePaidAmount,
  currentCycleRemainingAmount,
  arrears,
  overdueCycles,
  lateFineTotal,
  totalOutstandingAmount,
  currentUserStatus,
  busy,
  onPay,
}: ChamaContributionCardProps) {
  const [paymentAmount, setPaymentAmount] = useState('');

  return (
    <section className="rounded-[1.75rem] border border-white/10 bg-white/95 p-6 text-center shadow-[0_20px_60px_rgba(0,0,0,0.22)]">
      <h2 className="text-2xl font-bold text-green-600 sm:text-3xl" style={{ color: '#16a34a' }}>
        Monthly Contribution
      </h2>
      <p className="mt-4 text-4xl font-black text-green-700" style={{ color: '#15803d' }}>
        KES {Number(amountDue || CHAMA_MONTHLY_TOTAL).toLocaleString()}
      </p>
      <p
        className="mt-3 text-sm font-semibold uppercase tracking-[0.25em]"
        style={{ color: currentUserStatus === 'paid' ? '#16a34a' : '#ca8a04' }}
      >
        {currentUserStatus === 'paid' ? 'Paid for current cycle' : 'Pending for current cycle'}
      </p>
      <p className="mt-4 text-base" style={{ color: '#ca8a04' }}>
        Paid so far: KES {Number(currentCyclePaidAmount || 0).toLocaleString()}
      </p>
      <p className="mt-2 text-base" style={{ color: '#ca8a04' }}>
        Remaining this cycle: KES {Number(currentCycleRemainingAmount || amountDue || CHAMA_MONTHLY_TOTAL).toLocaleString()}
      </p>
      <p className="mt-4 text-base" style={{ color: '#ca8a04' }}>
        Arrears: KES {Number(arrears || 0).toLocaleString()}
      </p>
      {overdueCycles > 0 ? (
        <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-left">
          <p className="text-sm font-semibold text-amber-900">
            Late payment penalty applied
          </p>
          <p className="mt-1 text-sm text-amber-800">
            KES {Number(lateFineTotal || 0).toLocaleString()} added for {overdueCycles} overdue cycle
            {overdueCycles === 1 ? '' : 's'} at KES 50 each.
          </p>
          <p className="mt-1 text-sm font-semibold text-amber-900">
            Total outstanding now: KES {Number(totalOutstandingAmount || 0).toLocaleString()}
          </p>
        </div>
      ) : null}
      {currentUserStatus !== 'paid' ? (
        <div className="mt-5">
          <label className="block text-sm font-semibold uppercase tracking-[0.2em]" style={{ color: '#ca8a04' }}>
            Payment Amount
          </label>
          <input
            type="number"
            min="1"
            value={paymentAmount}
            onChange={(event) => setPaymentAmount(event.target.value)}
            placeholder="Enter amount"
            className="mx-auto mt-3 block w-56 max-w-full rounded-full border border-sky-100 bg-white px-4 py-2 text-center text-sm text-slate-900 shadow-[0_10px_24px_rgba(15,23,42,0.08)] outline-none transition placeholder:text-slate-400 focus:border-sky-300 focus:ring-2 focus:ring-sky-100 sm:w-64"
            disabled={busy}
          />
        </div>
      ) : null}
      <button
        type="button"
        onClick={() => {
          const amount = Number(paymentAmount);
          onPay(amount);
        }}
        disabled={busy || currentUserStatus === 'paid'}
        className="mt-6 rounded-2xl border border-sky-200 bg-sky-300 px-5 py-3 text-base font-semibold text-slate-900 disabled:opacity-60"
        style={{ backgroundColor: '#7dd3fc', color: '#0f172a', borderColor: '#bae6fd' }}
      >
        {busy ? 'Processing...' : currentUserStatus === 'paid' ? 'Already Paid' : 'Make Payment'}
      </button>
    </section>
  );
}

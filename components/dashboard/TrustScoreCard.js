import { ShieldCheck } from 'lucide-react';

function ratingTone(rating) {
  if (rating === 'Fair') return 'bg-amber-50 text-amber-600 border-amber-200';
  if (rating === 'Good') return 'bg-emerald-50 text-emerald-600 border-emerald-200';
  return 'bg-rose-50 text-rose-500 border-rose-200';
}

export default function TrustScoreCard({ score }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-5 w-5 text-[#182235]" />
        <h2 className="font-serif text-[1.8rem] font-bold leading-none text-[#182235]">Trust Score</h2>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[220px_minmax(0,1fr)]">
        <div className="flex flex-col items-start gap-4 sm:flex-row xl:flex-col">
          <div className="relative flex h-28 w-28 items-center justify-center rounded-full border-[10px] border-slate-200">
            <div
              className="absolute inset-0 rounded-full border-[10px] border-transparent border-t-[#182235] border-r-[#182235]"
              style={{ transform: `rotate(${Math.max(0, Math.min(240, score.value * 2.4 - 60))}deg)` }}
            />
            <div className="text-center">
              <p className="text-4xl font-black leading-none text-rose-500">{score.value}</p>
              <p className="mt-1 text-xs text-slate-500">of 100</p>
            </div>
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-2xl font-bold text-rose-500">{score.grade}</span>
              <span className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-[#182235]">
                {score.status}
              </span>
            </div>
            <p className="mt-3 max-w-md text-sm leading-6 text-slate-500">{score.summary}</p>
          </div>
        </div>

        <div className="space-y-5">
          {score.metrics.map((metric) => (
            <div key={metric.label}>
              <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm font-semibold text-[#182235]">{metric.label}</p>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-slate-500">{metric.value}/100</span>
                  <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${ratingTone(metric.rating)}`}>
                    {metric.rating}
                  </span>
                </div>
              </div>
              <div className="h-2 rounded-full bg-slate-200">
                <div className="h-2 rounded-full bg-[#182235]" style={{ width: `${metric.value}%` }} />
              </div>
              <p className="mt-2 text-sm text-slate-400">{metric.note}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function StatCard({ title, value, hint, icon, tone = 'default' }) {
  const toneStyles =
    tone === 'primary'
      ? 'border-amber-200 bg-[linear-gradient(135deg,#fffdf7_0%,#fff7dd_100%)]'
      : 'border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#fbfcff_100%)]';

  const iconStyles =
    tone === 'primary' ? 'bg-amber-100 text-[#182235]' : 'bg-slate-100 text-slate-500';

  return (
    <div className={`rounded-2xl border p-5 shadow-[0_10px_30px_rgba(15,23,42,0.05)] ${toneStyles}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="mt-3 truncate text-[2rem] font-black leading-none text-[#182235]">{value}</p>
          <p className="mt-3 min-h-[20px] text-sm text-slate-400">{hint}</p>
        </div>
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${iconStyles}`}>{icon}</div>
      </div>
    </div>
  );
}

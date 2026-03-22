import { Bell, CalendarRange, FileText, LogOut, MoonStar, Plus, Repeat2, Wallet } from 'lucide-react';

function QuickButton({ children, className = '', icon: Icon, onClick, disabled = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
    >
      {Icon ? <Icon className="h-4 w-4" /> : null}
      <span className="truncate">{children}</span>
    </button>
  );
}

export default function DashboardHeader({
  memberName,
  memberId,
  email,
  busy = false,
  onApplyLoan,
  onDepositSavings,
  onTransferShares,
  onViewStatement,
  onNotify,
  onLogout,
}) {
  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-4 border-b border-slate-200 bg-white px-4 py-4 sm:px-6 xl:flex-row xl:items-center xl:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-200 text-sm font-bold text-slate-800">
              {memberName
                .split(' ')
                .map((part) => part[0])
                .join('')
                .slice(0, 2)}
            </div>
            <div className="min-w-0">
              <h1 className="truncate font-serif text-[2rem] font-bold leading-none text-[#182235] sm:text-[2.25rem]">
                Dashboard
              </h1>
              <p className="mt-1 truncate text-sm text-slate-500">
                {memberName} <span className="text-slate-300">&middot;</span> {memberId}
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500">
          <span className="max-w-full truncate">{email}</span>
          <button
            type="button"
            onClick={() => onNotify?.('Theme switch can be connected later.')}
            className="rounded-full p-1 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
          >
            <MoonStar className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => onNotify?.('Notifications panel opened.')}
            className="rounded-full p-1 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
          >
            <Bell className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onLogout}
            className="rounded-full p-1 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>

      <section className="px-4 sm:px-6">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto]">
          <div className="grid gap-3 sm:grid-cols-3">
            <QuickButton
              icon={CalendarRange}
              onClick={() => onNotify?.('Date filter start opened.')}
              className="justify-start border-slate-200 bg-white text-slate-600 hover:border-slate-300"
            >
              From
            </QuickButton>
            <QuickButton
              icon={CalendarRange}
              onClick={() => onNotify?.('Date filter end opened.')}
              className="justify-start border-slate-200 bg-white text-slate-600 hover:border-slate-300"
            >
              To
            </QuickButton>
            <QuickButton
              icon={FileText}
              onClick={onViewStatement}
              className="justify-start border-slate-200 bg-white text-[#182235] hover:border-slate-300"
            >
              Statement
            </QuickButton>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <QuickButton
              icon={Repeat2}
              onClick={onTransferShares}
              disabled={busy}
              className="border-slate-200 bg-white text-slate-600 hover:border-slate-300"
            >
              Transfer Shares
            </QuickButton>
            <QuickButton
              icon={Plus}
              onClick={onApplyLoan}
              disabled={busy}
              className="border-transparent bg-[#182235] text-amber-300 hover:bg-[#101827]"
            >
              Loan
            </QuickButton>
            <QuickButton
              icon={Wallet}
              onClick={onDepositSavings}
              disabled={busy}
              className="border-transparent bg-[#16a34a] text-white hover:bg-[#15803d]"
            >
              Deposit
            </QuickButton>
          </div>
        </div>
      </section>
    </div>
  );
}

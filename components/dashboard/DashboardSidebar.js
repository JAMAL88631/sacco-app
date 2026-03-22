import { CircleDollarSign, LayoutGrid, UserCircle2 } from 'lucide-react';

const navItems = [
  { id: 'account', label: 'My Account', icon: LayoutGrid },
  { id: 'loan', label: 'Apply Loan', icon: CircleDollarSign },
  { id: 'profile', label: 'Profile', icon: UserCircle2 },
];

export default function DashboardSidebar({ activeItem = 'account', onSelect }) {
  return (
    <aside className="flex h-full min-h-screen flex-col border-r border-slate-800 bg-[#182235] text-white">
      <div className="border-b border-slate-700/80 px-6 py-7">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#22314b] text-amber-300">
            <span className="text-lg font-black">S</span>
          </div>
          <div className="min-w-0">
            <p className="font-serif text-2xl font-bold tracking-tight text-amber-300">Sacco</p>
            <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Member Space</p>
          </div>
        </div>
      </div>

      <div className="px-3 py-5">
        <p className="px-3 pb-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Navigation</p>
        <nav className="space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeItem === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelect?.(item.id)}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition ${
                  isActive ? 'bg-[#24314b] text-amber-300' : 'text-slate-100 hover:bg-[#1e2940]'
                }`}
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-full border border-current/30">
                  <Icon className="h-4 w-4" />
                </div>
                <span className="text-sm font-semibold">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      <div className="mt-auto border-t border-slate-700/80 px-4 py-5">
        <div className="rounded-2xl bg-[#22314b] p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Status</p>
          <p className="mt-2 text-sm font-semibold text-slate-100">Everything is synced</p>
          <p className="mt-1 text-xs text-slate-400">Balances, trust score, and activity are up to date.</p>
        </div>
      </div>
    </aside>
  );
}

import { Shield, Sparkles } from 'lucide-react';

const tabs = ['Repayments', 'My Loans', 'Transactions', 'Savings History', 'Growth', 'Requests'];

export default function ActivityTabs({ activeTab, onChange, onGrowthTips, panelContent }) {
  const content = panelContent[activeTab] ?? panelContent.Repayments;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-2.5 shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
        <div className="flex gap-1.5 overflow-x-auto">
          {tabs.map((tab) => {
            const isActive = activeTab === tab;
            const icon =
              tab === 'Growth' ? <Sparkles className="h-4 w-4" /> : tab === 'Requests' ? <Shield className="h-4 w-4" /> : null;

            return (
              <button
                key={tab}
                type="button"
                onClick={() => onChange(tab)}
                className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                  isActive ? 'bg-[#182235] text-amber-300' : 'text-slate-500 hover:bg-slate-50'
                }`}
              >
                {icon}
                {tab}
              </button>
            );
          })}
        </div>
      </div>

      <section className="relative rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <h3 className="font-serif text-[1.9rem] font-bold text-[#182235]">{content.title}</h3>
            <p className="mt-1 text-sm text-slate-400">{content.subtitle}</p>
          </div>

          <button
            type="button"
            onClick={onGrowthTips}
            className="inline-flex items-center gap-2 self-start rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm font-medium text-[#182235] shadow-sm"
          >
            <Sparkles className="h-4 w-4" />
            Tips
            <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs">3</span>
          </button>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {content.items.map((item) => (
            <div key={item.label} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-medium text-slate-500">{item.label}</p>
              <p className="mt-3 text-xl font-black text-[#182235]">{item.value}</p>
              {item.meta ? <p className="mt-2 text-xs text-slate-400">{item.meta}</p> : null}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

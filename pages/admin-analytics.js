import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import {
  Activity,
  ArrowUpRight,
  HandCoins,
  LogOut,
  PiggyBank,
  RefreshCw,
  Users,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { supabase } from '../lib/supabaseClient';
import { clearRoleSession } from '../lib/auth';

const FILTER_OPTIONS = [
  { id: 'daily', label: 'Daily' },
  { id: 'weekly', label: 'Weekly' },
  { id: 'monthly', label: 'Monthly' },
];

const PIE_COLORS = ['#16a34a', '#f59e0b', '#3b82f6', '#ef4444', '#8b5cf6'];

const EMPTY_ANALYTICS = {
  overview: {
    totalSavings: 0,
    totalLoansIssued: 0,
    activeLoans: 0,
    totalMembers: 0,
  },
  charts: {
    savingsGrowth: [],
    loanDistribution: [],
    repaymentStatus: [],
  },
  activity: {
    recentTransactions: [],
    newMembers: [],
    registeredMembers: [],
    rangeStart: null,
  },
  updatedAt: null,
  meta: {
    serviceRoleEnabled: false,
    dataScope: 'session',
    rowCounts: {
      members: 0,
      loans: 0,
      transactions: 0,
    },
    warning: null,
  },
};

function formatKes(value) {
  return `KES ${Number(value || 0).toLocaleString()}`;
}

function toDateSafe(value) {
  const parsed = value ? new Date(value) : null;
  if (!parsed || Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
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

function SummaryCard({ title, value, subtitle, icon }) {
  return (
    <div className="rounded-[1.75rem] border border-white/10 bg-[linear-gradient(180deg,#102045_0%,#0b1733_100%)] p-5 text-center shadow-[0_16px_40px_rgba(15,23,42,0.28)]">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-sky-300">
        {icon}
      </div>
      <h3 className="mt-4 text-xl font-bold text-green-600 sm:text-2xl" style={{ color: '#16a34a' }}>{title}</h3>
      <p className="mt-4 text-2xl font-bold text-green-700 sm:text-3xl" style={{ color: '#15803d' }}>{value}</p>
      <p className="mt-3 text-base text-yellow-700" style={{ color: '#ca8a04' }}>{subtitle}</p>
    </div>
  );
}

function AnalyticsChartCard({ title, subtitle, children }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[linear-gradient(180deg,#13284f_0%,#0f1f3f_100%)] p-4 text-white shadow-[0_10px_25px_rgba(2,8,23,0.22)] sm:p-5">
      <h3 className="text-lg font-bold" style={{ color: '#16a34a' }}>{title}</h3>
      <p className="mt-1 text-sm" style={{ color: '#ca8a04' }}>{subtitle}</p>
      <div className="mt-4 h-[280px] w-full">{children}</div>
    </div>
  );
}

function ActivityList({ emptyText, items, renderItem }) {
  if (!items.length) {
    return <p className="text-base" style={{ color: '#ca8a04' }}>{emptyText}</p>;
  }

  return <div className="space-y-3">{items.map(renderItem)}</div>;
}

export default function AdminAnalyticsDashboard() {
  const router = useRouter();
  const [view, setView] = useState('monthly');
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [analytics, setAnalytics] = useState(EMPTY_ANALYTICS);

  const loadAnalytics = useCallback(
    async ({ silent = false } = {}) => {
      if (silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        const accessToken = session?.access_token;

        if (!accessToken) {
          router.replace('/auth');
          return;
        }

        const requestUrl = `/api/admin/analytics?view=${view}&_=${Date.now()}`;
        const response = await fetch(requestUrl, {
          method: 'GET',
          cache: 'no-store',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Cache-Control': 'no-cache',
            Pragma: 'no-cache',
          },
        });

        const payload = await response.json();

        if (response.status === 401) {
          router.replace('/auth');
          return;
        }

        if (response.status === 403) {
          router.replace(payload?.homeRoute || '/dashboard');
          return;
        }

        if (!response.ok) {
          throw new Error(payload?.error || 'Could not load analytics.');
        }

        setAnalytics({
          overview: payload?.overview || EMPTY_ANALYTICS.overview,
          charts: payload?.charts || EMPTY_ANALYTICS.charts,
          activity: payload?.activity || EMPTY_ANALYTICS.activity,
          updatedAt: payload?.updatedAt || null,
          meta: payload?.meta || EMPTY_ANALYTICS.meta,
        });
        setError('');
      } catch (loadError) {
        setError(loadError.message || 'Could not load admin analytics right now.');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [router, view]
  );

  useEffect(() => {
    void loadAnalytics();
  }, [loadAnalytics]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      void loadAnalytics({ silent: true });
    }, 15000);

    return () => window.clearInterval(intervalId);
  }, [loadAnalytics]);

  useEffect(() => {
    const channel = supabase
      .channel(`admin-analytics-live-${view}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, () => {
        void loadAnalytics({ silent: true });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'loans' }, () => {
        void loadAnalytics({ silent: true });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'members' }, () => {
        void loadAnalytics({ silent: true });
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [loadAnalytics, view]);

  const rangeLabel = useMemo(() => {
    const parsed = toDateSafe(analytics.activity.rangeStart);

    if (!parsed) {
      return '';
    }

    return parsed.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }, [analytics.activity.rangeStart]);

  const handleLogout = useCallback(async () => {
    await supabase.auth.signOut();
    await clearRoleSession();
    router.replace('/auth');
  }, [router]);

  if (loading) {
    return <div className="min-h-screen bg-[radial-gradient(circle_at_top,#1e3a8a_0%,#102045_42%,#081226_100%)] p-6 text-lg text-white">Loading dashboard...</div>;
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#1e3a8a_0%,#102045_42%,#081226_100%)] px-4 py-6 text-white sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-5xl">
        <header className="rounded-[1.9rem] border border-white/10 bg-white/95 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.28)]">
          <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
            <div className="flex-1 text-center md:text-left">
              <h1 className="text-4xl font-black tracking-tight text-green-600 sm:text-5xl" style={{ color: '#16a34a' }}>
                Admin analytics
              </h1>
              <p className="mt-4 text-xl text-yellow-700 sm:text-2xl" style={{ color: '#ca8a04' }}>
                Live SACCO insights across members, savings, and loans.
              </p>
              {error ? (
                <p className="mt-3 text-sm font-semibold text-red-600">{error}</p>
              ) : null}
              {analytics.meta?.warning ? (
                <p className="mt-3 text-sm font-semibold text-amber-600">{analytics.meta.warning}</p>
              ) : null}
              <p className="mt-2 text-sm font-semibold" style={{ color: '#15803d' }}>
                Scope: {analytics.meta?.dataScope === 'global' ? 'Global totals' : 'Session totals'}
              </p>
              <p className="mt-1 text-xs font-medium" style={{ color: '#ca8a04' }}>
                Rows: M {analytics.meta?.rowCounts?.members ?? 0} | L {analytics.meta?.rowCounts?.loans ?? 0} | T{' '}
                {analytics.meta?.rowCounts?.transactions ?? 0}
              </p>
              <p className="mt-1 text-xs font-medium" style={{ color: '#ca8a04' }}>
                Updated: {toDateSafe(analytics.updatedAt)?.toLocaleTimeString('en-GB') || 'N/A'}
              </p>
            </div>

            <div className="flex items-start gap-3 self-start">
              <button
                type="button"
                onClick={() => loadAnalytics({ silent: true })}
                disabled={refreshing}
                className="inline-flex items-center gap-2 rounded-2xl border border-sky-200 bg-sky-300 px-4 py-2 text-base text-slate-900 disabled:opacity-60 sm:text-lg"
                style={{ backgroundColor: '#7dd3fc', color: '#0f172a', borderColor: '#bae6fd' }}
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              <button
                type="button"
                onClick={() => router.push('/dashboard')}
                className="rounded-2xl border border-sky-200 bg-sky-300 px-4 py-2 text-base text-slate-900 sm:text-lg"
                style={{ backgroundColor: '#7dd3fc', color: '#0f172a', borderColor: '#bae6fd' }}
              >
                Member Dashboard
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-2xl border border-sky-200 bg-sky-300 px-4 py-2 text-base text-slate-900 sm:text-lg"
                style={{ backgroundColor: '#7dd3fc', color: '#0f172a', borderColor: '#bae6fd' }}
              >
                <span className="inline-flex items-center gap-2">
                  <LogOut className="h-4 w-4" />
                  Logout
                </span>
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
              {['overview', 'charts', 'activity', 'members'].map((tab) => (
                <TabButton key={tab} tab={tab} activeTab={activeTab} onClick={setActiveTab} />
              ))}
            </nav>

            <div className="mt-4 border-t border-white/10 pt-4">
              <p className="mb-2 text-center text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: '#facc15' }}>Analytics Window</p>
              <div className="flex flex-wrap items-center justify-center gap-2">
                {FILTER_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setView(option.id)}
                    className={`rounded-full border px-4 py-1.5 text-xs font-semibold transition sm:text-sm ${
                      view === option.id
                        ? 'border-sky-200 bg-sky-300 text-slate-900'
                        : 'border-white/20 bg-white/5 text-yellow-200 hover:bg-white/10'
                    }`}
                    style={
                      view === option.id
                        ? { backgroundColor: '#7dd3fc', color: '#0f172a', borderColor: '#bae6fd' }
                        : { color: '#facc15' }
                    }
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </aside>

          <div>
            {activeTab === 'overview' && (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <SummaryCard
                  title="Total Savings"
                  value={formatKes(analytics.overview.totalSavings)}
                  subtitle="Current savings balance"
                  icon={<PiggyBank className="h-5 w-5" />}
                />
                <SummaryCard
                  title="Loans Issued"
                  value={formatKes(analytics.overview.totalLoansIssued)}
                  subtitle="Total disbursed amount"
                  icon={<HandCoins className="h-5 w-5" />}
                />
                <SummaryCard
                  title="Active Loans"
                  value={String(analytics.overview.activeLoans)}
                  subtitle="Open facilities"
                  icon={<Activity className="h-5 w-5" />}
                />
                <SummaryCard
                  title="Members"
                  value={String(analytics.overview.totalMembers)}
                  subtitle="Registered members"
                  icon={<Users className="h-5 w-5" />}
                />
              </div>
            )}

            {activeTab === 'charts' && (
              <SectionCard title="Analytics Charts">
                <div className="grid gap-4 xl:grid-cols-3">
                  <AnalyticsChartCard
                    title="Savings Growth"
                    subtitle={`Trend since ${rangeLabel || 'selected range start'}`}
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={analytics.charts.savingsGrowth} margin={{ top: 8, right: 12, left: 4, bottom: 4 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1f3c6d" />
                        <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#facc15' }} />
                        <YAxis tick={{ fontSize: 12, fill: '#facc15' }} tickFormatter={(value) => `${Math.round(value / 1000)}k`} />
                        <Tooltip formatter={(value) => formatKes(value)} />
                        <Line type="monotone" dataKey="value" stroke="#22c55e" strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </AnalyticsChartCard>

                  <AnalyticsChartCard
                    title="Loan Distribution"
                    subtitle={`By purpose in ${view} view`}
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={analytics.charts.loanDistribution} margin={{ top: 8, right: 10, left: 2, bottom: 6 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1f3c6d" />
                        <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#facc15' }} interval={0} angle={-15} textAnchor="end" height={54} />
                        <YAxis tick={{ fontSize: 12, fill: '#facc15' }} tickFormatter={(value) => `${Math.round(value / 1000)}k`} />
                        <Tooltip formatter={(value) => formatKes(value)} />
                        <Bar dataKey="amount" radius={[8, 8, 0, 0]} fill="#60a5fa" />
                      </BarChart>
                    </ResponsiveContainer>
                  </AnalyticsChartCard>

                  <AnalyticsChartCard
                    title="Repayment Status"
                    subtitle={`Loan health in current ${view} window`}
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Tooltip formatter={(value, _name, item) => [`${value} loan(s)`, item.payload.name]} />
                        <Pie
                          data={analytics.charts.repaymentStatus}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={58}
                          outerRadius={92}
                          paddingAngle={4}
                        >
                          {analytics.charts.repaymentStatus.map((entry, index) => (
                            <Cell key={entry.name} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </AnalyticsChartCard>
                </div>
              </SectionCard>
            )}

            {activeTab === 'activity' && (
              <div className="space-y-6">
                <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
                  <SectionCard title="Latest Transactions">
                    <ActivityList
                      emptyText="No transactions in this period."
                      items={analytics.activity.recentTransactions}
                      renderItem={(item) => (
                        <div
                          key={item.id}
                          className="rounded-2xl border border-white/10 bg-[linear-gradient(180deg,#13284f_0%,#0f1f3f_100%)] p-4 text-center shadow-[0_10px_25px_rgba(2,8,23,0.22)]"
                        >
                          <p className="text-xl font-semibold" style={{ color: '#16a34a' }}>{item.description || item.type}</p>
                          <p className="mt-2 text-base" style={{ color: '#ca8a04' }}>{item.memberName}</p>
                          <p className="mt-2 text-lg font-semibold" style={{ color: '#15803d' }}>{formatKes(item.amount)}</p>
                          <p className="mt-2 text-sm font-medium" style={{ color: '#ca8a04' }}>
                            {toDateSafe(item.created_at)?.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) || 'N/A'}
                          </p>
                        </div>
                      )}
                    />
                  </SectionCard>

                  <SectionCard title="New Members">
                    <ActivityList
                      emptyText="No new members in this period."
                      items={analytics.activity.newMembers}
                      renderItem={(member) => (
                        <div
                          key={member.id}
                          className="rounded-2xl border border-white/10 bg-[linear-gradient(180deg,#13284f_0%,#0f1f3f_100%)] p-4 text-center shadow-[0_10px_25px_rgba(2,8,23,0.22)]"
                        >
                          <p className="text-xl font-semibold" style={{ color: '#16a34a' }}>{member.name || 'Member'}</p>
                          <p className="mt-2 text-base" style={{ color: '#ca8a04' }}>{member.email || 'No email'}</p>
                          <p className="mt-2 inline-flex items-center justify-center gap-1 text-sm font-medium" style={{ color: '#15803d' }}>
                            <ArrowUpRight className="h-3.5 w-3.5" />
                            {toDateSafe(member.created_at)?.toLocaleDateString('en-GB', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            }) || 'N/A'}
                          </p>
                        </div>
                      )}
                    />
                  </SectionCard>
                </div>

                <SectionCard title="Registered Members">
                  <ActivityList
                    emptyText="No registered members found."
                    items={analytics.activity.registeredMembers}
                    renderItem={(member) => (
                      <div
                        key={member.id}
                        className="rounded-2xl border border-white/10 bg-[linear-gradient(180deg,#13284f_0%,#0f1f3f_100%)] p-4 text-left shadow-[0_10px_25px_rgba(2,8,23,0.22)]"
                      >
                        <p className="text-lg font-semibold" style={{ color: '#16a34a' }}>{member.name || 'Member'}</p>
                        <p className="mt-1 text-sm font-medium" style={{ color: '#ca8a04' }}>Email: {member.email || 'No email'}</p>
                        <p className="mt-1 text-sm font-medium" style={{ color: '#ca8a04' }}>
                          Phone: {member.phone_number || 'No phone number'}
                        </p>
                      </div>
                    )}
                  />
                </SectionCard>
              </div>
            )}

            {activeTab === 'members' && (
              <SectionCard title="Registered Members">
                <ActivityList
                  emptyText="No registered members found."
                  items={analytics.activity.registeredMembers}
                  renderItem={(member) => (
                    <div
                      key={member.id}
                      className="rounded-2xl border border-white/10 bg-[linear-gradient(180deg,#13284f_0%,#0f1f3f_100%)] p-4 text-left shadow-[0_10px_25px_rgba(2,8,23,0.22)]"
                    >
                      <p className="text-lg font-semibold" style={{ color: '#16a34a' }}>{member.name || 'Member'}</p>
                      <p className="mt-1 text-sm font-medium" style={{ color: '#ca8a04' }}>Email: {member.email || 'No email'}</p>
                      <p className="mt-1 text-sm font-medium" style={{ color: '#ca8a04' }}>
                        Phone: {member.phone_number || 'No phone number'}
                      </p>
                    </div>
                  )}
                />
              </SectionCard>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

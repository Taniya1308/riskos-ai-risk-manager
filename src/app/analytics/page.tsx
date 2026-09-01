'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  TrendingUp, MapPin, BarChart3, Shield, DollarSign,
  AlertTriangle, CheckCircle, RefreshCw, Activity,
  PieChart, Target, Zap,
} from 'lucide-react';

interface AnalyticsData {
  summary: {
    total_transactions: number;
    total_cases: number;
    total_amount_screened: number;
    amount_blocked: number;
    fraud_rate: number;
    avg_risk_score: number;
  };
  severity_breakdown: Record<string, number>;
  status_breakdown: Record<string, number>;
  top_locations: { location: string; count: number; avg_score: number }[];
  score_distribution: { range: string; count: number }[];
  top_rules: { rule: string; count: number }[];
  amount_ranges: { range: string; count: number }[];
  daily_trend: { date: string; cases: number; blocked: number; amount: number }[];
}

function fmt(n: number) {
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(1)}Cr`;
  if (n >= 100000)   return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000)     return `₹${(n / 1000).toFixed(0)}K`;
  return `₹${n}`;
}

function BarItem({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-slate-400 truncate max-w-[160px]" title={label}>{label}</span>
        <span className="font-bold text-slate-200 ml-2 flex-shrink-0">{value}</span>
      </div>
      <div className="h-2 w-full bg-white/[0.05] rounded-full overflow-hidden">
        <div className={`h-2 rounded-full transition-all duration-700 ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function MiniBar({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <div className={`h-2.5 w-2.5 rounded-full flex-shrink-0 ${color}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-slate-400 capitalize">{label}</span>
          <span className="text-xs font-bold text-slate-200">{value} <span className="text-slate-600 font-normal">({pct}%)</span></span>
        </div>
        <div className="h-1.5 w-full bg-white/[0.05] rounded-full">
          <div className={`h-1.5 rounded-full transition-all duration-700 ${color}`} style={{ width: `${pct}%` }} />
        </div>
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/analytics');
      setData(await res.json());
    } catch { }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const maxDailyCase = data ? Math.max(...data.daily_trend.map(d => d.cases), 1) : 1;
  const totalStatus  = data ? Object.values(data.status_breakdown).reduce((a, b) => a + b, 0) : 0;
  const totalSev     = data ? Object.values(data.severity_breakdown).reduce((a, b) => a + b, 0) : 0;

  return (
    <div className="min-h-screen text-slate-100">
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute top-0 right-1/3 w-[500px] h-[400px] bg-violet-600/[0.04] rounded-full blur-3xl" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-black font-mono text-white">Analytics</h1>
          <p className="text-sm text-slate-500 mt-1">Fraud trends, risk patterns, and operational metrics</p>
          </div>
          <button onClick={fetchData} disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-white/[0.08] bg-white/[0.03] text-xs text-slate-400 hover:text-white hover:bg-white/[0.06] transition">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-3 py-32">
            <div className="h-6 w-6 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
            <span className="text-slate-500">Loading analytics…</span>
          </div>
        ) : data ? (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {[
                { label: 'Total Screened',   value: data.summary.total_transactions, icon: Activity,      color: 'text-slate-300', border: 'border-white/[0.08]',      bg: 'bg-white/[0.02]' },
                { label: 'Total Cases',      value: data.summary.total_cases,        icon: Shield,        color: 'text-indigo-400', border: 'border-indigo-500/20',    bg: 'bg-indigo-500/[0.04]' },
                { label: 'Amount Screened',  value: fmt(data.summary.total_amount_screened), icon: DollarSign, color: 'text-blue-400', border: 'border-blue-500/20', bg: 'bg-blue-500/[0.04]' },
                { label: 'Amount Blocked',   value: fmt(data.summary.amount_blocked), icon: AlertTriangle, color: 'text-red-400',   border: 'border-red-500/20',       bg: 'bg-red-500/[0.04]' },
                { label: 'Fraud Rate',       value: `${data.summary.fraud_rate}%`,   icon: Target,        color: 'text-orange-400', border: 'border-orange-500/20',   bg: 'bg-orange-500/[0.04]' },
                { label: 'Avg Risk Score',   value: data.summary.avg_risk_score,     icon: BarChart3,     color: 'text-amber-400',  border: 'border-amber-500/20',    bg: 'bg-amber-500/[0.04]' },
              ].map(({ label, value, icon: Icon, color, border, bg }) => (
                <div key={label} className={`rounded-2xl border ${border} ${bg} p-4 flex flex-col gap-2 backdrop-blur-sm`}>
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] text-slate-500 font-medium">{label}</p>
                    <Icon className={`h-3.5 w-3.5 ${color}`} />
                  </div>
                  <p className={`text-xl font-black ${color}`}>{value}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

              {/* Daily Trend */}
              <div className="lg:col-span-2 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-6 backdrop-blur-sm">
                <div className="flex items-center gap-2 mb-5">
                  <TrendingUp className="h-4 w-4 text-indigo-400" />
                  <p className="text-sm font-bold text-slate-200">7-Day Fraud Trend</p>
                </div>
                <div className="flex items-end gap-2 h-32">
                  {data.daily_trend.map((day, i) => {
                    const h  = maxDailyCase > 0 ? (day.cases   / maxDailyCase) * 100 : 0;
                    const bh = maxDailyCase > 0 ? (day.blocked / maxDailyCase) * 100 : 0;
                    return (
                      <div
                        key={i}
                        className="flex-1 flex flex-col items-center gap-1"
                        title={`${day.date}: ${day.cases} cases, ${day.blocked} blocked`}
                      >
                        <div className="w-full flex flex-col justify-end gap-0.5" style={{ height: '96px' }}>
                          <div className="w-full bg-red-500/70 rounded-t transition-all duration-700 hover:bg-red-500"
                            style={{ height: `${bh}%`, minHeight: day.blocked > 0 ? '3px' : '0' }} />
                          <div className="w-full bg-indigo-500/40 rounded-t transition-all duration-700 hover:bg-indigo-500/60"
                            style={{ height: `${Math.max(h - bh, 0)}%`, minHeight: day.cases > day.blocked ? '3px' : '0' }} />
                        </div>
                        <p className="text-[9px] text-slate-600 whitespace-nowrap">{day.date}</p>
                      </div>
                    );
                  })}
                </div>
                <div className="flex items-center gap-4 mt-3 text-[11px] text-slate-500">
                  <div className="flex items-center gap-1.5"><div className="h-2.5 w-2.5 rounded bg-indigo-500/40" /> Total cases</div>
                  <div className="flex items-center gap-1.5"><div className="h-2.5 w-2.5 rounded bg-red-500/70" /> Blocked</div>
                </div>
              </div>

              {/* Severity Breakdown */}
              <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-6 backdrop-blur-sm">
                <div className="flex items-center gap-2 mb-5">
                  <PieChart className="h-4 w-4 text-violet-400" />
                  <p className="text-sm font-bold text-slate-200">Risk Severity</p>
                </div>
                <div className="space-y-3">
                  {[
                    { key: 'critical', label: 'Critical', color: 'bg-red-500' },
                    { key: 'high',     label: 'High',     color: 'bg-orange-500' },
                    { key: 'medium',   label: 'Medium',   color: 'bg-yellow-500' },
                    { key: 'low',      label: 'Low',      color: 'bg-emerald-500' },
                  ].map(({ key, label, color }) => (
                    <MiniBar key={key} label={label} value={data.severity_breakdown[key] || 0} total={totalSev} color={color} />
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">

              {/* Top Risky Locations */}
              <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-6 backdrop-blur-sm">
                <div className="flex items-center gap-2 mb-5">
                  <MapPin className="h-4 w-4 text-blue-400" />
                  <p className="text-sm font-bold text-slate-200">Top Risk Locations</p>
                  <span className="text-[11px] text-slate-600">by avg score</span>
                </div>
                <div className="space-y-3">
                  {data.top_locations.length === 0 ? (
                    <p className="text-xs text-slate-600">No location data yet</p>
                  ) : (
                    data.top_locations.slice(0, 6).map(loc => (
                      <BarItem
                        key={loc.location}
                        label={loc.location}
                        value={loc.avg_score}
                        max={100}
                        color={loc.avg_score >= 80 ? 'bg-red-500' : loc.avg_score >= 60 ? 'bg-orange-500' : loc.avg_score >= 40 ? 'bg-yellow-500' : 'bg-emerald-500'}
                      />
                    ))
                  )}
                </div>
              </div>

              {/* Score Distribution */}
              <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-6 backdrop-blur-sm">
                <div className="flex items-center gap-2 mb-5">
                  <BarChart3 className="h-4 w-4 text-amber-400" />
                  <p className="text-sm font-bold text-slate-200">Score Distribution</p>
                </div>
                <div className="space-y-3">
                  {data.score_distribution.map(({ range, count }) => (
                    <BarItem
                      key={range}
                      label={range}
                      value={count}
                      max={Math.max(...data.score_distribution.map(s => s.count), 1)}
                      color={range.startsWith('81') ? 'bg-red-500' : range.startsWith('61') ? 'bg-orange-500' : range.startsWith('41') ? 'bg-yellow-500' : 'bg-emerald-500'}
                    />
                  ))}
                </div>
              </div>

              {/* Top Triggered Rules */}
              <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-6 backdrop-blur-sm">
                <div className="flex items-center gap-2 mb-5">
                  <Zap className="h-4 w-4 text-purple-400" />
                  <p className="text-sm font-bold text-slate-200">Most Triggered Rules</p>
                </div>
                <div className="space-y-3">
                  {data.top_rules.length === 0 ? (
                    <p className="text-xs text-slate-600">No rules triggered yet — simulate a webhook first</p>
                  ) : (
                    data.top_rules.map(({ rule, count }) => (
                      <BarItem
                        key={rule}
                        label={rule}
                        value={count}
                        max={Math.max(...data.top_rules.map(r => r.count), 1)}
                        color="bg-violet-500"
                      />
                    ))
                  )}
                </div>
              </div>

              {/* Status Breakdown */}
              <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-6 backdrop-blur-sm">
                <div className="flex items-center gap-2 mb-5">
                  <CheckCircle className="h-4 w-4 text-emerald-400" />
                  <p className="text-sm font-bold text-slate-200">Case Outcomes</p>
                </div>
                <div className="space-y-3">
                  {[
                    { key: 'new',       label: 'Pending Review', color: 'bg-amber-500' },
                    { key: 'blocked',   label: 'Blocked',        color: 'bg-red-500' },
                    { key: 'approved',  label: 'Approved',       color: 'bg-emerald-500' },
                    { key: 'escalated', label: 'Escalated',      color: 'bg-purple-500' },
                  ].map(({ key, label, color }) => (
                    <MiniBar key={key} label={label} value={data.status_breakdown[key] || 0} total={totalStatus} color={color} />
                  ))}
                </div>
              </div>

              {/* Amount Ranges */}
              <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-6 backdrop-blur-sm">
                <div className="flex items-center gap-2 mb-5">
                  <DollarSign className="h-4 w-4 text-emerald-400" />
                  <p className="text-sm font-bold text-slate-200">Transaction Amounts</p>
                </div>
                <div className="space-y-3">
                  {data.amount_ranges.map(({ range, count }) => (
                    <BarItem
                      key={range}
                      label={range}
                      value={count}
                      max={Math.max(...data.amount_ranges.map(r => r.count), 1)}
                      color="bg-blue-500"
                    />
                  ))}
                </div>
              </div>

              {/* Quick Insights */}
              <div className="rounded-2xl border border-indigo-500/20 bg-indigo-500/[0.04] p-6 backdrop-blur-sm">
                <div className="flex items-center gap-2 mb-5">
                  <Target className="h-4 w-4 text-indigo-400" />
                  <p className="text-sm font-bold text-slate-200">Key Insights</p>
                </div>
                <div className="space-y-3 text-xs text-slate-400 leading-relaxed">
                  <div className="flex items-start gap-2 p-3 rounded-xl bg-white/[0.03] border border-white/[0.05]">
                    <span className="text-red-400 font-bold flex-shrink-0">→</span>
                    <span>{data.severity_breakdown.critical > 0
                      ? `${data.severity_breakdown.critical} critical-risk payment${data.severity_breakdown.critical > 1 ? 's' : ''} detected — review these first`
                      : 'No critical-risk payments — system is operating normally'}</span>
                  </div>
                  <div className="flex items-start gap-2 p-3 rounded-xl bg-white/[0.03] border border-white/[0.05]">
                    <span className="text-emerald-400 font-bold flex-shrink-0">→</span>
                    <span>{fmt(data.summary.amount_blocked)} in potentially fraudulent payments blocked from processing</span>
                  </div>
                  <div className="flex items-start gap-2 p-3 rounded-xl bg-white/[0.03] border border-white/[0.05]">
                    <span className="text-amber-400 font-bold flex-shrink-0">→</span>
                    <span>{data.status_breakdown.new > 0
                      ? `${data.status_breakdown.new} case${data.status_breakdown.new > 1 ? 's' : ''} pending analyst review`
                      : 'No pending cases — all caught up'}</span>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <p className="text-slate-500 text-sm text-center py-20">Failed to load analytics data</p>
        )}
      </div>
    </div>
  );
}

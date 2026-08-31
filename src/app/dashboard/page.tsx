'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import {
  ShieldAlert, Activity, CheckCircle, AlertTriangle, RefreshCw,
  Zap, Sparkles, XCircle, TrendingUp, Bot, Clock, ChevronRight,
  Database, DollarSign, Lock, X, Shield,
} from 'lucide-react';
import RiskDetailsModal from '@/components/RiskDetailsModal';

interface RiskCase {
  id: string;
  status: string;
  created_at: string;
  transactions?: {
    id: string;
    razorpay_payment_id: string;
    customer_id: string;
    amount: number;
    currency: string;
    status: string;
    device_id: string;
    location_id: string;
  };
  risk_scores?: {
    score: number;
    severity: string;
    signals?: unknown[];
    triggered_rules?: string[];
    recommended_action?: string;
  };
}

interface Stats {
  total_screened: number;
  blocked: number;
  approved: number;
  escalated: number;
  critical: number;
  auto_blocked: number;
  refunds_issued: number;
  amount_protected: number;
  avg_risk_score: number;
  detection_rate: number;
}

interface ServiceStatus { status: 'ok' | 'degraded' | 'offline'; message: string; }
interface HealthData { status: 'ok' | 'degraded' | 'offline'; services: Record<string, ServiceStatus>; }
interface Toast { id: string; type: 'critical' | 'info' | 'success' | 'warning'; title: string; message: string; }

const SEV: Record<string, { dot: string; bar: string; badge: string; text: string }> = {
  critical: { dot: 'bg-red-500',     bar: 'bg-red-500',     badge: 'bg-red-500/10 text-red-400 border-red-500/25',     text: 'text-red-400' },
  high:     { dot: 'bg-orange-500',  bar: 'bg-orange-500',  badge: 'bg-orange-500/10 text-orange-400 border-orange-500/25', text: 'text-orange-400' },
  medium:   { dot: 'bg-yellow-500',  bar: 'bg-yellow-500',  badge: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/25', text: 'text-yellow-400' },
  low:      { dot: 'bg-emerald-500', bar: 'bg-emerald-500', badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25', text: 'text-emerald-400' },
};

const STATUS: Record<string, string> = {
  new:       'bg-amber-500/10 text-amber-400 border-amber-500/25',
  approved:  'bg-emerald-500/10 text-emerald-400 border-emerald-500/25',
  blocked:   'bg-red-500/10 text-red-400 border-red-500/25',
  escalated: 'bg-purple-500/10 text-purple-400 border-purple-500/25',
};

const SVC_DOT   = { ok: 'bg-emerald-400', degraded: 'bg-amber-400', offline: 'bg-red-400' };
const SVC_COLOR = { ok: 'text-emerald-400', degraded: 'text-amber-400', offline: 'text-red-400' };

function timeAgo(d: string) {
  const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function fmt(n: number) {
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(0)}K`;
  return `₹${n}`;
}

function scoreColor(s: number) {
  if (s >= 80) return 'text-red-400';
  if (s >= 60) return 'text-orange-400';
  if (s >= 40) return 'text-yellow-400';
  return 'text-emerald-400';
}

// Mini circular score
function ScoreBadge({ score }: { score: number }) {
  const c = score >= 80 ? '#f87171' : score >= 60 ? '#fb923c' : score >= 40 ? '#facc15' : '#34d399';
  const r = 14, circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  return (
    <div className="relative flex items-center justify-center w-9 h-9 flex-shrink-0">
      <svg className="absolute w-9 h-9 -rotate-90" viewBox="0 0 36 36">
        <circle cx="18" cy="18" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3" />
        <circle cx="18" cy="18" r={r} fill="none" strokeWidth="3" stroke={c}
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.8s ease' }} />
      </svg>
      <span className="text-[10px] font-black z-10" style={{ color: c }}>{score}</span>
    </div>
  );
}

// Toast
function Toasts({ toasts, dismiss }: { toasts: Toast[]; dismiss: (id: string) => void }) {
  if (!toasts.length) return null;
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none">
      {toasts.map(t => (
        <div key={t.id} className={`pointer-events-auto flex items-start gap-3 rounded-2xl border p-4 shadow-2xl backdrop-blur-xl animate-in slide-in-from-right duration-300 ${
          t.type === 'critical' ? 'bg-red-950/95 border-red-700/50' :
          t.type === 'success'  ? 'bg-emerald-950/95 border-emerald-700/50' :
          t.type === 'warning'  ? 'bg-amber-950/95 border-amber-700/50' :
          'bg-slate-900/95 border-white/[0.1]'
        }`}>
          <div className="flex-shrink-0 mt-0.5">
            {t.type === 'critical' ? <AlertTriangle className="h-4 w-4 text-red-400" /> :
             t.type === 'success'  ? <CheckCircle className="h-4 w-4 text-emerald-400" /> :
             t.type === 'warning'  ? <AlertTriangle className="h-4 w-4 text-amber-400" /> :
             <Bot className="h-4 w-4 text-indigo-400" />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-white">{t.title}</p>
            <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{t.message}</p>
          </div>
          <button onClick={() => dismiss(t.id)} className="flex-shrink-0 text-slate-500 hover:text-slate-300 transition">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}

export default function Dashboard() {
  const [cases, setCases] = useState<RiskCase[]>([]);
  const [selected, setSelected] = useState<RiskCase | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [simulating, setSimulating] = useState(false);
  const [simType, setSimType] = useState<string | null>(null);
  const [source, setSource] = useState<'supabase' | 'mock'>('mock');
  const [refreshed, setRefreshed] = useState(new Date());
  const [stats, setStats] = useState<Stats | null>(null);
  const [health, setHealth] = useState<HealthData | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const prevCount = useRef(0);

  const toast = useCallback((t: Omit<Toast, 'id'>) => {
    const id = `t_${Date.now()}`;
    setToasts(p => [...p.slice(-2), { ...t, id }]);
    setTimeout(() => setToasts(p => p.filter(x => x.id !== id)), 6000);
  }, []);

  const fetchStats = useCallback(async () => {
    try { const r = await fetch('/api/stats'); setStats(await r.json()); } catch {}
  }, []);

  const fetchHealth = useCallback(async () => {
    try { const r = await fetch('/api/health'); setHealth(await r.json()); } catch {}
  }, []);

  const fetchCases = useCallback(async (notify = false) => {
    setLoading(true);
    try {
      const r = await fetch('/api/cases');
      const d = await r.json();
      if (d.cases) {
        setCases(d.cases);
        setSource(d.source || 'mock');
        setRefreshed(new Date());
        if (notify && d.cases.length > prevCount.current) {
          const c = d.cases[0];
          const s = c?.risk_scores?.score || 0;
          if (c?.status === 'blocked' && s >= 85) {
            toast({ type: 'critical', title: '🚨 Auto-Blocked: Critical Risk', message: `${c.transactions?.razorpay_payment_id?.slice(0,18) || c.id.slice(0,8)} scored ${s}/100 — blocked & refunded automatically.` });
          } else if (s >= 60) {
            toast({ type: 'warning', title: '⚠️ New High-Risk Case', message: `Score ${s}/100 (${c.risk_scores?.severity}) — requires analyst review.` });
          }
        }
        prevCount.current = d.cases.length;
      }
    } catch { } finally { setLoading(false); }
  }, [toast]);

  useEffect(() => {
    fetchCases(false); fetchStats(); fetchHealth();
    let ch: ReturnType<typeof supabase.channel> | undefined;
    try {
      ch = supabase.channel('rt').on('postgres_changes', { event: '*', schema: 'public', table: 'risk_cases' }, () => { fetchCases(true); fetchStats(); }).subscribe();
    } catch {}
    return () => { if (ch) supabase.removeChannel(ch); };
  }, [fetchCases, fetchStats]);

  async function handleDecision(caseId: string, decision: 'approved' | 'blocked' | 'escalated') {
    const r = await fetch('/api/cases', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ caseId, decision, actor: 'Analyst_Current' }) });
    const d = await r.json();
    if (decision === 'blocked' && d.refund) {
      toast(d.refund.success
        ? { type: 'success', title: '✅ Refund Issued', message: `${d.refund.refund_id} processed${d.refund.simulated ? ' (simulated)' : ''}.` }
        : { type: 'warning', title: '⚠️ Refund Failed', message: d.refund.error || 'Unknown error' });
    }
    await fetchCases(false); await fetchStats();
  }

  async function simulate(type: 'high_risk' | 'medium_risk' | 'low_risk' | 'failed') {
    setSimulating(true); setSimType(type);
    const cfgs = {
      high_risk:   { event: 'payment.authorized', amount: 18500000, device_id: 'dev_fingerprint_anomaly_tor_exit', location_id: 'IN_MUMBAI_HIGH_RISK_TOR', customer_id: 'cust_anon_demo' },
      medium_risk: { event: 'payment.authorized', amount: 7500000,  device_id: 'device_unknown',                  location_id: 'IN_DELHI_VPN',              customer_id: 'cust_judge_demo' },
      low_risk:    { event: 'payment.captured',   amount: 1200000,  device_id: 'dev_chrome_android_v14',          location_id: 'IN_BANGALORE',              customer_id: 'cust_regular_456' },
      failed:      { event: 'payment.failed',     amount: 4500000,  device_id: 'device_unknown',                  location_id: 'unknown',                   customer_id: 'cust_anonymous' },
    };
    const cfg = cfgs[type];
    try {
      await fetch('/api/webhooks/razorpay', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event: cfg.event, payload: { payment: { entity: { id: `pay_demo_${Date.now().toString().slice(-8)}`, customer_id: cfg.customer_id, amount: cfg.amount, currency: 'INR', status: cfg.event === 'payment.failed' ? 'failed' : 'captured', notes: { device_id: cfg.device_id, location_id: cfg.location_id } } } } }),
      });
      setTimeout(() => { fetchCases(true); fetchStats(); }, 400);
    } catch {}
    finally { setSimulating(false); setSimType(null); }
  }

  const pending   = cases.filter(c => !c.status || c.status === 'new').length;
  const critical  = cases.filter(c => c.risk_scores?.severity === 'critical').length;
  const blocked   = cases.filter(c => c.status === 'blocked').length;
  const approved  = cases.filter(c => c.status === 'approved').length;
  const avg       = cases.length ? Math.round(cases.reduce((s, c) => s + (c.risk_scores?.score || 0), 0) / cases.length) : 0;

  return (
    <div className="min-h-screen text-slate-100 font-sans">
      {/* Background */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute top-0 left-1/3 w-[600px] h-[400px] bg-indigo-600/[0.04] rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[400px] bg-violet-600/[0.04] rounded-full blur-3xl" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-5">

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl font-black tracking-tight font-mono">
                RISK<span className="text-indigo-400">OS</span>
                <span className="text-slate-600"> //</span>
                <span className="text-slate-300"> Command Center</span>
              </h1>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-500/15 text-indigo-400 border border-indigo-500/25">v3.0</span>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-mono text-slate-500 bg-white/[0.03] border border-white/[0.07] flex items-center gap-1">
                <Database className="h-2.5 w-2.5" />
                {source === 'supabase' ? 'Supabase Realtime' : 'In-Memory'}
              </span>
            </div>
            <p className="text-sm text-slate-500 mt-1">AI-powered fraud detection for Razorpay payments · auto-blocks threats · issues refunds automatically</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <Clock className="h-3.5 w-3.5" />
            {timeAgo(refreshed.toISOString())}
            <button onClick={() => { fetchCases(false); fetchStats(); }} disabled={loading}
              className="ml-1 p-1.5 rounded-lg hover:bg-white/[0.05] transition text-slate-500 hover:text-slate-300">
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* ── Welcome Banner (shown when cases exist) ─────────────────────── */}
        {!loading && cases.length > 0 && (
          <div className="rounded-2xl border border-indigo-500/20 bg-indigo-500/[0.04] px-5 py-4 flex items-start gap-4 backdrop-blur-sm">
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-indigo-500/20 border border-indigo-500/30 mt-0.5">
              <Bot className="h-5 w-5 text-indigo-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-slate-200">How to use this dashboard</p>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Every payment from Razorpay is automatically scored for fraud risk.
                <span className="text-amber-400 font-semibold"> Click any case</span> to see the full AI investigation, risk breakdown, and take action.
                Cases scoring ≥ 85 are <span className="text-red-400 font-semibold">auto-blocked instantly</span> — no action needed from you.
              </p>
            </div>
            <div className="hidden sm:flex flex-col gap-1 flex-shrink-0 text-[11px] text-slate-500">
              <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-amber-400" /> Review = needs your decision</span>
              <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-red-400" /> Auto = already blocked by AI</span>
              <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Approved = safe to process</span>
            </div>
          </div>
        )}
        {health && (
          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] px-5 py-3 flex items-center flex-wrap gap-4 backdrop-blur-sm">
            <div className="flex items-center gap-2">
              <div className={`h-2 w-2 rounded-full ${SVC_DOT[health.status]}`} />
              <span className={`text-xs font-bold ${SVC_COLOR[health.status]}`}>
                {health.status === 'ok' ? 'All Systems Operational' : health.status === 'degraded' ? 'Degraded' : 'Offline'}
              </span>
            </div>
            <div className="h-4 w-px bg-white/[0.08]" />
            {Object.entries(health.services).map(([name, svc]) => (
              <div key={name} className="flex items-center gap-1.5 text-[11px]">
                <div className={`h-1.5 w-1.5 rounded-full ${SVC_DOT[svc.status]}`} />
                <span className="text-slate-500 capitalize font-medium">{name.replace('_', ' ')}</span>
                <span className={`${SVC_COLOR[svc.status]} font-semibold`}>·</span>
                <span className="text-slate-600 hidden lg:inline">{svc.message}</span>
              </div>
            ))}
          </div>
        )}

        {/* ── KPI + Stats — single unified row ───────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {/* Main KPIs — larger */}
          {[
            { label: 'Need Your Review', value: pending,  icon: ShieldAlert,   c: 'text-amber-400',   b: 'border-amber-500/20',   bg: 'bg-amber-500/[0.05]',   desc: 'Waiting for your decision' },
            { label: 'High Risk',        value: critical, icon: AlertTriangle, c: 'text-red-400',     b: 'border-red-500/20',     bg: 'bg-red-500/[0.05]',     desc: 'Very suspicious payments' },
            { label: 'Blocked',          value: blocked,  icon: XCircle,       c: 'text-red-300',     b: 'border-red-500/20',     bg: 'bg-red-500/[0.05]',     desc: 'Payments stopped' },
            { label: 'Approved',         value: approved, icon: CheckCircle,   c: 'text-emerald-400', b: 'border-emerald-500/20', bg: 'bg-emerald-500/[0.05]', desc: 'Safe, cleared payments' },
          ].map(({ label, value, icon: Icon, c, b, bg, desc }) => (
            <div key={label} className={`rounded-2xl border ${b} ${bg} p-4 space-y-2 backdrop-blur-sm hover:bg-white/[0.04] transition col-span-1`}>
              <div className="flex items-center justify-between">
                <p className="text-[11px] text-slate-500 font-medium">{label}</p>
                <Icon className={`h-3.5 w-3.5 ${c}`} />
              </div>
              <p className={`text-3xl font-black ${c}`}>{value}</p>
              <p className="text-[10px] text-slate-600">{desc}</p>
            </div>
          ))}
          {/* Compact live stats */}
          {stats && [
            { label: 'Money Protected', value: fmt(stats.amount_protected), icon: DollarSign, c: 'text-emerald-400', b: 'border-emerald-500/20', bg: 'bg-emerald-500/[0.04]' },
            { label: 'Auto-Blocked',    value: stats.auto_blocked,           icon: Shield,     c: 'text-red-400',     b: 'border-red-500/20',     bg: 'bg-red-500/[0.04]' },
            { label: 'Refunds Issued',  value: stats.refunds_issued,         icon: RefreshCw,  c: 'text-blue-400',    b: 'border-blue-500/20',    bg: 'bg-blue-500/[0.04]' },
          ].map(({ label, value, icon: Icon, c, b, bg }) => (
            <div key={label} className={`rounded-2xl border ${b} ${bg} p-4 flex flex-col justify-between backdrop-blur-sm hover:bg-white/[0.04] transition`}>
              <div className="flex items-center justify-between mb-2">
                <p className="text-[11px] text-slate-500 font-medium">{label}</p>
                <Icon className={`h-3.5 w-3.5 ${c}`} />
              </div>
              <p className={`text-2xl font-black ${c}`}>{value}</p>
            </div>
          ))}</div>

        {/* ── Simulator ───────────────────────────────────────────────────── */}
        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5 backdrop-blur-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-500/15 border border-indigo-500/25">
              <Zap className="h-4 w-4 text-indigo-400" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-200">Try a Live Payment Demo</p>
              <p className="text-[11px] text-slate-500">Click any button below to simulate a real Razorpay payment and watch RISKOS react instantly</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              { type: 'high_risk' as const,   label: '🔴 Suspicious Payment  ₹1,85,000',  sub: 'watch it auto-block',   c: 'border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:border-red-500/50' },
              { type: 'medium_risk' as const, label: '🟠 High Risk Payment  ₹75,000',      sub: 'needs your review',      c: 'border-orange-500/30 bg-orange-500/10 text-orange-400 hover:bg-orange-500/20 hover:border-orange-500/50' },
              { type: 'failed' as const,      label: '⚠️ Failed Payment  ₹45,000',         sub: 'fraud signal',           c: 'border-yellow-500/30 bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20 hover:border-yellow-500/50' },
              { type: 'low_risk' as const,    label: '🟢 Normal Payment  ₹12,000',         sub: 'safe, will approve',     c: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 hover:border-emerald-500/50' },
            ].map(({ type, label, sub, c }) => (
              <button key={type} onClick={() => simulate(type)} disabled={simulating}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-xs font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed ${c}`}>
                {simulating && simType === type
                  ? <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  : <Sparkles className="h-3.5 w-3.5" />}
                <span>{label}</span>
                <span className="text-[10px] opacity-60 font-mono">→ {sub}</span>
              </button>
            ))}
          </div>
          <p className="text-[11px] text-slate-600 mt-3">
            💡 The red button simulates a payment from a Tor exit node — RISKOS will block it and issue a refund automatically, no action needed from you.
          </p>
        </div>

        {/* ── Case Queue ──────────────────────────────────────────────────── */}
        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] overflow-hidden backdrop-blur-sm">
          {/* Queue header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-500/15 border border-indigo-500/25">
                <Activity className="h-4 w-4 text-indigo-400" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-200">Flagged Payments</p>
                <p className="text-[11px] text-slate-500">{cases.length} payments reviewed · click any row to investigate</p>
              </div>
            </div>
            {pending > 0 && (
              <div className="flex items-center gap-2 rounded-full border border-amber-500/25 bg-amber-500/10 px-3 py-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
                <span className="text-xs font-bold text-amber-400">{pending} pending</span>
              </div>
            )}
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-3 py-20">
              <div className="h-5 w-5 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
              <span className="text-sm text-slate-500">Loading risk cases…</span>
            </div>
          ) : cases.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-4 py-20 px-6 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/[0.07] bg-white/[0.03]">
                <ShieldAlert className="h-8 w-8 text-slate-700" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-400">No payments reviewed yet</p>
                <p className="text-xs text-slate-600 mt-1">Use the demo buttons above to simulate a payment and see RISKOS in action</p>
              </div>
              <button
                onClick={() => simulate('high_risk')}
                className="flex items-center gap-2 px-4 py-2 rounded-xl border border-indigo-500/30 bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 text-xs font-bold transition"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Try a suspicious payment demo
              </button>
            </div>
          ) : (
            <div className="divide-y divide-white/[0.04]">
              {cases.map((c, i) => {
                const txn = c.transactions;
                const sc  = c.risk_scores;
                const sev = sc?.severity || 'low';
                const s   = SEV[sev] || SEV.low;
                const isPending = !c.status || c.status === 'new';
                const isAuto    = c.status === 'blocked' && (sc?.score || 0) >= 85;

                return (
                  <div
                    key={c.id}
                    onClick={() => { setSelected(c); setModalOpen(true); }}
                    className={`group flex items-center gap-4 px-5 py-4 hover:bg-white/[0.03] cursor-pointer transition-all animate-fade-up`}
                    style={{ animationDelay: `${i * 30}ms`, animationFillMode: 'both' }}
                  >
                    {/* Sev dot */}
                    <div className={`h-2.5 w-2.5 flex-shrink-0 rounded-full ${s.dot} ${isPending && sev === 'critical' ? 'animate-pulse shadow-lg shadow-red-500/50' : ''}`} />

                    {/* Score ring */}
                    <ScoreBadge score={sc?.score ?? 0} />

                    {/* Info */}
                    <div className="flex-1 min-w-0 grid sm:grid-cols-2 gap-0.5">
                      <div>
                        <p className="text-sm font-bold text-slate-200 font-mono truncate">
                          {txn?.razorpay_payment_id || c.id.slice(0, 18)}
                        </p>
                        <p className="text-xs text-slate-600 truncate">
                          {txn?.customer_id || 'unknown'} · {txn?.device_id?.slice(0, 22) || 'no device'}
                        </p>
                      </div>
                      <div className="hidden sm:block">
                        <p className="text-sm font-bold text-slate-200">
                          ₹{(txn?.amount || 0).toLocaleString('en-IN')}
                          <span className="text-xs font-normal text-slate-600 ml-1">{txn?.currency || 'INR'}</span>
                        </p>
                        <p className="text-xs text-slate-600 truncate">{txn?.location_id || 'unknown'}</p>
                      </div>
                    </div>

                    {/* Badges */}
                    <div className="flex-shrink-0 flex items-center gap-2">
                      {isAuto && (
                        <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border bg-red-500/10 text-red-400 border-red-500/25">
                          <Lock className="h-2.5 w-2.5" /> AUTO
                        </span>
                      )}
                      <span className={`hidden sm:inline px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${s.badge}`}>{sev}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${STATUS[c.status] || STATUS.new}`}>
                        {c.status || 'new'}
                      </span>
                    </div>

                    <div className="flex-shrink-0 flex items-center gap-2 text-slate-700">
                      <span className="hidden md:inline text-xs">{timeAgo(c.created_at)}</span>
                      <span className="hidden lg:inline text-[10px] text-slate-700 group-hover:text-indigo-400 transition font-medium">Investigate →</span>
                      <ChevronRight className="h-4 w-4 group-hover:text-slate-400 transition" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* bottom padding */}
        <div className="h-4" />

      </div>

      <RiskDetailsModal
        caseData={selected as Record<string, unknown> | null}
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setSelected(null); }}
        onDecision={handleDecision}
      />
      <Toasts toasts={toasts} dismiss={(id) => setToasts(p => p.filter(t => t.id !== id))} />
    </div>
  );
}

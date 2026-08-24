'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import {
  ShieldAlert,
  Activity,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Zap,
  Sparkles,
  XCircle,
  TrendingUp,
  Bot,
  Clock,
  ChevronRight,
  Database,
  DollarSign,
  Lock,
  X,
  Shield,
} from 'lucide-react';
import RiskDetailsModal from '@/components/RiskDetailsModal';
import { Button } from '@/components/ui/button';

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
  total_cases: number;
  pending: number;
  blocked: number;
  approved: number;
  escalated: number;
  critical: number;
  auto_blocked: number;
  refunds_issued: number;
  amount_protected: number;
  amount_screened: number;
  avg_risk_score: number;
  ai_powered_investigations: number;
  detection_rate: number;
}

interface ServiceStatus {
  status: 'ok' | 'degraded' | 'offline';
  message: string;
}

interface HealthData {
  status: 'ok' | 'degraded' | 'offline';
  services: Record<string, ServiceStatus>;
}

interface Toast {
  id: string;
  type: 'critical' | 'info' | 'success' | 'warning';
  title: string;
  message: string;
}

const SEVERITY_STYLE: Record<string, { badge: string; dot: string }> = {
  critical: { badge: 'bg-red-500/10 text-red-400 border-red-500/30',     dot: 'bg-red-500' },
  high:     { badge: 'bg-orange-500/10 text-orange-400 border-orange-500/30', dot: 'bg-orange-500' },
  medium:   { badge: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30', dot: 'bg-yellow-500' },
  low:      { badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30', dot: 'bg-emerald-500' },
};

const STATUS_STYLE: Record<string, string> = {
  new:       'bg-amber-500/10 text-amber-400 border-amber-500/30',
  approved:  'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  blocked:   'bg-red-500/10 text-red-400 border-red-500/30',
  escalated: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
};

const SERVICE_COLORS = {
  ok:       'text-emerald-400',
  degraded: 'text-amber-400',
  offline:  'text-red-400',
};

const SERVICE_DOT = {
  ok:       'bg-emerald-500',
  degraded: 'bg-amber-500',
  offline:  'bg-red-500',
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function formatINR(amount: number) {
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
  if (amount >= 1000) return `₹${(amount / 1000).toFixed(1)}K`;
  return `₹${amount}`;
}

// ── Toast Component ──────────────────────────────────────────────────────────
function ToastContainer({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: string) => void }) {
  if (toasts.length === 0) return null;
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className={`flex items-start gap-3 rounded-xl border p-4 shadow-2xl backdrop-blur-sm animate-in slide-in-from-right duration-300 ${
            toast.type === 'critical' ? 'bg-red-950/90 border-red-700 text-red-100' :
            toast.type === 'success'  ? 'bg-emerald-950/90 border-emerald-700 text-emerald-100' :
            toast.type === 'warning'  ? 'bg-amber-950/90 border-amber-700 text-amber-100' :
            'bg-slate-900/90 border-slate-700 text-slate-100'
          }`}
        >
          <div className="flex-shrink-0 mt-0.5">
            {toast.type === 'critical' ? <AlertTriangle className="h-4 w-4 text-red-400" /> :
             toast.type === 'success'  ? <CheckCircle className="h-4 w-4 text-emerald-400" /> :
             toast.type === 'warning'  ? <AlertTriangle className="h-4 w-4 text-amber-400" /> :
             <Bot className="h-4 w-4 text-indigo-400" />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold">{toast.title}</p>
            <p className="text-xs opacity-80 mt-0.5 leading-relaxed">{toast.message}</p>
          </div>
          <button onClick={() => onDismiss(toast.id)} className="flex-shrink-0 opacity-60 hover:opacity-100 transition">
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}

export default function RiskDashboard() {
  const [cases, setCases] = useState<RiskCase[]>([]);
  const [selectedCase, setSelectedCase] = useState<RiskCase | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulateType, setSimulateType] = useState<string | null>(null);
  const [dataSource, setDataSource] = useState<'supabase' | 'mock'>('mock');
  const [lastRefreshed, setLastRefreshed] = useState(new Date());
  const [stats, setStats] = useState<Stats | null>(null);
  const [health, setHealth] = useState<HealthData | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const prevCaseCount = useRef(0);

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = `toast_${Date.now()}`;
    setToasts(prev => [...prev.slice(-2), { ...toast, id }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 6000);
  }, []);

  const dismissToast = (id: string) => setToasts(prev => prev.filter(t => t.id !== id));

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/stats');
      const data = await res.json();
      setStats(data);
    } catch { /* silent */ }
  }, []);

  const fetchHealth = useCallback(async () => {
    try {
      const res = await fetch('/api/health');
      const data = await res.json();
      setHealth(data);
    } catch { /* silent */ }
  }, []);

  const fetchCases = useCallback(async (showToast = false) => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/cases');
      const data = await res.json();
      if (data.cases) {
        const newCases: RiskCase[] = data.cases;
        setCases(newCases);
        setDataSource(data.source || 'mock');
        setLastRefreshed(new Date());

        // Toast for new critical/auto-blocked cases
        if (showToast && newCases.length > prevCaseCount.current) {
          const newestCase = newCases[0];
          const score = newestCase?.risk_scores?.score || 0;
          const isAutoBlocked = newestCase?.status === 'blocked' && score >= 85;

          if (isAutoBlocked) {
            addToast({
              type: 'critical',
              title: '🚨 Auto-Blocked: Critical Risk Detected',
              message: `Payment ${newestCase.transactions?.razorpay_payment_id?.slice(0, 16) || newestCase.id.slice(0,8)} scored ${score}/100 — automatically blocked & refund issued.`,
            });
          } else if (score >= 60) {
            addToast({
              type: 'warning',
              title: '⚠️ New High-Risk Case',
              message: `Risk score ${score}/100 (${newestCase.risk_scores?.severity}) — requires analyst review.`,
            });
          } else if (score >= 1) {
            addToast({
              type: 'info',
              title: 'New case created',
              message: `Score ${score}/100 — ${newestCase.risk_scores?.recommended_action || 'REVIEW'}`,
            });
          }
        }
        prevCaseCount.current = newCases.length;
      }
    } catch (err) {
      console.error('Error fetching risk cases:', err);
    } finally {
      setIsLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchCases(false);
    fetchStats();
    fetchHealth();

    let channel: ReturnType<typeof supabase.channel> | undefined;
    try {
      channel = supabase
        .channel('realtime_risk_cases')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'risk_cases' }, () => {
          fetchCases(true);
          fetchStats();
        })
        .subscribe();
    } catch (e) {
      console.warn('Realtime not available:', e);
    }

    return () => { if (channel) supabase.removeChannel(channel); };
  }, [fetchCases, fetchStats]);

  async function handleDecision(caseId: string, decision: 'approved' | 'blocked' | 'escalated') {
    const res = await fetch('/api/cases', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ caseId, decision, actor: 'Analyst_Current' }),
    });
    const data = await res.json();

    if (decision === 'blocked' && data.refund) {
      addToast({
        type: data.refund.success ? 'success' : 'warning',
        title: data.refund.success ? '✅ Refund Issued' : '⚠️ Refund Failed',
        message: data.refund.success
          ? `Refund ${data.refund.refund_id} processed${data.refund.simulated ? ' (simulated)' : ''}.`
          : `Refund failed: ${data.refund.error || 'Unknown error'}`,
      });
    }

    await fetchCases(false);
    await fetchStats();
  }

  async function handleSimulateWebhook(type: 'high_risk' | 'medium_risk' | 'low_risk' | 'failed') {
    setIsSimulating(true);
    setSimulateType(type);
    try {
      const configs = {
        high_risk:   { event: 'payment.authorized', amount: 18500000, device_id: 'dev_fingerprint_anomaly_tor_exit', location_id: 'IN_MUMBAI_HIGH_RISK_TOR', customer_id: 'cust_anon_demo' },
        medium_risk: { event: 'payment.authorized', amount: 7500000,  device_id: 'device_unknown',                  location_id: 'IN_DELHI_VPN',              customer_id: 'cust_judge_demo' },
        low_risk:    { event: 'payment.captured',   amount: 1200000,  device_id: 'dev_chrome_android_v14',          location_id: 'IN_BANGALORE',              customer_id: 'cust_regular_456' },
        failed:      { event: 'payment.failed',     amount: 4500000,  device_id: 'device_unknown',                  location_id: 'unknown',                   customer_id: 'cust_anonymous' },
      };

      const cfg = configs[type];
      const payload = {
        event: cfg.event,
        payload: {
          payment: {
            entity: {
              id: `pay_demo_${Date.now().toString().slice(-8)}`,
              customer_id: cfg.customer_id,
              amount: cfg.amount,
              currency: 'INR',
              status: cfg.event === 'payment.failed' ? 'failed' : 'captured',
              notes: { device_id: cfg.device_id, location_id: cfg.location_id },
            },
          },
        },
      };

      const res = await fetch('/api/webhooks/razorpay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setTimeout(() => { fetchCases(true); fetchStats(); }, 400);
      }
    } catch (err) {
      console.error('Simulate webhook error:', err);
    } finally {
      setIsSimulating(false);
      setSimulateType(null);
    }
  }

  const pendingCount = cases.filter(c => !c.status || c.status === 'new').length;
  const criticalCount = cases.filter(c => c.risk_scores?.severity === 'critical').length;
  const blockedCount = cases.filter(c => c.status === 'blocked').length;
  const approvedCount = cases.filter(c => c.status === 'approved').length;
  const avgScore = cases.length ? Math.round(cases.reduce((s, c) => s + (c.risk_scores?.score || 0), 0) / cases.length) : 0;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl font-black tracking-tight font-mono">RISKOS // Command Center</h1>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                v3.0 Gemini AI
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono text-slate-400 bg-slate-900 border border-slate-800 flex items-center gap-1.5">
                <Database className="h-2.5 w-2.5" />
                {dataSource === 'supabase' ? 'Supabase Realtime' : 'In-Memory Store'}
              </span>
            </div>
            <p className="text-sm text-slate-400 mt-1">
              Autonomous payment risk ops · 6-signal AI scoring · Auto-block · Razorpay refunds
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Clock className="h-3.5 w-3.5" />
            Updated {timeAgo(lastRefreshed.toISOString())}
            <button onClick={() => { fetchCases(false); fetchStats(); }} disabled={isLoading} className="ml-1 p-1.5 rounded-lg hover:bg-slate-800 transition text-slate-400 hover:text-white">
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* ── System Health Bar ────────────────────────────────────────────── */}
        {health && (
          <div className="mb-5 rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-3 flex items-center flex-wrap gap-3">
            <div className="flex items-center gap-2 mr-2">
              <div className={`h-2 w-2 rounded-full ${SERVICE_DOT[health.status]}`} />
              <span className={`text-xs font-semibold ${SERVICE_COLORS[health.status]}`}>
                System {health.status === 'ok' ? 'Operational' : health.status === 'degraded' ? 'Degraded' : 'Offline'}
              </span>
            </div>
            {Object.entries(health.services).map(([name, svc]) => (
              <div key={name} className="flex items-center gap-1.5 text-[11px] text-slate-400">
                <div className={`h-1.5 w-1.5 rounded-full ${SERVICE_DOT[svc.status]}`} />
                <span className="capitalize font-medium">{name.replace('_', ' ')}</span>
                <span className="text-slate-600">·</span>
                <span className={SERVICE_COLORS[svc.status]}>{svc.message}</span>
              </div>
            ))}
          </div>
        )}

        {/* ── Live Stats Banner ────────────────────────────────────────────── */}
        {stats && (
          <div className="mb-6 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
            {[
              { label: 'Screened', value: stats.total_screened, icon: Activity, color: 'text-slate-300', bg: 'bg-slate-800/60 border-slate-700/60' },
              { label: 'Protected', value: formatINR(stats.amount_protected), icon: DollarSign, color: 'text-emerald-400', bg: 'bg-emerald-500/5 border-emerald-500/20' },
              { label: 'Auto-Blocked', value: stats.auto_blocked, icon: Shield, color: 'text-red-400', bg: 'bg-red-500/5 border-red-500/20' },
              { label: 'Refunds', value: stats.refunds_issued, icon: RefreshCw, color: 'text-blue-400', bg: 'bg-blue-500/5 border-blue-500/20' },
              { label: 'Detection', value: `${stats.detection_rate}%`, icon: TrendingUp, color: 'text-purple-400', bg: 'bg-purple-500/5 border-purple-500/20' },
              { label: 'Avg Score', value: stats.avg_risk_score, icon: Gauge, color: 'text-amber-400', bg: 'bg-amber-500/5 border-amber-500/20' },
            ].map(({ label, value, icon: Icon, color, bg }) => (
              <div key={label} className={`rounded-xl border p-3 ${bg} flex items-center gap-2.5`}>
                <Icon className={`h-4 w-4 flex-shrink-0 ${color}`} />
                <div>
                  <p className={`text-sm font-black ${color}`}>{value}</p>
                  <p className="text-[10px] text-slate-500">{label}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── KPI Cards ───────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
          {[
            { label: 'Pending Review', value: pendingCount, icon: ShieldAlert, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20', desc: 'Awaiting decision' },
            { label: 'Critical Cases', value: criticalCount, icon: AlertTriangle, color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20', desc: 'Score ≥ 80' },
            { label: 'Blocked', value: blockedCount, icon: XCircle, color: 'text-red-300', bg: 'bg-red-500/10 border-red-500/20', desc: 'Transactions halted' },
            { label: 'Approved', value: approvedCount, icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20', desc: 'Cleared' },
            { label: 'Avg Risk Score', value: avgScore, icon: TrendingUp, color: 'text-indigo-400', bg: 'bg-indigo-500/10 border-indigo-500/20', desc: `Across ${cases.length} cases` },
          ].map(({ label, value, icon: Icon, color, bg, desc }) => (
            <div key={label} className={`rounded-xl border p-4 ${bg} space-y-2`}>
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-400 font-medium">{label}</p>
                <Icon className={`h-4 w-4 ${color}`} />
              </div>
              <p className={`text-2xl font-black ${color}`}>{value}</p>
              <p className="text-[11px] text-slate-500">{desc}</p>
            </div>
          ))}
        </div>

        {/* ── Simulate Webhook Panel ──────────────────────────────────────── */}
        <div className="mb-6 rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="h-4 w-4 text-indigo-400" />
            <p className="text-sm font-semibold text-slate-200">Simulate Razorpay Webhook</p>
            <span className="text-xs text-slate-500">— inject a live payment event</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              { type: 'high_risk' as const,   label: '🔴 Critical Risk  (₹1,85,000 + Tor) → auto-blocks',    color: 'border-red-700/50 bg-red-500/10 text-red-400 hover:bg-red-500/20' },
              { type: 'medium_risk' as const, label: '🟠 High Risk (₹75,000 + VPN)',                          color: 'border-orange-700/50 bg-orange-500/10 text-orange-400 hover:bg-orange-500/20' },
              { type: 'failed' as const,      label: '⚠️ Failed Payment (₹45,000)',                           color: 'border-yellow-700/50 bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20' },
              { type: 'low_risk' as const,    label: '🟢 Low Risk (₹12,000 Normal)',                          color: 'border-emerald-700/50 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20' },
            ].map(({ type, label, color }) => (
              <button
                key={type}
                onClick={() => handleSimulateWebhook(type)}
                disabled={isSimulating}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed ${color}`}
              >
                {isSimulating && simulateType === type
                  ? <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  : <Sparkles className="h-3.5 w-3.5" />}
                {label}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-slate-600 mt-2">
            💡 Critical Risk scores ≥ 85 and triggers the auto-block engine + Razorpay refund automatically.
          </p>
        </div>

        {/* ── Risk Case Queue ─────────────────────────────────────────────── */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-indigo-400" />
              <h2 className="text-sm font-semibold text-slate-200">Risk Case Queue</h2>
              <span className="text-xs text-slate-500">({cases.length} total)</span>
            </div>
            {pendingCount > 0 && (
              <span className="flex items-center gap-1.5 text-xs font-semibold text-amber-400">
                <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                {pendingCount} pending
              </span>
            )}
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center gap-3 py-16 text-slate-400">
              <RefreshCw className="h-5 w-5 animate-spin text-indigo-400" />
              <span className="text-sm">Loading risk cases…</span>
            </div>
          ) : cases.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-slate-400">
              <ShieldAlert className="h-10 w-10 text-slate-700" />
              <p className="text-sm">No risk cases yet</p>
              <p className="text-xs text-slate-600">Use the simulator above to inject a payment event</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-800/60">
              {cases.map(c => {
                const txn = c.transactions;
                const score = c.risk_scores;
                const sev = score?.severity || 'low';
                const sevStyle = SEVERITY_STYLE[sev] || SEVERITY_STYLE.low;
                const isPending = !c.status || c.status === 'new';
                const isAutoBlocked = c.status === 'blocked' && (score?.score || 0) >= 85;

                return (
                  <div
                    key={c.id}
                    onClick={() => { setSelectedCase(c); setIsModalOpen(true); }}
                    className="flex items-center gap-4 px-5 py-4 hover:bg-slate-800/40 cursor-pointer transition group"
                  >
                    <div className="flex-shrink-0">
                      <div className={`h-2.5 w-2.5 rounded-full ${sevStyle.dot} ${isPending && sev === 'critical' ? 'animate-pulse' : ''}`} />
                    </div>

                    <div className="flex-shrink-0 w-10 text-center">
                      <span className={`text-lg font-black ${
                        (score?.score || 0) >= 80 ? 'text-red-400' :
                        (score?.score || 0) >= 60 ? 'text-orange-400' :
                        (score?.score || 0) >= 40 ? 'text-yellow-400' :
                        'text-emerald-400'
                      }`}>
                        {score?.score ?? '—'}
                      </span>
                    </div>

                    <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-2 gap-0.5">
                      <div>
                        <p className="text-sm font-semibold text-slate-200 font-mono truncate">
                          {txn?.razorpay_payment_id || c.id.slice(0, 16)}
                        </p>
                        <p className="text-xs text-slate-500 truncate">
                          {txn?.customer_id || 'unknown'} · {txn?.device_id?.slice(0, 20) || 'no device'}
                        </p>
                      </div>
                      <div className="hidden sm:block">
                        <p className="text-sm font-bold text-slate-200">
                          ₹{(txn?.amount || 0).toLocaleString('en-IN')}
                          <span className="text-xs font-normal text-slate-500 ml-1">{txn?.currency || 'INR'}</span>
                        </p>
                        <p className="text-xs text-slate-500 truncate">{txn?.location_id || 'unknown location'}</p>
                      </div>
                    </div>

                    <div className="flex-shrink-0 flex items-center gap-2">
                      {isAutoBlocked && (
                        <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border bg-red-500/10 text-red-400 border-red-500/30">
                          <Lock className="h-2.5 w-2.5" /> AUTO
                        </span>
                      )}
                      <span className={`hidden sm:inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${sevStyle.badge}`}>
                        {sev}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${STATUS_STYLE[c.status] || STATUS_STYLE.new}`}>
                        {c.status || 'new'}
                      </span>
                    </div>

                    <div className="flex-shrink-0 flex items-center gap-2 text-xs text-slate-500">
                      <span className="hidden md:inline">{timeAgo(c.created_at)}</span>
                      <ChevronRight className="h-4 w-4 text-slate-600 group-hover:text-slate-400 transition" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Engine Status Footer ─────────────────────────────────────────── */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { icon: Bot,      label: 'AI Investigation', value: 'Gemini 1.5 Flash',        sub: 'Structured JSON output mode', color: 'text-indigo-400', bg: 'bg-indigo-500/5 border-indigo-500/20' },
            { icon: Zap,      label: 'Risk Scoring',     value: '6-Signal Multi-Factor',    sub: 'Amount · Status · Device · Geo · Velocity · Currency', color: 'text-purple-400', bg: 'bg-purple-500/5 border-purple-500/20' },
            { icon: DollarSign, label: 'Razorpay Actions', value: 'Auto-Refund on Block', sub: 'Razorpay Refund API integrated', color: 'text-emerald-400', bg: 'bg-emerald-500/5 border-emerald-500/20' },
          ].map(({ icon: Icon, label, value, sub, color, bg }) => (
            <div key={label} className={`rounded-xl border p-4 ${bg} flex items-start gap-3`}>
              <Icon className={`mt-0.5 h-4 w-4 flex-shrink-0 ${color}`} />
              <div>
                <p className="text-[11px] text-slate-500 font-medium uppercase tracking-wide">{label}</p>
                <p className={`text-sm font-bold ${color}`}>{value}</p>
                <p className="text-[11px] text-slate-500 mt-0.5">{sub}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <RiskDetailsModal
        caseData={selectedCase as Record<string, unknown> | null}
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setSelectedCase(null); }}
        onDecision={handleDecision}
      />

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}

// missing import
function Gauge({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M12 2a10 10 0 1 0 10 10"/>
      <path d="M12 6v2"/>
      <path d="m16.24 7.76-1.42 1.42"/>
      <path d="M18 12h-2"/>
      <path d="m15 15-3-3"/>
    </svg>
  );
}

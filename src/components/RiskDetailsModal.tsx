'use client';

import React, { useEffect, useState, useRef } from 'react';
import {
  X,
  ShieldAlert,
  MapPin,
  Smartphone,
  Gauge,
  DollarSign,
  History,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  Bot,
  Send,
  User,
  AlertTriangle,
  TrendingUp,
  Zap,
  Activity,
  ChevronDown,
  ChevronUp,
  Lock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Signal {
  label: string;
  score: number;
  weight: number;
  reason: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

interface AuditLog {
  id: string;
  case_id: string;
  actor: string;
  action: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

interface AIInvestigation {
  explanation_summary: string;
  recommended_action: string;
  key_risk_factors?: string[];
  confidence?: string;
  ai_powered?: boolean;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface RiskDetailsModalProps {
  caseData: Record<string, unknown> | null;
  isOpen: boolean;
  onClose: () => void;
  onDecision: (caseId: string, decision: 'approved' | 'blocked' | 'escalated') => Promise<void>;
}

// ── Helpers ────────────────────────────────────────────────────────────────

const SIGNAL_ICONS: Record<string, React.ElementType> = {
  'Amount Deviation': DollarSign,
  'Payment Status': Activity,
  'Device Integrity': Smartphone,
  'Geo / IP Variance': MapPin,
  'Velocity & Frequency': TrendingUp,
  'Currency Mismatch': Zap,
};

const SEVERITY_COLORS = {
  critical: { bar: 'bg-red-500', text: 'text-red-400', badge: 'bg-red-500/10 text-red-400 border-red-500/30' },
  high:     { bar: 'bg-orange-500', text: 'text-orange-400', badge: 'bg-orange-500/10 text-orange-400 border-orange-500/30' },
  medium:   { bar: 'bg-yellow-500', text: 'text-yellow-400', badge: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30' },
  low:      { bar: 'bg-emerald-500', text: 'text-emerald-400', badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' },
};

const ACTION_COLORS: Record<string, string> = {
  BLOCK:    'bg-red-500/10 text-red-400 border-red-500/30',
  HOLD:     'bg-orange-500/10 text-orange-400 border-orange-500/30',
  REVIEW:   'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
  APPROVE:  'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  ESCALATE: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
};

function ScoreGauge({ score }: { score: number }) {
  const color =
    score >= 80 ? 'text-red-400' :
    score >= 60 ? 'text-orange-400' :
    score >= 40 ? 'text-yellow-400' :
    'text-emerald-400';

  const ring =
    score >= 80 ? 'stroke-red-500' :
    score >= 60 ? 'stroke-orange-500' :
    score >= 40 ? 'stroke-yellow-500' :
    'stroke-emerald-500';

  const circumference = 2 * Math.PI * 28;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center w-20 h-20">
      <svg className="absolute w-20 h-20 -rotate-90" viewBox="0 0 64 64">
        <circle cx="32" cy="32" r="28" fill="none" stroke="currentColor" strokeWidth="5" className="text-slate-800" />
        <circle
          cx="32" cy="32" r="28" fill="none" strokeWidth="5"
          strokeDasharray={circumference} strokeDashoffset={offset}
          strokeLinecap="round" className={ring}
          style={{ transition: 'stroke-dashoffset 0.8s ease' }}
        />
      </svg>
      <div className="flex flex-col items-center z-10">
        <span className={`text-xl font-black leading-none ${color}`}>{score}</span>
        <span className="text-[9px] text-slate-500 font-mono">/100</span>
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────

export default function RiskDetailsModal({
  caseData,
  isOpen,
  onClose,
  onDecision,
}: RiskDetailsModalProps) {
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [aiInvestigation, setAiInvestigation] = useState<AIInvestigation | null>(null);
  const [signals, setSignals] = useState<Signal[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState<'investigation' | 'signals' | 'audit' | 'chat'>('investigation');
  const [auditExpanded, setAuditExpanded] = useState(false);

  // Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Load audit logs + AI data when case opens
  useEffect(() => {
    if (!caseData || !isOpen) return;

    setAuditLogs([]);
    setAiInvestigation(null);
    setSignals([]);
    setChatMessages([]);
    setActiveTab('investigation');

    async function loadData() {
      setLoadingLogs(true);
      try {
        const res = await fetch(`/api/audit-logs?caseId=${(caseData as Record<string,unknown>).id}`);
        const data = await res.json();
        const logs: AuditLog[] = data.logs || [];
        setAuditLogs(logs);

        // Extract AI investigation from audit log metadata
        const aiLog = logs.find((l) => l.metadata?.ai_investigation);
        if (aiLog?.metadata?.ai_investigation) {
          setAiInvestigation(aiLog.metadata.ai_investigation as AIInvestigation);
        }

        // Extract signals from risk_scores
        const riskScores = (caseData as Record<string,unknown>).risk_scores as Record<string,unknown> | undefined;
        if (riskScores?.signals) {
          setSignals(riskScores.signals as Signal[]);
        } else if (!aiLog?.metadata?.ai_investigation) {
          // Fallback: hit investigate endpoint if no AI data yet
          const txn = (caseData as Record<string,unknown>).transactions as Record<string,unknown> | undefined;
          if (txn) {
            const invRes = await fetch('/api/investigate', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(txn),
            });
            const inv = await invRes.json();
            if (inv.explanation_summary) setAiInvestigation(inv);
            if (inv.risk_signals) setSignals(inv.risk_signals);
          }
        }
      } catch (err) {
        console.error('Failed to load case data:', err);
      } finally {
        setLoadingLogs(false);
      }
    }

    loadData();
  }, [caseData, isOpen]);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  if (!isOpen || !caseData) return null;

  const txn = (caseData.transactions as Record<string, unknown>) || {};
  const score = (caseData.risk_scores as Record<string, unknown>) || {};
  const riskScore = (score.score as number) ?? 50;
  const severity = (score.severity as string) ?? 'medium';
  const severityColors = SEVERITY_COLORS[severity as keyof typeof SEVERITY_COLORS] || SEVERITY_COLORS.medium;

  const handleAction = async (decision: 'approved' | 'blocked' | 'escalated') => {
    setIsProcessing(true);
    try {
      await onDecision(caseData.id as string, decision);
      onClose();
    } catch (err) {
      console.error('Decision error:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const sendChatMessage = async () => {
    const trimmed = chatInput.trim();
    if (!trimmed || chatLoading) return;

    const userMsg: ChatMessage = { role: 'user', content: trimmed };
    const updatedMessages = [...chatMessages, userMsg];
    setChatMessages(updatedMessages);
    setChatInput('');
    setChatLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caseId: caseData.id, messages: updatedMessages }),
      });
      const data = await res.json();
      setChatMessages([...updatedMessages, { role: 'assistant', content: data.reply || 'No response.' }]);
    } catch {
      setChatMessages([...updatedMessages, {
        role: 'assistant',
        content: 'Failed to reach AI analyst. Please try again.',
      }]);
    } finally {
      setChatLoading(false);
    }
  };

  const TABS = [
    { id: 'investigation', label: 'AI Investigation', icon: Sparkles },
    { id: 'signals',       label: 'Signal Breakdown', icon: Gauge },
    { id: 'audit',         label: 'Audit Trail', icon: History },
    { id: 'chat',          label: 'Ask AI', icon: Bot },
  ] as const;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-sm">
      <div className="h-full w-full max-w-2xl bg-slate-900 border-l border-slate-800 text-slate-100 shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-300">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="p-5 border-b border-slate-800 bg-slate-950/80 flex-shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 mt-0.5">
                <ShieldAlert className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-base font-bold font-mono">
                    Case #{(caseData.id as string)?.slice(0, 8)}
                  </h2>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                    caseData.status === 'approved' ? 'bg-emerald-950 text-emerald-400 border-emerald-800' :
                    caseData.status === 'blocked'  ? 'bg-red-950 text-red-400 border-red-800' :
                    caseData.status === 'escalated'? 'bg-purple-950 text-purple-400 border-purple-800' :
                    'bg-amber-950 text-amber-400 border-amber-800'
                  }`}>
                    {(caseData.status as string) || 'new'}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${severityColors.badge}`}>
                    {severity}
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-mono mt-0.5">
                  {(txn.razorpay_payment_id as string) || 'N/A'} · ₹{((txn.amount as number) || 0).toLocaleString('en-IN')} {(txn.currency as string) || 'INR'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <ScoreGauge score={riskScore} />
              <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition">
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Quick meta row */}
          <div className="grid grid-cols-3 gap-2 mt-4">
            {[
              { icon: Smartphone, label: 'Device', value: ((txn.device_id as string) || 'unknown').slice(0, 18) },
              { icon: MapPin,     label: 'Location', value: (txn.location_id as string) || 'unknown' },
              { icon: DollarSign, label: 'Customer', value: ((txn.customer_id as string) || 'anon').slice(0, 16) },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-center gap-2 bg-slate-800/50 rounded-lg px-2.5 py-2 border border-slate-700/50">
                <Icon className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-[9px] text-slate-500 uppercase tracking-wide">{label}</p>
                  <p className="text-[11px] font-mono text-slate-300 truncate">{value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Tab Bar ────────────────────────────────────────────────────── */}
        <div className="flex border-b border-slate-800 bg-slate-950/40 flex-shrink-0">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-1.5 px-3 py-3 text-xs font-semibold transition flex-1 justify-center border-b-2 ${
                activeTab === id
                  ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5'
                  : 'border-transparent text-slate-500 hover:text-slate-300 hover:bg-slate-800/40'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>

        {/* ── Tab Content ────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto">

          {/* Investigation Tab */}
          {activeTab === 'investigation' && (
            <div className="p-5 space-y-4">
              {loadingLogs ? (
                <div className="flex items-center gap-2 text-slate-400 text-sm">
                  <div className="h-4 w-4 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
                  Running AI investigation…
                </div>
              ) : aiInvestigation ? (
                <>
                  {/* AI badge */}
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border bg-indigo-500/10 border-indigo-500/30 text-indigo-400 text-xs font-semibold">
                      <Sparkles className="h-3.5 w-3.5" />
                      {aiInvestigation.ai_powered ? 'Powered by Gemini AI' : 'Deterministic Analysis'}
                    </div>
                    {aiInvestigation.confidence && (
                      <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border bg-slate-800 border-slate-700 text-slate-400 text-xs">
                        <Gauge className="h-3 w-3" />
                        {aiInvestigation.confidence} confidence
                      </div>
                    )}
                  </div>

                  {/* Explanation */}
                  <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4">
                    <p className="text-sm leading-relaxed text-slate-200">{aiInvestigation.explanation_summary}</p>
                  </div>

                  {/* Key risk factors */}
                  {aiInvestigation.key_risk_factors && aiInvestigation.key_risk_factors.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Key Risk Factors</p>
                      <div className="space-y-2">
                        {aiInvestigation.key_risk_factors.map((factor, i) => (
                          <div key={i} className="flex items-start gap-2 bg-slate-800/40 rounded-lg px-3 py-2.5 border border-slate-700/50">
                            <AlertTriangle className="h-3.5 w-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
                            <p className="text-xs text-slate-300">{factor}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Recommended action */}
                  <div className="flex items-center gap-3 pt-1">
                    <p className="text-xs text-slate-500 uppercase tracking-wide font-semibold">AI Recommendation</p>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase border ${
                      ACTION_COLORS[aiInvestigation.recommended_action] || ACTION_COLORS.REVIEW
                    }`}>
                      {aiInvestigation.recommended_action}
                    </span>
                  </div>
                </>
              ) : (
                <p className="text-sm text-slate-400">No investigation data available for this case.</p>
              )}
            </div>
          )}

          {/* Signals Tab */}
          {activeTab === 'signals' && (
            <div className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-400 uppercase tracking-wide font-semibold">6-Factor Risk Signal Breakdown</p>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span>Composite:</span>
                  <span className={`font-bold ${severityColors.text}`}>{riskScore}/100</span>
                </div>
              </div>

              {signals.length > 0 ? (
                <div className="space-y-3">
                  {signals.map((sig) => {
                    const Icon = SIGNAL_ICONS[sig.label] || Gauge;
                    const colors = SEVERITY_COLORS[sig.severity] || SEVERITY_COLORS.low;
                    return (
                      <div key={sig.label} className="bg-slate-800/50 border border-slate-700/60 rounded-xl p-4 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Icon className={`h-4 w-4 ${colors.text}`} />
                            <span className="text-sm font-semibold text-slate-200">{sig.label}</span>
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase border ${colors.badge}`}>
                              {sig.severity}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className={`text-base font-black ${colors.text}`}>{sig.score}</span>
                            <span className="text-xs text-slate-500">/100</span>
                          </div>
                        </div>
                        <div className="w-full bg-slate-700/50 rounded-full h-1.5">
                          <div
                            className={`h-1.5 rounded-full transition-all duration-700 ${colors.bar}`}
                            style={{ width: `${sig.score}%` }}
                          />
                        </div>
                        <p className="text-xs text-slate-400 leading-relaxed">{sig.reason}</p>
                        <p className="text-[10px] text-slate-600 font-mono">Weight: {sig.weight}% of composite score</p>
                      </div>
                    );
                  })}
                </div>
              ) : loadingLogs ? (
                <div className="flex items-center gap-2 text-slate-400 text-sm">
                  <div className="h-4 w-4 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
                  Loading signals…
                </div>
              ) : (
                <p className="text-sm text-slate-400">No signal data available. Trigger a webhook to generate real signals.</p>
              )}
            </div>
          )}

          {/* Audit Trail Tab */}
          {activeTab === 'audit' && (
            <div className="p-5 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-400 uppercase tracking-wide font-semibold flex items-center gap-2">
                  <Lock className="h-3.5 w-3.5" /> Immutable Audit Trail
                </p>
                <span className="text-xs text-slate-500">{auditLogs.length} entries</span>
              </div>

              {loadingLogs ? (
                <div className="flex items-center gap-2 text-slate-400 text-sm">
                  <div className="h-4 w-4 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
                  Loading audit logs…
                </div>
              ) : auditLogs.length === 0 ? (
                <p className="text-sm text-slate-400">No audit entries yet.</p>
              ) : (
                <div className="relative">
                  <div className="absolute left-4 top-0 bottom-0 w-px bg-slate-700/50" />
                  <div className="space-y-3">
                    {(auditExpanded ? auditLogs : auditLogs.slice(0, 4)).map((log) => {
                      const isSystem = log.actor === 'system_agent';
                      const isApprove = log.action.includes('APPROVED');
                      const isBlock = log.action.includes('BLOCKED');
                      const isEscalate = log.action.includes('ESCALATED');

                      const dotColor =
                        isBlock    ? 'bg-red-500' :
                        isEscalate ? 'bg-purple-500' :
                        isApprove  ? 'bg-emerald-500' :
                        isSystem   ? 'bg-indigo-500' :
                        'bg-slate-500';

                      const Icon =
                        isBlock    ? XCircle :
                        isApprove  ? CheckCircle2 :
                        isEscalate ? AlertTriangle :
                        isSystem   ? Bot :
                        User;

                      return (
                        <div key={log.id} className="relative pl-10">
                          <div className={`absolute left-2.5 top-3 h-3 w-3 rounded-full border-2 border-slate-900 ${dotColor}`} />
                          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-3.5">
                            <div className="flex items-center gap-2 mb-1">
                              <Icon className="h-3.5 w-3.5 text-slate-400" />
                              <span className="text-xs font-semibold text-slate-200">{log.action.replace(/_/g, ' ')}</span>
                            </div>
                            <div className="flex items-center gap-2 text-[11px] text-slate-500 font-mono">
                              <span>{log.actor}</span>
                              <span>·</span>
                              <Clock className="h-3 w-3" />
                              <span>{new Date(log.created_at).toLocaleString()}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {auditLogs.length > 4 && (
                    <button
                      onClick={() => setAuditExpanded(!auditExpanded)}
                      className="mt-3 ml-10 flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 transition"
                    >
                      {auditExpanded ? <><ChevronUp className="h-3.5 w-3.5" /> Show less</> : <><ChevronDown className="h-3.5 w-3.5" /> Show {auditLogs.length - 4} more</>}
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Chat Tab */}
          {activeTab === 'chat' && (
            <div className="flex flex-col h-full">
              <div className="flex-1 overflow-y-auto p-5 space-y-3 min-h-0" style={{ maxHeight: 'calc(100vh - 380px)' }}>
                {chatMessages.length === 0 && (
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-indigo-500/20 border border-indigo-500/30">
                        <Bot className="h-4 w-4 text-indigo-400" />
                      </div>
                      <div className="bg-slate-800 border border-slate-700 rounded-2xl rounded-tl-sm p-3 max-w-xs">
                        <p className="text-sm text-slate-200">
                          I&apos;m RISKOS AI, your fraud analyst assistant. I have full context on this case.
                        </p>
                        <p className="text-xs text-slate-500 mt-1">What would you like to know?</p>
                      </div>
                    </div>
                    {/* Suggested prompts */}
                    <div className="pl-10 flex flex-wrap gap-2">
                      {[
                        'Why is this flagged?',
                        'Is the device suspicious?',
                        'What action do you recommend?',
                        'Explain the risk score',
                      ].map((prompt) => (
                        <button
                          key={prompt}
                          onClick={() => { setChatInput(prompt); }}
                          className="text-xs px-3 py-1.5 rounded-full border border-indigo-500/30 bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 transition"
                        >
                          {prompt}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {chatMessages.map((msg, i) => (
                  <div key={i} className={`flex items-start gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                    <div className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border ${
                      msg.role === 'assistant'
                        ? 'bg-indigo-500/20 border-indigo-500/30'
                        : 'bg-slate-700 border-slate-600'
                    }`}>
                      {msg.role === 'assistant'
                        ? <Bot className="h-4 w-4 text-indigo-400" />
                        : <User className="h-4 w-4 text-slate-300" />
                      }
                    </div>
                    <div className={`rounded-2xl p-3 max-w-sm text-sm leading-relaxed ${
                      msg.role === 'assistant'
                        ? 'bg-slate-800 border border-slate-700 rounded-tl-sm text-slate-200'
                        : 'bg-indigo-600 rounded-tr-sm text-white'
                    }`}>
                      {msg.content}
                    </div>
                  </div>
                ))}

                {chatLoading && (
                  <div className="flex items-start gap-3">
                    <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-indigo-500/20 border border-indigo-500/30">
                      <Bot className="h-4 w-4 text-indigo-400" />
                    </div>
                    <div className="bg-slate-800 border border-slate-700 rounded-2xl rounded-tl-sm p-3">
                      <div className="flex gap-1">
                        <div className="h-2 w-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                        <div className="h-2 w-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                        <div className="h-2 w-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Chat input */}
              <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex-shrink-0">
                <form
                  onSubmit={(e) => { e.preventDefault(); sendChatMessage(); }}
                  className="flex items-center gap-2"
                >
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Ask about this case…"
                    className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition"
                    disabled={chatLoading}
                  />
                  <button
                    type="submit"
                    disabled={!chatInput.trim() || chatLoading}
                    className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed transition"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>

        {/* ── Footer Actions ─────────────────────────────────────────────── */}
        {caseData.status === 'new' || !caseData.status ? (
          <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex-shrink-0">
            <p className="text-[10px] text-slate-500 uppercase tracking-wide font-semibold mb-3">Analyst Decision</p>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => handleAction('escalated')}
                disabled={isProcessing}
                className="flex items-center justify-center gap-2 rounded-xl border border-purple-700/50 bg-purple-500/10 px-3 py-2.5 text-xs font-semibold text-purple-400 hover:bg-purple-500/20 disabled:opacity-50 transition"
              >
                <AlertTriangle className="h-4 w-4" />
                Escalate
              </button>
              <button
                onClick={() => handleAction('blocked')}
                disabled={isProcessing}
                className="flex items-center justify-center gap-2 rounded-xl border border-red-700/50 bg-red-500/10 px-3 py-2.5 text-xs font-semibold text-red-400 hover:bg-red-500/20 disabled:opacity-50 transition"
              >
                <XCircle className="h-4 w-4" />
                Block
              </button>
              <button
                onClick={() => handleAction('approved')}
                disabled={isProcessing}
                className="flex items-center justify-center gap-2 rounded-xl border border-emerald-700/50 bg-emerald-500/10 px-3 py-2.5 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/20 disabled:opacity-50 transition"
              >
                <CheckCircle2 className="h-4 w-4" />
                Approve
              </button>
            </div>
          </div>
        ) : (
          <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex-shrink-0">
            <div className="flex items-center justify-center gap-2 text-sm text-slate-400">
              <Lock className="h-4 w-4" />
              Decision recorded — case is {caseData.status as string}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

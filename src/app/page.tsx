import Link from 'next/link';
import {
  ArrowRight, LayoutDashboard, ShieldAlert, Zap, Sparkles,
  Lock, History, Gauge, Bot, TrendingUp, CheckCircle,
  AlertTriangle, RefreshCw, DollarSign, Activity, Shield,
  ChevronRight,
} from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen text-slate-100 overflow-hidden">

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="relative flex flex-col items-center text-center px-6 pt-24 pb-20">
        {/* Background orbs */}
        <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[600px] bg-indigo-600/[0.08] rounded-full blur-3xl" />
          <div className="absolute top-32 left-1/4 w-[400px] h-[400px] bg-violet-600/[0.06] rounded-full blur-3xl" />
          <div className="absolute top-20 right-1/4 w-[300px] h-[300px] bg-blue-600/[0.06] rounded-full blur-3xl" />
          {/* Grid overlay */}
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: 'linear-gradient(rgba(99,102,241,1) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,1) 1px, transparent 1px)',
              backgroundSize: '60px 60px',
            }}
          />
        </div>

        {/* Badge */}
        <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/20 bg-indigo-500/[0.06] px-4 py-1.5 text-xs font-semibold text-indigo-400 mb-8">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-60" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-400" />
          </span>
          AI-powered payment risk operations for Razorpay merchants
        </div>

        {/* Headline */}
        <h1 className="text-5xl sm:text-7xl font-black tracking-tight max-w-5xl leading-[1.05] mb-6">
          <span className="gradient-text">Autonomous Payment</span>
          <br />
          <span className="gradient-text-indigo">Risk Operations</span>
        </h1>

        <p className="max-w-2xl text-slate-400 text-base sm:text-lg leading-relaxed mb-10">
          RISKOS intercepts Razorpay payments in real time, scores them across{' '}
          <span className="text-slate-200 font-semibold">6 AI signals</span>, gets a{' '}
          <span className="text-indigo-400 font-semibold">Gemini investigation</span>, auto-blocks
          fraud at ≥85, and issues{' '}
          <span className="text-emerald-400 font-semibold">automatic refunds</span> — before a human even sees it.
        </p>

        {/* CTAs */}
        <div className="flex flex-wrap items-center justify-center gap-4 mb-16">
          <Link
            href="/dashboard"
            className="group flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 px-6 py-3 text-sm font-bold text-white shadow-2xl shadow-indigo-600/30 transition-all hover:shadow-indigo-500/50 hover:scale-105"
          >
            <LayoutDashboard className="h-4 w-4" />
            Open Dashboard
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-3xl w-full">
          {[
            { label: 'Risk Signals', value: '6', sub: 'weighted factors', color: 'text-indigo-400', border: 'border-indigo-500/20', bg: 'bg-indigo-500/5' },
            { label: 'AI Engine', value: 'Gemini', sub: '1.5 Flash · JSON mode', color: 'text-violet-400', border: 'border-violet-500/20', bg: 'bg-violet-500/5' },
            { label: 'Auto-Block', value: '≥85', sub: 'score threshold', color: 'text-red-400', border: 'border-red-500/20', bg: 'bg-red-500/5' },
            { label: 'Audit Trail', value: '100%', sub: 'immutable log', color: 'text-emerald-400', border: 'border-emerald-500/20', bg: 'bg-emerald-500/5' },
          ].map(({ label, value, sub, color, border, bg }) => (
            <div key={label} className={`rounded-2xl border ${border} ${bg} p-4 text-center backdrop-blur-sm`}>
              <p className={`text-2xl sm:text-3xl font-black ${color}`}>{value}</p>
              <p className="text-xs font-bold text-slate-200 mt-1">{label}</p>
              <p className="text-[11px] text-slate-500 mt-0.5">{sub}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Pipeline ──────────────────────────────────────────────────────── */}
      <section className="px-6 py-20 max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-4 py-1.5 text-xs font-semibold text-slate-400 mb-4">
            <Activity className="h-3.5 w-3.5 text-indigo-400" />
            How It Works
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-white">End-to-end in under 2 seconds</h2>
          <p className="text-slate-400 mt-3 text-sm max-w-lg mx-auto">Every payment flows through a 6-step autonomous pipeline before it ever reaches a human.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { step: '01', title: 'Webhook Intake', desc: 'Razorpay fires payment.authorized or payment.failed. RISKOS verifies the signature and extracts the full payment entity.', icon: Zap, color: 'text-blue-400', border: 'border-blue-500/20', bg: 'bg-blue-500/[0.05]', glow: 'hover:border-blue-500/40 hover:bg-blue-500/10' },
            { step: '02', title: '6-Signal Risk Engine', desc: 'Amount, device fingerprint, geo/IP, payment status, velocity, and currency — each scored 0–100 and weighted into a composite score.', icon: Gauge, color: 'text-purple-400', border: 'border-purple-500/20', bg: 'bg-purple-500/[0.05]', glow: 'hover:border-purple-500/40 hover:bg-purple-500/10' },
            { step: '03', title: 'Gemini AI Investigation', desc: 'Gemini 1.5 Flash receives full signal context and returns a plain-English fraud explanation, key factors, confidence rating, and recommendation.', icon: Sparkles, color: 'text-indigo-400', border: 'border-indigo-500/20', bg: 'bg-indigo-500/[0.05]', glow: 'hover:border-indigo-500/40 hover:bg-indigo-500/10' },
            { step: '04', title: 'Auto-Block Engine', desc: 'Cases scoring ≥85 are instantly blocked. RISKOS calls the Razorpay Refund API immediately and writes a complete audit entry — no human needed.', icon: Shield, color: 'text-red-400', border: 'border-red-500/20', bg: 'bg-red-500/[0.05]', glow: 'hover:border-red-500/40 hover:bg-red-500/10' },
            { step: '05', title: 'Human-in-the-Loop', desc: 'Medium-risk cases queue for analyst review. Analysts can Approve, Block, or Escalate — and chat live with the AI for case-specific answers.', icon: Bot, color: 'text-amber-400', border: 'border-amber-500/20', bg: 'bg-amber-500/[0.05]', glow: 'hover:border-amber-500/40 hover:bg-amber-500/10' },
            { step: '06', title: 'Immutable Audit Trail', desc: 'Every action — automated or human — is permanently recorded: score, signals, AI reasoning, refund ID, analyst identity, and timestamp.', icon: History, color: 'text-emerald-400', border: 'border-emerald-500/20', bg: 'bg-emerald-500/[0.05]', glow: 'hover:border-emerald-500/40 hover:bg-emerald-500/10' },
          ].map(({ title, desc, icon: Icon, color, border, bg, glow }) => (
            <div key={title} className={`rounded-2xl border ${border} ${bg} ${glow} p-6 transition-all duration-300`}>
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl border ${border} ${bg} mb-4`}>
                <Icon className={`h-5 w-5 ${color}`} />
              </div>
              <h3 className="font-bold text-sm text-white mb-2">{title}</h3>
              <p className="text-xs text-slate-400 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ──────────────────────────────────────────────────────── */}
      <section className="px-6 py-20 relative">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />
          <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />
        </div>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-4 py-1.5 text-xs font-semibold text-slate-400 mb-4">
              <Sparkles className="h-3.5 w-3.5 text-violet-400" />
              What Makes RISKOS Different
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-white">Not a dashboard. An autonomous agent.</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { icon: Sparkles, title: 'Gemini AI — Structured JSON Output', desc: 'Not a chatbot wrapper. Gemini 1.5 Flash is called in JSON mode, returning a typed investigation object: explanation, action, factors, confidence.', color: 'text-indigo-400', border: 'border-indigo-500/20', bg: 'bg-indigo-500/[0.05]' },
              { icon: Bot, title: 'AI Analyst Chat', desc: 'Multi-turn Gemini conversation grounded in full case context. Ask "Why is this flagged?" or "What should I do?" and get a real, context-aware answer.', color: 'text-violet-400', border: 'border-violet-500/20', bg: 'bg-violet-500/[0.05]' },
              { icon: TrendingUp, title: 'Real Velocity Tracking', desc: 'Per-customer time-window analysis tracks transaction count and spend over 1h and 24h rolling windows — not pattern matching, actual history.', color: 'text-blue-400', border: 'border-blue-500/20', bg: 'bg-blue-500/[0.05]' },
              { icon: DollarSign, title: 'Razorpay Back-Actions', desc: 'When blocked — automatically or manually — RISKOS calls the Razorpay Refund API and logs the refund ID in the immutable audit trail.', color: 'text-emerald-400', border: 'border-emerald-500/20', bg: 'bg-emerald-500/[0.05]' },
              { icon: AlertTriangle, title: 'Auto-Block at Score ≥ 85', desc: 'The highest-risk cases never reach a human queue. The rule engine blocks them instantly, issues a refund, and writes a complete audit entry.', color: 'text-red-400', border: 'border-red-500/20', bg: 'bg-red-500/[0.05]' },
              { icon: Lock, title: 'Immutable Audit Trail', desc: 'Every system decision and analyst action is permanently recorded with full signal context — HMAC source, AI reasoning, and actor identity.', color: 'text-amber-400', border: 'border-amber-500/20', bg: 'bg-amber-500/[0.05]' },
            ].map(({ icon: Icon, title, desc, color, border, bg }) => (
              <div key={title} className={`rounded-2xl border ${border} ${bg} p-6 hover:bg-white/[0.04] transition-all duration-300`}>
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl border ${border} ${bg} mb-4`}>
                  <Icon className={`h-5 w-5 ${color}`} />
                </div>
                <h3 className="font-bold text-sm text-white mb-2">{title}</h3>
                <p className="text-xs text-slate-400 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Demo Guide ────────────────────────────────────────────────────── */}
      <section className="px-6 py-20 max-w-4xl mx-auto">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-4 py-1.5 text-xs font-semibold text-slate-400 mb-4">
            <RefreshCw className="h-3.5 w-3.5 text-emerald-400" />
            Live Demo
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-white">See it work in 60 seconds</h2>
          <p className="text-slate-400 mt-3 text-sm">No setup, no API keys needed — works out of the box</p>
        </div>

        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] overflow-hidden backdrop-blur-sm">
          <div className="divide-y divide-white/[0.04]">
            {[
              { n: '1', text: 'Open /dashboard — 3 pre-seeded risk cases are already waiting' },
              { n: '2', text: 'Click 🔴 Suspicious Payment to inject a ₹1,85,000 Tor-origin payment' },
              { n: '3', text: 'Watch it auto-block instantly — no human action needed' },
              { n: '4', text: 'Click the case → AI Summary tab shows Gemini\'s full investigation' },
              { n: '5', text: 'Go to Why Flagged? tab → see all 6 weighted risk factors' },
              { n: '6', text: 'Go to Ask AI tab → type "Why was this blocked?" for a live answer' },
              { n: '7', text: 'Check History tab → auto-block + refund permanently recorded' },
            ].map(({ n, text }) => (
              <div key={n} className="flex items-center gap-4 px-6 py-4 hover:bg-white/[0.02] transition">
                <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-indigo-500/20 border border-indigo-500/30 text-xs font-bold text-indigo-400">{n}</span>
                <span className="text-sm text-slate-300">{text}</span>
              </div>
            ))}
          </div>
          <div className="p-5 border-t border-white/[0.06]">
            <Link
              href="/dashboard"
              className="group flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 px-6 py-3 text-sm font-bold text-white shadow-xl shadow-indigo-600/25 transition-all hover:shadow-indigo-500/40 w-full"
            >
              <LayoutDashboard className="h-4 w-4" />
              Open Dashboard
              <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
}

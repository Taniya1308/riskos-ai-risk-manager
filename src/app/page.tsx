import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  ArrowRight,
  LayoutDashboard,
  ShieldAlert,
  Zap,
  Sparkles,
  Lock,
  History,
  Gauge,
  Bot,
  TrendingUp,
  CheckCircle,
  AlertTriangle,
  MessageSquare,
  RefreshCw,
  DollarSign,
} from 'lucide-react';

const PIPELINE_STEPS = [
  {
    step: '01',
    title: 'Webhook Intake',
    desc: 'Razorpay fires payment.authorized or payment.failed. RISKOS verifies the HMAC-SHA256 signature and extracts the payment entity.',
    icon: Zap,
    color: 'text-blue-400',
    bg: 'bg-blue-500/10 border-blue-500/20',
  },
  {
    step: '02',
    title: '6-Signal Risk Engine',
    desc: 'Amount, device fingerprint, geo/IP, payment status, velocity, and currency are each scored 0–100 and weighted into a composite score.',
    icon: Gauge,
    color: 'text-purple-400',
    bg: 'bg-purple-500/10 border-purple-500/20',
  },
  {
    step: '03',
    title: 'Gemini AI Investigation',
    desc: 'Gemini 1.5 Flash receives the full signal context and generates a plain-English fraud explanation, key risk factors, and a confidence-rated recommendation.',
    icon: Sparkles,
    color: 'text-indigo-400',
    bg: 'bg-indigo-500/10 border-indigo-500/20',
  },
  {
    step: '04',
    title: 'Auto-Block Engine',
    desc: 'Cases scoring ≥85 are automatically blocked without human input. RISKOS immediately triggers a Razorpay refund API call and logs the action.',
    icon: ShieldAlert,
    color: 'text-red-400',
    bg: 'bg-red-500/10 border-red-500/20',
  },
  {
    step: '05',
    title: 'Human-in-the-Loop',
    desc: 'Medium-risk cases (40–84) queue for analyst review. Analysts can approve, block, or escalate — and chat with the AI to ask case-specific questions.',
    icon: Bot,
    color: 'text-amber-400',
    bg: 'bg-amber-500/10 border-amber-500/20',
  },
  {
    step: '06',
    title: 'Immutable Audit Trail',
    desc: 'Every action — automated or human — is permanently recorded: score, signals, AI reasoning, refund ID, analyst name, and timestamp.',
    icon: History,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10 border-emerald-500/20',
  },
];

const FEATURES = [
  {
    icon: Sparkles,
    title: 'Gemini AI — Structured JSON Output',
    desc: 'Not a chatbot wrapper. Gemini 1.5 Flash is called in JSON mode, returning a typed investigation object every time — explanation, action, factors, confidence.',
    color: 'text-indigo-400',
    bg: 'bg-indigo-500/10 border-indigo-500/20',
  },
  {
    icon: Bot,
    title: 'AI Analyst Chat',
    desc: 'Multi-turn Gemini conversation grounded in full case context. Ask "Why is this flagged?", "Is the device suspicious?", or "What should I do?" and get real answers.',
    color: 'text-purple-400',
    bg: 'bg-purple-500/10 border-purple-500/20',
  },
  {
    icon: TrendingUp,
    title: 'Real Velocity Tracking',
    desc: 'Per-customer time-window analysis tracks transaction count and amount over 1h and 24h rolling windows — not pattern matching, actual history.',
    color: 'text-blue-400',
    bg: 'bg-blue-500/10 border-blue-500/20',
  },
  {
    icon: DollarSign,
    title: 'Razorpay Back-Actions',
    desc: 'When a payment is blocked — automatically or manually — RISKOS calls the Razorpay Refund API and logs the refund ID in the audit trail.',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10 border-emerald-500/20',
  },
  {
    icon: AlertTriangle,
    title: 'Auto-Block at Score ≥ 85',
    desc: 'The highest-risk cases never reach a human queue. The rule engine blocks them instantly, issues a refund, and writes a complete audit entry.',
    color: 'text-red-400',
    bg: 'bg-red-500/10 border-red-500/20',
  },
  {
    icon: Lock,
    title: 'Immutable Audit Trail',
    desc: 'Every system decision and analyst action is permanently recorded with full signal context — HMAC-verified source, AI reasoning, and actor identity.',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10 border-amber-500/20',
  },
];

const DEMO_STEPS = [
  { n: '1', text: 'Open the dashboard — 3 pre-seeded cases are waiting' },
  { n: '2', text: 'Click 🔴 Critical Risk to inject a ₹1,85,000 Tor-origin payment' },
  { n: '3', text: 'Watch it auto-block instantly (score ≥ 85) with a refund issued' },
  { n: '4', text: 'Click the case → see Gemini\'s AI investigation + 6 signal bars' },
  { n: '5', text: 'Go to "Ask AI" tab → type "Why is this flagged?"' },
  { n: '6', text: 'Check the Audit Trail — every action is permanently recorded' },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="relative flex flex-col items-center text-center px-6 pt-20 pb-16 overflow-hidden">
        {/* Background glow */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-indigo-600/10 rounded-full blur-3xl" />
        </div>

        <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-4 py-1.5 text-xs font-semibold text-indigo-400 mb-6">
          <Sparkles className="h-3.5 w-3.5" />
          Razorpay AI Builder · Track 2: AI Risk Manager
        </div>

        <h1 className="text-4xl sm:text-6xl font-black tracking-tight bg-gradient-to-b from-white via-slate-200 to-slate-500 bg-clip-text text-transparent max-w-4xl leading-tight mb-6">
          Autonomous Payment Risk Operations
        </h1>

        <p className="max-w-2xl text-slate-400 text-base sm:text-lg leading-relaxed mb-8">
          RISKOS intercepts Razorpay payments in real time, scores them across <strong className="text-slate-300">6 risk signals</strong>, gets a <strong className="text-slate-300">Gemini AI investigation</strong>, auto-blocks fraud at the threshold, and issues <strong className="text-slate-300">automatic refunds</strong> — all before a human reviews it.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4 mb-12">
          <Link href="/dashboard">
            <Button size="lg" className="bg-indigo-600 hover:bg-indigo-500 text-white gap-2 font-semibold shadow-lg shadow-indigo-600/25">
              <LayoutDashboard className="h-4 w-4" />
              Launch Command Center
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <a href="https://aistudio.google.com" target="_blank" rel="noopener noreferrer">
            <Button variant="outline" size="lg" className="border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800 gap-2">
              <Sparkles className="h-4 w-4" />
              Get Free Gemini API Key
            </Button>
          </a>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-3xl w-full">
          {[
            { label: 'Risk Signals', value: '6', sub: 'weighted factors' },
            { label: 'AI Engine', value: 'Gemini', sub: '1.5 Flash JSON mode' },
            { label: 'Auto-Block', value: '≥85', sub: 'score threshold' },
            { label: 'Audit Trail', value: '100%', sub: 'immutable log' },
          ].map(({ label, value, sub }) => (
            <div key={label} className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-center">
              <p className="text-2xl font-black text-indigo-400">{value}</p>
              <p className="text-xs font-semibold text-slate-200 mt-0.5">{label}</p>
              <p className="text-[11px] text-slate-500 mt-0.5">{sub}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── How It Works Pipeline ─────────────────────────────────────────── */}
      <section className="px-6 py-16 max-w-6xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-2xl sm:text-3xl font-black text-white">How It Works</h2>
          <p className="text-slate-400 mt-2 text-sm">End-to-end in under 2 seconds per payment</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {PIPELINE_STEPS.map(({ step, title, desc, icon: Icon, color, bg }) => (
            <div key={step} className={`rounded-xl border p-5 space-y-3 ${bg}`}>
              <div className="flex items-center gap-3">
                <div className={`flex h-9 w-9 items-center justify-center rounded-lg border ${bg}`}>
                  <Icon className={`h-5 w-5 ${color}`} />
                </div>
                <span className={`text-xs font-mono font-bold ${color}`}>{step}</span>
              </div>
              <h3 className="font-bold text-sm text-slate-100">{title}</h3>
              <p className="text-xs text-slate-400 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Feature Highlights ────────────────────────────────────────────── */}
      <section className="px-6 py-16 bg-slate-900/40 border-y border-slate-800">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-black text-white">What Makes RISKOS Different</h2>
            <p className="text-slate-400 mt-2 text-sm">Not a dashboard. An autonomous risk operations system.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map(({ icon: Icon, title, desc, color, bg }) => (
              <div key={title} className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 space-y-3">
                <div className={`flex h-9 w-9 items-center justify-center rounded-lg border ${bg}`}>
                  <Icon className={`h-5 w-5 ${color}`} />
                </div>
                <h3 className="font-bold text-sm text-slate-100">{title}</h3>
                <p className="text-xs text-slate-400 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Live Demo Guide ───────────────────────────────────────────────── */}
      <section className="px-6 py-16 max-w-4xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-2xl sm:text-3xl font-black text-white">Try It in 60 Seconds</h2>
          <p className="text-slate-400 mt-2 text-sm">No setup needed — works out of the box</p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden">
          <div className="p-5 border-b border-slate-800 bg-slate-950/60 flex items-center gap-3">
            <RefreshCw className="h-4 w-4 text-indigo-400" />
            <span className="text-sm font-semibold text-slate-200">Live Demo Flow</span>
          </div>
          <div className="divide-y divide-slate-800/60">
            {DEMO_STEPS.map(({ n, text }) => (
              <div key={n} className="flex items-start gap-4 px-5 py-4">
                <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-indigo-500/20 border border-indigo-500/30 text-xs font-bold text-indigo-400">
                  {n}
                </span>
                <p className="text-sm text-slate-300 leading-relaxed">{text}</p>
              </div>
            ))}
          </div>
          <div className="p-5 border-t border-slate-800 bg-slate-950/40">
            <Link href="/dashboard">
              <Button className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold gap-2">
                <LayoutDashboard className="h-4 w-4" />
                Open Command Center
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── Tech Stack ────────────────────────────────────────────────────── */}
      <section className="px-6 py-12 bg-slate-900/40 border-t border-slate-800">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-xs text-slate-500 uppercase tracking-wide font-semibold mb-6">Built With</p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            {['Next.js 16', 'TypeScript 5', 'Google Gemini 1.5 Flash', 'Razorpay API', 'Supabase Realtime', 'Tailwind CSS 4'].map(tech => (
              <span key={tech} className="px-3 py-1.5 rounded-full border border-slate-700 bg-slate-800/60 text-xs text-slate-300 font-medium">
                {tech}
              </span>
            ))}
          </div>
          <div className="mt-8 flex items-center justify-center gap-2 text-xs text-slate-500">
            <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
            Zero setup required — works with in-memory store, no DB or API keys needed
          </div>
        </div>
      </section>
    </div>
  );
}

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ShieldAlert, LayoutDashboard, Home, ExternalLink, AlertTriangle, GitBranch } from 'lucide-react';

export default function Navbar() {
  const pathname = usePathname();
  const [pendingCount, setPendingCount] = useState(0);
  const [aiStatus, setAiStatus] = useState<'ok' | 'degraded'>('degraded');

  // Poll for pending cases count + health
  useEffect(() => {
    async function poll() {
      try {
        const [statsRes, healthRes] = await Promise.all([
          fetch('/api/stats'),
          fetch('/api/health'),
        ]);
        const stats = await statsRes.json();
        const health = await healthRes.json();
        setPendingCount(stats.pending || 0);
        setAiStatus(health.services?.gemini?.status === 'ok' ? 'ok' : 'degraded');
      } catch {}
    }
    poll();
    const interval = setInterval(poll, 8000);
    return () => clearInterval(interval);
  }, []);

  const navLinks = [
    { href: '/',          label: 'Overview',        icon: Home },
    { href: '/dashboard', label: 'Command Center',  icon: LayoutDashboard },
  ];

  return (
    <nav className="sticky top-0 z-40 w-full border-b border-white/[0.06] bg-[oklch(0.08_0.01_265)]/90 backdrop-blur-xl">
      {/* Top gradient accent line */}
      <div className="h-px w-full bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent" />

      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 h-14">

        {/* ── Left: Brand + Nav ─────────────────────────────────────────── */}
        <div className="flex items-center gap-4">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group flex-shrink-0">
            <div className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 shadow-md shadow-indigo-500/30 transition-all group-hover:scale-110 group-hover:shadow-indigo-500/50">
              <ShieldAlert className="h-4 w-4 text-white" />
            </div>
            <span className="font-black tracking-tight text-white font-mono text-[15px] leading-none">
              RISK<span className="text-indigo-400">OS</span>
            </span>
          </Link>

          {/* Divider */}
          <div className="hidden sm:block h-5 w-px bg-white/[0.08]" />

          {/* Nav links */}
          <div className="hidden sm:flex items-center gap-0.5">
            {navLinks.map(({ href, label, icon: Icon }) => {
              const active = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    active
                      ? 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/20'
                      : 'text-slate-500 hover:text-slate-200 hover:bg-white/[0.05]'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                  {/* Pending badge on Command Center */}
                  {href === '/dashboard' && pendingCount > 0 && (
                    <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[9px] font-black text-black leading-none">
                      {pendingCount}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>

        {/* ── Right: Status + Actions ───────────────────────────────────── */}
        <div className="flex items-center gap-2.5">

          {/* AI Engine status */}
          <div className={`hidden md:flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-semibold ${
            aiStatus === 'ok'
              ? 'border-violet-500/20 bg-violet-500/10 text-violet-400'
              : 'border-slate-700 bg-white/[0.03] text-slate-500'
          }`}>
            <span className={`h-1.5 w-1.5 rounded-full ${aiStatus === 'ok' ? 'bg-violet-400' : 'bg-slate-600'}`} />
            {aiStatus === 'ok' ? 'Gemini AI · Active' : 'Gemini AI · Fallback'}
          </div>

          {/* Webhook live indicator */}
          <div className="hidden sm:flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-50" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
            </span>
            <span className="text-[11px] font-medium text-slate-400">Webhook <span className="text-emerald-400 font-bold">Live</span></span>
          </div>

          {/* Pending alerts bell */}
          {pendingCount > 0 && (
            <Link
              href="/dashboard"
              className="relative flex h-8 w-8 items-center justify-center rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition"
              title={`${pendingCount} pending cases`}
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[9px] font-black text-black">
                {pendingCount > 9 ? '9+' : pendingCount}
              </span>
            </Link>
          )}

          {/* GitHub */}
          <a
            href="https://github.com/Taniya1308/riskos-ai-risk-manager"
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.03] text-slate-400 hover:text-white hover:bg-white/[0.07] transition"
            title="View on GitHub"
          >
            <GitBranch className="h-3.5 w-3.5" />
          </a>

          {/* Razorpay docs */}
          <a
            href="https://razorpay.com/docs/webhooks/"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.03] text-slate-400 hover:text-white hover:bg-white/[0.07] transition"
            title="Razorpay Webhook Docs"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </a>

          {/* CTA — only show when NOT on dashboard */}
          {pathname !== '/dashboard' && (
            <Link
              href="/dashboard"
              className="flex items-center gap-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 px-3.5 py-2 text-xs font-bold text-white shadow-lg shadow-indigo-600/25 transition-all hover:scale-105"
            >
              <LayoutDashboard className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Open Dashboard</span>
            </Link>
          )}
        </div>

      </div>
    </nav>
  );
}

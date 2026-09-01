'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  ShieldAlert, LayoutDashboard, Home, AlertTriangle,
  GitBranch, BarChart3, Settings, Sparkles,
} from 'lucide-react';

export default function Navbar() {
  const pathname = usePathname();
  const [pendingCount, setPendingCount] = useState(0);
  const [aiActive, setAiActive] = useState(false);

  useEffect(() => {
    async function poll() {
      try {
        const [statsRes, healthRes] = await Promise.all([
          fetch('/api/stats'),
          fetch('/api/health'),
        ]);
        const stats  = await statsRes.json();
        const health = await healthRes.json();
        setPendingCount(stats.pending || 0);
        setAiActive(health.services?.gemini?.status === 'ok');
      } catch {}
    }
    poll();
    const id = setInterval(poll, 10000);
    return () => clearInterval(id);
  }, []);

  const navLinks = [
    { href: '/',          label: 'Overview',       icon: Home },
    { href: '/dashboard', label: 'Command Center', icon: LayoutDashboard },
    { href: '/analytics', label: 'Analytics',      icon: BarChart3 },
    { href: '/rules',     label: 'Rules',          icon: Settings },
  ];

  return (
    <nav className="sticky top-0 z-40 w-full border-b border-white/[0.06] bg-[oklch(0.08_0.01_265)]/90 backdrop-blur-xl">
      <div className="h-px w-full bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent" />

      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 h-14">

        {/* ── Left: Brand + Nav ─────────────────────────────────────────── */}
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2.5 group flex-shrink-0">
            <div className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 shadow-md shadow-indigo-500/30 transition-all group-hover:scale-110 group-hover:shadow-indigo-500/50">
              <ShieldAlert className="h-4 w-4 text-white" />
            </div>
            <span className="font-black tracking-tight text-white font-mono text-[15px] leading-none">
              RISK<span className="text-indigo-400">OS</span>
            </span>
          </Link>

          <div className="hidden sm:block h-5 w-px bg-white/[0.08]" />

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

          {/* Gemini AI status — only meaningful when active */}
          {aiActive && (
            <div className="hidden md:flex items-center gap-1.5 rounded-full border border-violet-500/20 bg-violet-500/10 px-3 py-1.5 text-[11px] font-semibold text-violet-400">
              <Sparkles className="h-3 w-3" />
              Gemini AI
            </div>
          )}

          {/* Pending alert — only when there are pending cases */}
          {pendingCount > 0 && (
            <Link
              href="/dashboard"
              className="relative flex h-8 items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 text-amber-400 hover:bg-amber-500/20 transition text-xs font-bold"
              title={`${pendingCount} pending cases`}
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              <span>{pendingCount} pending</span>
            </Link>
          )}

          {/* GitHub */}
          <a
            href="https://github.com/Taniya1308/riskos-ai-risk-manager"
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.03] text-slate-400 hover:text-white hover:bg-white/[0.07] transition"
            title="View source on GitHub"
            aria-label="View source on GitHub"
          >
            <GitBranch className="h-3.5 w-3.5" />
          </a>

          {/* CTA — only when not on dashboard */}
          {pathname !== '/dashboard' && (
            <Link
              href="/dashboard"
              className="flex items-center gap-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 px-3.5 py-2 text-xs font-bold text-white shadow-lg shadow-indigo-600/25 transition-all hover:scale-105"
            >
              <LayoutDashboard className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Dashboard</span>
            </Link>
          )}
        </div>

      </div>
    </nav>
  );
}

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ShieldAlert, LayoutDashboard, Home, Activity, Zap } from 'lucide-react';

export default function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="sticky top-0 z-40 w-full border-b border-white/[0.06] bg-[oklch(0.08_0.01_265)]/80 backdrop-blur-xl">
      {/* Top accent line */}
      <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-indigo-500/60 to-transparent" />

      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 py-3">
        {/* Brand */}
        <div className="flex items-center gap-5">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/30 transition group-hover:shadow-indigo-500/50 group-hover:scale-105">
              <ShieldAlert className="h-5 w-5 text-white" />
              {/* Glow pulse */}
              <div className="absolute inset-0 rounded-xl bg-indigo-500/20 animate-ping opacity-0 group-hover:opacity-100" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black tracking-tight text-white font-mono text-base leading-none">
                  RISK<span className="text-indigo-400">OS</span>
                </span>
                <span className="hidden sm:inline rounded-md bg-indigo-500/15 px-1.5 py-0.5 text-[10px] font-bold text-indigo-400 border border-indigo-500/25 leading-none">
                  AI Builder
                </span>
              </div>
              <p className="text-[10px] text-slate-500 font-medium mt-0.5">Razorpay Track 2</p>
            </div>
          </Link>

          {/* Nav links */}
          <div className="hidden md:flex items-center gap-1 pl-4 border-l border-white/[0.06]">
            {[
              { href: '/', label: 'Overview', icon: Home },
              { href: '/dashboard', label: 'Command Center', icon: LayoutDashboard },
            ].map(({ href, label, icon: Icon }) => {
              const active = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    active
                      ? 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/20'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.05]'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </Link>
              );
            })}
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3">
          {/* Live status */}
          <div className="hidden sm:flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
            </span>
            <span className="text-[11px] font-medium text-slate-400">
              Webhook <span className="text-emerald-400 font-bold">Live</span>
            </span>
          </div>

          {/* AI badge */}
          <div className="hidden sm:flex items-center gap-1.5 rounded-full border border-violet-500/20 bg-violet-500/10 px-3 py-1.5">
            <Zap className="h-3 w-3 text-violet-400" />
            <span className="text-[11px] font-semibold text-violet-400">Gemini AI</span>
          </div>

          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-indigo-600/25 transition-all hover:shadow-indigo-500/40 hover:scale-105"
          >
            <Activity className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Live Dashboard</span>
            <span className="sm:hidden">Dashboard</span>
          </Link>
        </div>
      </div>
    </nav>
  );
}

/**
 * GET /api/analytics
 * Returns fraud trend data, top risk locations, hourly distribution,
 * severity breakdown, and top triggered rules for the analytics dashboard.
 */

import { NextResponse } from 'next/server';
import { mockDb } from '@/lib/mock-store';

export async function GET() {
  try {
    const cases = mockDb.risk_cases;
    const transactions = mockDb.transactions;

  // ── Severity breakdown ────────────────────────────────────────────────
  const severityBreakdown = {
    critical: cases.filter(c => c.risk_scores?.severity === 'critical').length,
    high:     cases.filter(c => c.risk_scores?.severity === 'high').length,
    medium:   cases.filter(c => c.risk_scores?.severity === 'medium').length,
    low:      cases.filter(c => c.risk_scores?.severity === 'low').length,
  };

  // ── Status breakdown ──────────────────────────────────────────────────
  const statusBreakdown = {
    new:       cases.filter(c => !c.status || c.status === 'new').length,
    blocked:   cases.filter(c => c.status === 'blocked').length,
    approved:  cases.filter(c => c.status === 'approved').length,
    escalated: cases.filter(c => c.status === 'escalated').length,
  };

  // ── Top risky locations ───────────────────────────────────────────────
  const locationMap: Record<string, { count: number; total_score: number }> = {};
  cases.forEach(c => {
    const loc = c.transactions?.location_id || 'unknown';
    if (!locationMap[loc]) locationMap[loc] = { count: 0, total_score: 0 };
    locationMap[loc].count++;
    locationMap[loc].total_score += c.risk_scores?.score || 0;
  });
  const topLocations = Object.entries(locationMap)
    .map(([location, data]) => ({
      location,
      count: data.count,
      avg_score: Math.round(data.total_score / data.count),
    }))
    .sort((a, b) => b.avg_score - a.avg_score)
    .slice(0, 8);

  // ── Score distribution buckets ────────────────────────────────────────
  const scoreDistribution = [
    { range: '0–20',   count: cases.filter(c => (c.risk_scores?.score || 0) <= 20).length },
    { range: '21–40',  count: cases.filter(c => { const s = c.risk_scores?.score || 0; return s > 20 && s <= 40; }).length },
    { range: '41–60',  count: cases.filter(c => { const s = c.risk_scores?.score || 0; return s > 40 && s <= 60; }).length },
    { range: '61–80',  count: cases.filter(c => { const s = c.risk_scores?.score || 0; return s > 60 && s <= 80; }).length },
    { range: '81–100', count: cases.filter(c => (c.risk_scores?.score || 0) > 80).length },
  ];

  // ── Top triggered rules ───────────────────────────────────────────────
  const ruleMap: Record<string, number> = {};
  cases.forEach(c => {
    (c.risk_scores?.triggered_rules || []).forEach((rule: string) => {
      ruleMap[rule] = (ruleMap[rule] || 0) + 1;
    });
  });
  const topRules = Object.entries(ruleMap)
    .map(([rule, count]) => ({ rule: rule.replace('RULE_', '').replace(/_/g, ' '), count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  // ── Amount range breakdown ────────────────────────────────────────────
  const amountRanges = [
    { range: '< ₹10K',      count: transactions.filter(t => t.amount < 10000).length },
    { range: '₹10K–50K',    count: transactions.filter(t => t.amount >= 10000 && t.amount < 50000).length },
    { range: '₹50K–1L',     count: transactions.filter(t => t.amount >= 50000 && t.amount < 100000).length },
    { range: '₹1L–5L',      count: transactions.filter(t => t.amount >= 100000 && t.amount < 500000).length },
    { range: '> ₹5L',       count: transactions.filter(t => t.amount >= 500000).length },
  ];

  // ── Daily trend (last 7 days) ─────────────────────────────────────────
  const dailyTrend: { date: string; cases: number; blocked: number; amount: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const day = new Date();
    day.setDate(day.getDate() - i);
    const dateStr = day.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
    const start = new Date(day); start.setHours(0, 0, 0, 0);
    const end   = new Date(day); end.setHours(23, 59, 59, 999);

    const dayCases = cases.filter(c => {
      const d = new Date(c.created_at);
      return d >= start && d <= end;
    });

    dailyTrend.push({
      date: dateStr,
      cases: dayCases.length,
      blocked: dayCases.filter(c => c.status === 'blocked').length,
      amount: dayCases.reduce((s, c) => s + (c.transactions?.amount || 0), 0),
    });
  }

  // ── Summary numbers ───────────────────────────────────────────────────
  const totalAmount = transactions.reduce((s, t) => s + t.amount, 0);
  const blockedAmount = cases
    .filter(c => c.status === 'blocked')
    .reduce((s, c) => s + (c.transactions?.amount || 0), 0);
  const fraudRate = cases.length > 0
    ? Math.round(((statusBreakdown.blocked + statusBreakdown.escalated) / cases.length) * 100)
    : 0;
  const avgScore = cases.length
    ? Math.round(cases.reduce((s, c) => s + (c.risk_scores?.score || 0), 0) / cases.length)
    : 0;

  return NextResponse.json({
    summary: {
      total_transactions: transactions.length,
      total_cases: cases.length,
      total_amount_screened: totalAmount,
      amount_blocked: blockedAmount,
      fraud_rate: fraudRate,
      avg_risk_score: avgScore,
    },
    severity_breakdown: severityBreakdown,
    status_breakdown: statusBreakdown,
    top_locations: topLocations,
    score_distribution: scoreDistribution,
    top_rules: topRules,
    amount_ranges: amountRanges,
    daily_trend: dailyTrend,
  });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Analytics failed';
    console.error('[RISKOS] Analytics error:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

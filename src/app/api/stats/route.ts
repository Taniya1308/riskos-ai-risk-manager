/**
 * GET /api/stats
 * Returns live operational metrics for the RISKOS dashboard header.
 */

import { NextResponse } from 'next/server';
import { mockDb } from '@/lib/mock-store';

export async function GET() {
  const cases = mockDb.risk_cases;
  const transactions = mockDb.transactions;

  const totalScreened = transactions.length;
  const totalCases = cases.length;
  const blocked = cases.filter(c => c.status === 'blocked').length;
  const approved = cases.filter(c => c.status === 'approved').length;
  const escalated = cases.filter(c => c.status === 'escalated').length;
  const pending = cases.filter(c => !c.status || c.status === 'new').length;
  const critical = cases.filter(c => c.risk_scores?.severity === 'critical').length;
  const autoBlocked = mockDb.audit_logs.filter(l => l.action === 'AUTO_BLOCKED_HIGH_RISK').length;
  const refundsIssued = mockDb.audit_logs.filter(l => l.action === 'AUTO_REFUND_ISSUED').length;

  // Amount protected = sum of blocked transaction amounts
  const amountProtected = cases
    .filter(c => c.status === 'blocked')
    .reduce((sum, c) => sum + (c.transactions?.amount || 0), 0);

  // Amount screened = total of all transactions
  const amountScreened = transactions.reduce((sum, t) => sum + (t.amount || 0), 0);

  // Average risk score
  const avgScore = cases.length
    ? Math.round(cases.reduce((s, c) => s + (c.risk_scores?.score || 0), 0) / cases.length)
    : 0;

  // AI-powered investigations
  const aiPoweredCount = mockDb.audit_logs.filter(
    l => (l.metadata?.ai_investigation as Record<string,unknown>)?.ai_powered === true
  ).length;

  // Detection rate = (blocked + escalated) / total cases
  const detectionRate = totalCases > 0
    ? Math.round(((blocked + escalated) / totalCases) * 100)
    : 0;

  return NextResponse.json({
    total_screened: totalScreened,
    total_cases: totalCases,
    pending,
    blocked,
    approved,
    escalated,
    critical,
    auto_blocked: autoBlocked,
    refunds_issued: refundsIssued,
    amount_protected: amountProtected,
    amount_screened: amountScreened,
    avg_risk_score: avgScore,
    ai_powered_investigations: aiPoweredCount,
    detection_rate: detectionRate,
  });
}

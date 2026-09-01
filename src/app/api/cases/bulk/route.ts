/**
 * POST /api/cases/bulk
 * Approve, block, or escalate multiple cases at once.
 */

import { NextRequest, NextResponse } from 'next/server';
import { mockDb } from '@/lib/mock-store';
import { refundPayment } from '@/lib/razorpay-client';

export async function POST(req: NextRequest) {
  try {
    const { caseIds, decision, actor } = await req.json();

    if (!caseIds?.length || !decision) {
      return NextResponse.json({ error: 'caseIds and decision are required' }, { status: 400 });
    }

    const currentActor = actor || 'Analyst_Current';
    const results: { caseId: string; success: boolean; refund?: unknown }[] = [];

    for (const caseId of caseIds) {
      const foundCase = mockDb.risk_cases.find(c => c.id === caseId);
      if (!foundCase) { results.push({ caseId, success: false }); continue; }

      // Update status
      foundCase.status = decision;

      // Write audit log
      mockDb.audit_logs.unshift({
        id: `audit_bulk_${Date.now()}_${caseId.slice(-4)}`,
        case_id: caseId,
        actor: currentActor,
        action: `BULK_${decision.toUpperCase()}`,
        metadata: { bulk_action: true, timestamp: new Date().toISOString() },
        created_at: new Date().toISOString(),
      });

      // Auto-refund if blocking
      let refundResult = null;
      if (decision === 'blocked' && foundCase.transactions) {
        refundResult = await refundPayment(
          foundCase.transactions.razorpay_payment_id,
          foundCase.transactions.amount,
          `bulk_blocked_by_${currentActor}`
        );
        mockDb.audit_logs.unshift({
          id: `audit_refund_bulk_${Date.now()}_${caseId.slice(-4)}`,
          case_id: caseId,
          actor: 'system_agent',
          action: refundResult.success ? 'RAZORPAY_REFUND_ISSUED' : 'RAZORPAY_REFUND_FAILED',
          metadata: {
            payment_id: foundCase.transactions.razorpay_payment_id,
            refund_id: refundResult.refund_id,
            simulated: refundResult.simulated ?? true,
          },
          created_at: new Date().toISOString(),
        });
      }

      results.push({ caseId, success: true, refund: refundResult });
    }

    return NextResponse.json({
      success: true,
      processed: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Bulk action failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/razorpay/refund
 * Called when an analyst blocks a case — triggers automatic refund via Razorpay API.
 */

import { NextRequest, NextResponse } from 'next/server';
import { refundPayment } from '@/lib/razorpay-client';
import { mockDb } from '@/lib/mock-store';

export async function POST(req: NextRequest) {
  try {
    const { caseId, paymentId, amount, reason } = await req.json();

    if (!caseId || !paymentId) {
      return NextResponse.json({ error: 'caseId and paymentId are required' }, { status: 400 });
    }

    const result = await refundPayment(
      paymentId,
      amount || 0,
      reason || 'fraud_detected_by_riskos'
    );

    // Log the refund action to audit trail
    const auditLog = {
      id: `audit_refund_${Date.now()}`,
      case_id: caseId,
      actor: 'system_agent',
      action: result.success ? 'RAZORPAY_REFUND_ISSUED' : 'RAZORPAY_REFUND_FAILED',
      metadata: {
        payment_id: paymentId,
        refund_id: result.refund_id,
        amount_refunded: result.amount,
        refund_status: result.status,
        simulated: result.simulated ?? false,
        error: result.error,
        timestamp: new Date().toISOString(),
      },
      created_at: new Date().toISOString(),
    };
    mockDb.audit_logs.unshift(auditLog);

    return NextResponse.json({
      success: result.success,
      refund_id: result.refund_id,
      amount: result.amount,
      status: result.status,
      simulated: result.simulated ?? false,
      error: result.error,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Refund failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

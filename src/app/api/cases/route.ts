import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { mockDb } from '@/lib/mock-store';
import { refundPayment } from '@/lib/razorpay-client';

const isRealSupabase =
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder') &&
  process.env.SUPABASE_SERVICE_ROLE_KEY &&
  !process.env.SUPABASE_SERVICE_ROLE_KEY.includes('placeholder');

// GET /api/cases
export async function GET() {
  try {
    if (isRealSupabase) {
      const { data, error } = await supabase
        .from('risk_cases')
        .select('*, transactions(*), risk_scores(*)')
        .order('created_at', { ascending: false });

      if (!error && data) {
        return NextResponse.json({ cases: data, source: 'supabase' });
      }
    }

    return NextResponse.json({ cases: mockDb.risk_cases, source: 'mock' });
  } catch {
    return NextResponse.json({ cases: mockDb.risk_cases, source: 'mock' });
  }
}

// POST /api/cases — decision + optional Razorpay refund on block
export async function POST(req: NextRequest) {
  try {
    const { caseId, decision, actor } = await req.json();

    if (!caseId || !decision) {
      return NextResponse.json({ error: 'caseId and decision are required' }, { status: 400 });
    }

    const currentActor = actor || 'Analyst_Current';

    // Update status in Supabase
    if (isRealSupabase) {
      try {
        await supabase.from('risk_cases').update({ status: decision }).eq('id', caseId);
        await supabase.from('audit_logs').insert({
          case_id: caseId,
          actor: currentActor,
          action: `DECISION_${decision.toUpperCase()}`,
          metadata: { timestamp: new Date().toISOString() },
        });
      } catch (e) {
        console.warn('[RISKOS] Supabase mutation failed, using mock:', e);
      }
    }

    // Update mock store
    const foundCase = mockDb.risk_cases.find(c => c.id === caseId);
    if (foundCase) foundCase.status = decision;

    // Write decision audit log
    mockDb.audit_logs.unshift({
      id: `audit_${Date.now()}`,
      case_id: caseId,
      actor: currentActor,
      action: `DECISION_${decision.toUpperCase()}`,
      metadata: { timestamp: new Date().toISOString() },
      created_at: new Date().toISOString(),
    });

    // ── Auto-Refund on Block ─────────────────────────────────────────────
    let refundResult = null;
    if (decision === 'blocked' && foundCase?.transactions) {
      const txn = foundCase.transactions;
      const refund = await refundPayment(
        txn.razorpay_payment_id,
        txn.amount,
        `analyst_blocked_by_${currentActor}`
      );
      refundResult = refund;

      // Log refund outcome
      mockDb.audit_logs.unshift({
        id: `audit_refund_${Date.now()}`,
        case_id: caseId,
        actor: 'system_agent',
        action: refund.success ? 'RAZORPAY_REFUND_ISSUED' : 'RAZORPAY_REFUND_FAILED',
        metadata: {
          payment_id: txn.razorpay_payment_id,
          refund_id: refund.refund_id,
          amount: txn.amount,
          simulated: refund.simulated ?? true,
          initiated_by: currentActor,
          error: refund.error,
        },
        created_at: new Date().toISOString(),
      });
    }

    return NextResponse.json({
      success: true,
      case: foundCase,
      refund: refundResult,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to update decision';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

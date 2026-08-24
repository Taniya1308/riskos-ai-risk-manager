import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { runAIInvestigation } from '@/lib/ai-investigation';
import { runRiskEngine, TransactionInput } from '@/lib/risk-engine';
import { mockDb, MockTransaction, MockRiskScore, MockRiskCase, MockAuditLog, recordVelocity } from '@/lib/mock-store';
import { refundPayment } from '@/lib/razorpay-client';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-key';

const isRealSupabase =
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder') &&
  process.env.SUPABASE_SERVICE_ROLE_KEY &&
  !process.env.SUPABASE_SERVICE_ROLE_KEY.includes('placeholder');

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Auto-block threshold — cases above this are blocked automatically without human
const AUTO_BLOCK_THRESHOLD = 85;

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get('x-razorpay-signature') || '';
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET || 'test_secret';

    // ── 1. Verify Razorpay HMAC-SHA256 Webhook Signature ──────────────────
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(rawBody)
      .digest('hex');

    if (signature && process.env.NODE_ENV === 'production' && expectedSignature !== signature) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    let event: Record<string, unknown>;
    try {
      event = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
    }

    const eventType = event.event as string;
    const supportedEvents = ['payment.authorized', 'payment.failed', 'payment.captured'];
    if (!supportedEvents.includes(eventType)) {
      return NextResponse.json({ status: 'ignored', event: eventType });
    }

    // ── 2. Extract Payment Entity ──────────────────────────────────────────
    const payloadObj = event.payload as Record<string, unknown>;
    const paymentWrapper = payloadObj?.payment as Record<string, unknown>;
    const paymentEntity = (paymentWrapper?.entity as Record<string, unknown>) ?? {
      id: `pay_${Date.now()}`,
      customer_id: 'cust_anonymous',
      amount: 7500000,
      currency: 'INR',
      status: 'captured',
    };

    const parsedAmount = ((paymentEntity.amount as number) || 0) / 100;
    const paymentId = (paymentEntity.id as string) || `pay_${Date.now()}`;
    const customerId = (paymentEntity.customer_id as string) || 'cust_anonymous';
    const currency = (paymentEntity.currency as string) || 'INR';
    const status = (paymentEntity.status as string) || 'captured';
    const notes = (paymentEntity.notes as Record<string, string>) || {};
    const deviceId = notes.device_id || 'device_unknown';
    const locationId = notes.location_id || 'unknown';

    let txnId = `txn_${Date.now()}`;
    let riskScoreId = `score_${Date.now()}`;
    let caseId = `case_${Date.now()}`;

    // ── 3. Record Velocity (real time-window tracking) ─────────────────────
    recordVelocity(customerId, parsedAmount);

    // ── 4. Persist Transaction ─────────────────────────────────────────────
    if (isRealSupabase) {
      try {
        const { data: txn } = await supabase
          .from('transactions')
          .upsert(
            { razorpay_payment_id: paymentId, customer_id: customerId, amount: parsedAmount, currency, status, device_id: deviceId, location_id: locationId },
            { onConflict: 'razorpay_payment_id' }
          )
          .select()
          .single();
        if (txn) txnId = (txn as { id: string }).id;
      } catch (e) {
        console.warn('[RISKOS] Supabase transaction insert failed, using mock:', e);
      }
    }

    const mockTxn: MockTransaction = {
      id: txnId,
      razorpay_payment_id: paymentId,
      customer_id: customerId,
      amount: parsedAmount,
      currency,
      status,
      device_id: deviceId,
      location_id: locationId,
      created_at: new Date().toISOString(),
    };
    mockDb.transactions.unshift(mockTxn);

    // ── 5. Multi-Signal Risk Engine ────────────────────────────────────────
    const txnInput: TransactionInput = {
      id: txnId,
      amount: parsedAmount,
      currency,
      status,
      customer_id: customerId,
      device_id: deviceId,
      location_id: locationId,
      razorpay_payment_id: paymentId,
    };

    const riskResult = runRiskEngine(txnInput, eventType);
    const { composite_score, severity, signals, triggered_rules, recommended_action } = riskResult;

    // ── 6. Persist Risk Score ──────────────────────────────────────────────
    if (isRealSupabase) {
      try {
        const { data: scoreData } = await supabase
          .from('risk_scores')
          .insert({ transaction_id: txnId, score: composite_score, severity, signals: JSON.stringify(signals), triggered_rules, recommended_action })
          .select()
          .single();
        if (scoreData) riskScoreId = (scoreData as { id: string }).id;
      } catch (e) {
        console.warn('[RISKOS] Supabase risk score insert failed, using mock:', e);
      }
    }

    const mockScore: MockRiskScore = {
      id: riskScoreId,
      transaction_id: txnId,
      score: composite_score,
      severity,
      signals,
      triggered_rules,
      recommended_action,
      created_at: new Date().toISOString(),
    };
    mockDb.risk_scores.unshift(mockScore);

    // ── 7. Create Risk Case + AI Investigation (score >= 40) ──────────────
    if (composite_score >= 40) {
      const aiInvestigation = await runAIInvestigation(
        { id: txnId, amount: parsedAmount, currency, status, customer_id: customerId, device_id: deviceId, location_id: locationId, razorpay_payment_id: paymentId },
        riskResult
      );

      // ── 8. Auto-Block Rule Engine (score >= 85) ─────────────────────────
      const isAutoBlocked = composite_score >= AUTO_BLOCK_THRESHOLD;
      const caseStatus = isAutoBlocked ? 'blocked' : 'new';

      if (isRealSupabase) {
        try {
          const { data: caseData } = await supabase
            .from('risk_cases')
            .insert({ transaction_id: txnId, risk_score_id: riskScoreId, status: caseStatus })
            .select()
            .single();

          if (caseData) {
            caseId = (caseData as { id: string }).id;
            await supabase.from('audit_logs').insert({
              case_id: caseId,
              actor: 'system_agent',
              action: 'AUTOMATED_CASE_CREATED',
              metadata: { initial_score: composite_score, severity, triggered_rules, recommended_action, ai_investigation: aiInvestigation },
            });

            if (isAutoBlocked) {
              await supabase.from('audit_logs').insert({
                case_id: caseId,
                actor: 'system_agent',
                action: 'AUTO_BLOCKED_HIGH_RISK',
                metadata: { score: composite_score, threshold: AUTO_BLOCK_THRESHOLD, reason: 'Composite score exceeded auto-block threshold' },
              });
            }
          }
        } catch (e) {
          console.warn('[RISKOS] Supabase case insert failed, using mock:', e);
        }
      }

      const mockCase: MockRiskCase = {
        id: caseId,
        transaction_id: txnId,
        risk_score_id: riskScoreId,
        status: caseStatus,
        created_at: new Date().toISOString(),
        transactions: mockTxn,
        risk_scores: mockScore,
      };
      mockDb.risk_cases.unshift(mockCase);

      // Audit: case created
      mockDb.audit_logs.unshift({
        id: `audit_${Date.now()}`,
        case_id: caseId,
        actor: 'system_agent',
        action: 'AUTOMATED_CASE_CREATED',
        metadata: { initial_score: composite_score, severity, triggered_rules, recommended_action, ai_investigation: aiInvestigation },
        created_at: new Date().toISOString(),
      } as MockAuditLog);

      // ── 9. Auto-block audit + auto-refund ──────────────────────────────
      if (isAutoBlocked) {
        mockDb.audit_logs.unshift({
          id: `audit_autoblock_${Date.now()}`,
          case_id: caseId,
          actor: 'system_agent',
          action: 'AUTO_BLOCKED_HIGH_RISK',
          metadata: {
            score: composite_score,
            threshold: AUTO_BLOCK_THRESHOLD,
            reason: `Composite risk score ${composite_score} exceeded auto-block threshold of ${AUTO_BLOCK_THRESHOLD}`,
            triggered_rules,
          },
          created_at: new Date().toISOString(),
        } as MockAuditLog);

        // Attempt auto-refund via Razorpay API
        if (status === 'captured' || status === 'authorized') {
          const refundResult = await refundPayment(paymentId, parsedAmount, 'auto_blocked_high_risk');
          mockDb.audit_logs.unshift({
            id: `audit_refund_${Date.now()}`,
            case_id: caseId,
            actor: 'system_agent',
            action: refundResult.success ? 'AUTO_REFUND_ISSUED' : 'AUTO_REFUND_FAILED',
            metadata: {
              payment_id: paymentId,
              refund_id: refundResult.refund_id,
              amount: parsedAmount,
              simulated: refundResult.simulated ?? true,
              error: refundResult.error,
            },
            created_at: new Date().toISOString(),
          } as MockAuditLog);
        }
      }
    }

    return NextResponse.json({
      status: 'ok',
      success: true,
      risk_score: composite_score,
      severity,
      case_created: composite_score >= 40,
      auto_blocked: composite_score >= AUTO_BLOCK_THRESHOLD,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Webhook processing failed';
    console.error('[RISKOS] Webhook error:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

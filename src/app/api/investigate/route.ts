import { NextRequest, NextResponse } from 'next/server';
import { runAIInvestigation } from '@/lib/ai-investigation';
import { runRiskEngine } from '@/lib/risk-engine';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Run risk engine first to get signals for the AI
    const riskResult = runRiskEngine({
      id: body.id || 'unknown',
      amount: body.amount || 0,
      currency: body.currency || 'INR',
      status: body.status || 'unknown',
      customer_id: body.customer_id || 'anonymous',
      device_id: body.device_id || 'unknown',
      location_id: body.location_id || 'unknown',
    });

    const result = await runAIInvestigation(body, riskResult);
    return NextResponse.json({ ...result, risk_signals: riskResult.signals });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to run investigation';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

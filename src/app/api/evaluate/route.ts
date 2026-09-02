/**
 * GET /api/evaluate?threshold=50
 * Runs the risk engine against the labeled test dataset and returns
 * precision, recall, F1, false-positive rate, and cost metrics.
 */

import { NextRequest, NextResponse } from 'next/server';
import { runEvaluation, TEST_DATASET } from '@/lib/evaluation';

export async function GET(req: NextRequest) {
  try {
    const threshold = Number(req.nextUrl.searchParams.get('threshold') || '50');

    if (isNaN(threshold) || threshold < 0 || threshold > 100) {
      return NextResponse.json({ error: 'threshold must be 0–100' }, { status: 400 });
    }

    const { metrics, predictions } = runEvaluation(threshold);

    return NextResponse.json({
      dataset_size:   TEST_DATASET.length,
      fraud_cases:    TEST_DATASET.filter(p => p.actual_label === 'fraud').length,
      legit_cases:    TEST_DATASET.filter(p => p.actual_label === 'legitimate').length,
      metrics,
      predictions,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Evaluation failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

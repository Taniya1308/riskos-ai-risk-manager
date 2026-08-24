/**
 * GET /api/razorpay/payment?id=pay_xxx
 * Fetches live payment details from Razorpay API (or simulates them in demo mode).
 */

import { NextRequest, NextResponse } from 'next/server';
import { fetchPaymentDetails } from '@/lib/razorpay-client';

export async function GET(req: NextRequest) {
  const paymentId = req.nextUrl.searchParams.get('id');

  if (!paymentId) {
    return NextResponse.json({ error: 'Payment ID is required' }, { status: 400 });
  }

  const result = await fetchPaymentDetails(paymentId);

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json({
    payment: result.payment,
    simulated: result.simulated ?? false,
  });
}

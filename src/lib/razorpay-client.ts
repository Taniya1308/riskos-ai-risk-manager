/**
 * RISKOS Razorpay API Client
 * Wraps Razorpay back-actions: fetch payment details, issue refunds, capture payments.
 * All methods return a typed result — never throw, so callers can always handle gracefully.
 */

export interface RazorpayPaymentDetails {
  id: string;
  amount: number;
  currency: string;
  status: string;
  order_id?: string;
  customer_id?: string;
  email?: string;
  contact?: string;
  method?: string;
  bank?: string;
  wallet?: string;
  vpa?: string;
  created_at?: number;
  notes?: Record<string, string>;
  error_code?: string;
  error_description?: string;
}

export interface RazorpayRefundResult {
  success: boolean;
  refund_id?: string;
  amount?: number;
  status?: string;
  error?: string;
  simulated?: boolean;
}

export interface RazorpayActionResult {
  success: boolean;
  data?: Record<string, unknown>;
  error?: string;
  simulated?: boolean;
}

const isRealRazorpay =
  process.env.RAZORPAY_KEY_ID &&
  !process.env.RAZORPAY_KEY_ID.includes('your_') &&
  process.env.RAZORPAY_KEY_SECRET &&
  !process.env.RAZORPAY_KEY_SECRET.includes('your_');

// ---------------------------------------------------------------------------
// Fetch Payment Details from Razorpay
// ---------------------------------------------------------------------------
export async function fetchPaymentDetails(
  paymentId: string
): Promise<{ success: boolean; payment?: RazorpayPaymentDetails; error?: string; simulated?: boolean }> {
  if (!isRealRazorpay) {
    // Simulate a realistic payment details response
    return {
      success: true,
      simulated: true,
      payment: {
        id: paymentId,
        amount: 7500000,
        currency: 'INR',
        status: 'captured',
        method: 'card',
        bank: 'HDFC',
        created_at: Math.floor(Date.now() / 1000),
        notes: {},
      },
    };
  }

  try {
    const Razorpay = (await import('razorpay')).default;
    const rzp = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID!,
      key_secret: process.env.RAZORPAY_KEY_SECRET!,
    });
    const payment = await rzp.payments.fetch(paymentId);
    return { success: true, payment: payment as unknown as RazorpayPaymentDetails };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch payment';
    return { success: false, error: msg };
  }
}

// ---------------------------------------------------------------------------
// Refund a Payment (called when analyst blocks a case)
// ---------------------------------------------------------------------------
export async function refundPayment(
  paymentId: string,
  amount: number, // in rupees — converted to paise internally
  reason: string = 'fraud_detected'
): Promise<RazorpayRefundResult> {
  if (!isRealRazorpay) {
    // Simulate refund for demo
    return {
      success: true,
      simulated: true,
      refund_id: `rfnd_sim_${Date.now().toString().slice(-8)}`,
      amount: amount,
      status: 'processed',
    };
  }

  try {
    const Razorpay = (await import('razorpay')).default;
    const rzp = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID!,
      key_secret: process.env.RAZORPAY_KEY_SECRET!,
    });

    const refund = await rzp.payments.refund(paymentId, {
      amount: Math.round(amount * 100), // rupees → paise
      notes: {
        reason,
        initiated_by: 'RISKOS_AI_RISK_MANAGER',
        timestamp: new Date().toISOString(),
      },
    });

    return {
      success: true,
      refund_id: (refund as unknown as { id: string }).id,
      amount,
      status: (refund as unknown as { status: string }).status,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Refund failed';
    return { success: false, error: msg };
  }
}

export const razorpayEnabled = !!isRealRazorpay;

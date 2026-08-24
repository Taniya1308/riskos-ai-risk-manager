import crypto from 'crypto';

const WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET || 'test_secret';
const ENDPOINT_URL = process.env.WEBHOOK_URL || 'http://localhost:3000/api/webhooks/razorpay';

async function sendTestWebhook() {
  const payload = {
    event: 'payment.authorized',
    payload: {
      payment: {
        entity: {
          id: `pay_${Date.now().toString().slice(-8)}`,
          customer_id: 'cust_judge_demo_01',
          amount: 8500000, // ₹85,000 in paise
          currency: 'INR',
          status: 'captured',
          notes: {
            device_id: 'dev_unrecognized_fingerprint_007',
            location_id: 'IN_DELHI_VPN_PROXY',
          },
        },
      },
    },
  };

  const rawBody = JSON.stringify(payload);
  const signature = crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(rawBody)
    .digest('hex');

  console.log(`Sending webhook to: ${ENDPOINT_URL}`);
  console.log(`Payment ID: ${payload.payload.payment.entity.id}`);
  console.log(`Amount: ₹${payload.payload.payment.entity.amount / 100}`);

  try {
    const res = await fetch(ENDPOINT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-razorpay-signature': signature,
      },
      body: rawBody,
    });

    const data = await res.json();
    console.log('Webhook Response:', data);
  } catch (err) {
    console.error('Error sending webhook:', err.message);
  }
}

sendTestWebhook();

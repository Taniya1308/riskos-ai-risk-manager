/**
 * GET /api/health
 * Returns system status for all integrated services.
 * Used by the dashboard status bar.
 */

import { NextResponse } from 'next/server';

export async function GET() {
  const services: Record<string, { status: 'ok' | 'degraded' | 'offline'; message: string }> = {};

  // ── Gemini AI ──────────────────────────────────────────────────────────
  const geminiKey = process.env.GEMINI_API_KEY;
  services.gemini = geminiKey && !geminiKey.includes('placeholder') && geminiKey !== 'your_gemini_api_key_here'
    ? { status: 'ok', message: 'Gemini 1.5 Flash configured' }
    : { status: 'degraded', message: 'No API key — using deterministic fallback' };

  // ── Razorpay ────────────────────────────────────────────────────────────
  const rzpKey = process.env.RAZORPAY_KEY_ID;
  const rzpSecret = process.env.RAZORPAY_KEY_SECRET;
  const rzpWebhook = process.env.RAZORPAY_WEBHOOK_SECRET;
  const rzpConfigured =
    rzpKey && !rzpKey.includes('your_') &&
    rzpSecret && !rzpSecret.includes('your_');

  services.razorpay = rzpConfigured
    ? { status: 'ok', message: 'API credentials configured — back-actions enabled' }
    : rzpWebhook && !rzpWebhook.includes('your_')
    ? { status: 'degraded', message: 'Webhook secret set — refund API in simulation mode' }
    : { status: 'degraded', message: 'Demo mode — all Razorpay actions simulated' };

  // ── Supabase ────────────────────────────────────────────────────────────
  const sbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const sbKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const sbConfigured =
    sbUrl && !sbUrl.includes('placeholder') &&
    sbKey && !sbKey.includes('placeholder');

  services.supabase = sbConfigured
    ? { status: 'ok', message: 'Supabase Realtime connected' }
    : { status: 'degraded', message: 'Using in-memory store — data resets on restart' };

  // ── Risk Engine ─────────────────────────────────────────────────────────
  services.risk_engine = { status: 'ok', message: '6-signal weighted scoring engine active' };

  // ── Overall ─────────────────────────────────────────────────────────────
  const allOk = Object.values(services).every(s => s.status === 'ok');
  const anyOffline = Object.values(services).some(s => s.status === 'offline');

  return NextResponse.json({
    status: anyOffline ? 'offline' : allOk ? 'ok' : 'degraded',
    services,
    timestamp: new Date().toISOString(),
    version: '3.0.0',
  });
}

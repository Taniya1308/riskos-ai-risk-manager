/**
 * POST /api/chat
 * AI analyst chat endpoint — lets human analysts ask questions about a specific risk case.
 * Powered by Gemini 1.5 Flash with full case context injected as system prompt.
 * Falls back to rule-based responses when no API key is present.
 */

import { NextRequest, NextResponse } from 'next/server';
import { mockDb } from '@/lib/mock-store';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatRequest {
  caseId: string;
  messages: ChatMessage[];
}

// ---------------------------------------------------------------------------
// Build rich context string for a case
// ---------------------------------------------------------------------------
function buildCaseContext(caseId: string): string {
  const riskCase = mockDb.risk_cases.find((c) => c.id === caseId);
  if (!riskCase) return 'No case data available.';

  const txn = riskCase.transactions;
  const score = riskCase.risk_scores;
  const auditLogs = mockDb.audit_logs
    .filter((l) => l.case_id === caseId)
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  const aiLog = auditLogs.find((l) => l.metadata?.ai_investigation);
  const aiInvestigation = aiLog?.metadata?.ai_investigation as Record<string, unknown> | undefined;

  const signalsSummary = score?.signals
    ? score.signals
        .map(
          (s: { label: string; score: number; reason: string }) =>
            `  • ${s.label}: ${s.score}/100 — ${s.reason}`
        )
        .join('\n')
    : '  No detailed signals available';

  const auditSummary = auditLogs
    .map((l) => `  [${new Date(l.created_at).toLocaleTimeString()}] ${l.actor}: ${l.action}`)
    .join('\n');

  return `
=== RISK CASE: ${caseId} ===

TRANSACTION:
  • Razorpay Payment ID: ${txn?.razorpay_payment_id || 'N/A'}
  • Amount: ₹${txn?.amount?.toLocaleString('en-IN') || '?'} ${txn?.currency || 'INR'}
  • Status: ${txn?.status || 'unknown'}
  • Customer ID: ${txn?.customer_id || 'anonymous'}
  • Device ID: ${txn?.device_id || 'unknown'}
  • Location: ${txn?.location_id || 'unknown'}
  • Timestamp: ${txn?.created_at || 'unknown'}

RISK ASSESSMENT:
  • Composite Score: ${score?.score ?? '?'}/100
  • Severity: ${score?.severity?.toUpperCase() || '?'}
  • Triggered Rules: ${score?.triggered_rules?.join(', ') || 'none'}
  • System Recommendation: ${score?.recommended_action || 'unknown'}

RISK SIGNALS:
${signalsSummary}

AI INVESTIGATION:
  • Summary: ${(aiInvestigation?.explanation_summary as string) || 'Not yet generated'}
  • Recommended Action: ${(aiInvestigation?.recommended_action as string) || 'N/A'}
  • AI Powered: ${aiInvestigation?.ai_powered ? 'Yes (Gemini)' : 'No (deterministic fallback)'}
  • Key Factors: ${
    Array.isArray(aiInvestigation?.key_risk_factors)
      ? (aiInvestigation.key_risk_factors as string[]).map((f: string) => `\n    - ${f}`).join('')
      : 'N/A'
  }

AUDIT TRAIL:
${auditSummary || '  No audit entries yet'}

CURRENT CASE STATUS: ${riskCase.status || 'new'}
`.trim();
}

// ---------------------------------------------------------------------------
// Gemini Chat
// ---------------------------------------------------------------------------
async function callGeminiChat(
  caseContext: string,
  messages: ChatMessage[]
): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.includes('placeholder') || apiKey === '') return null;

  try {
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      systemInstruction: `You are RISKOS AI — an expert payment fraud analyst assistant embedded in the RISKOS Risk Operations Command Center.

You have full access to the case data below. Answer analyst questions accurately, concisely, and in plain English.
Be direct and actionable. If asked for a recommendation, give one. Reference specific numbers and signals from the case.
Never say you don't have enough information — the case context below has everything you need.
Keep responses under 150 words unless the analyst explicitly asks for a detailed breakdown.

## CASE CONTEXT
${caseContext}`,
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 512,
      },
    });

    // Build chat history (all but last message)
    const history = messages.slice(0, -1).map((m) => ({
      role: m.role === 'assistant' ? ('model' as const) : ('user' as const),
      parts: [{ text: m.content }],
    }));

    const chat = model.startChat({ history });
    const lastMessage = messages[messages.length - 1];
    const result = await chat.sendMessage(lastMessage.content);
    return result.response.text();
  } catch (err) {
    console.error('[RISKOS Chat] Gemini error:', err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Deterministic fallback chat
// ---------------------------------------------------------------------------
function deterministicChat(caseId: string, userMessage: string): string {
  const riskCase = mockDb.risk_cases.find((c) => c.id === caseId);
  const score = riskCase?.risk_scores;
  const txn = riskCase?.transactions;
  const msg = userMessage.toLowerCase();

  if (msg.includes('score') || msg.includes('risk')) {
    return `The composite risk score for this case is **${score?.score ?? '?'}/100** (${score?.severity?.toUpperCase() || 'unknown'}). This was computed across 6 signals: Amount Deviation, Payment Status, Device Integrity, Geo/IP Variance, Velocity, and Currency. The top triggered rules were: ${score?.triggered_rules?.join(', ') || 'none'}.`;
  }

  if (msg.includes('device') || msg.includes('fingerprint')) {
    return `Device ID: \`${txn?.device_id || 'unknown'}\`. ${
      txn?.device_id?.toLowerCase().includes('proxy') || txn?.device_id?.toLowerCase().includes('unknown')
        ? 'This device ID shows suspicious characteristics — either unidentified or matching known proxy/fraud tooling patterns. Device Integrity scored high-risk.'
        : 'This device appears to be a recognized fingerprint with no obvious fraud indicators.'
    }`;
  }

  if (msg.includes('location') || msg.includes('geo') || msg.includes('ip')) {
    return `Transaction origin: **${txn?.location_id || 'unknown'}**. ${
      txn?.location_id?.includes('VPN') || txn?.location_id?.includes('TOR')
        ? 'This location is flagged as high-risk — VPN or Tor anonymization detected. Geo/IP signal is elevated.'
        : 'No geo/IP anomalies detected for this location.'
    }`;
  }

  if (msg.includes('amount') || msg.includes('₹') || msg.includes('rupee')) {
    return `Transaction amount: **₹${txn?.amount?.toLocaleString('en-IN') || '?'} ${txn?.currency || 'INR'}**. ${
      (txn?.amount || 0) > 50000
        ? 'This exceeds the ₹50,000 alert threshold and contributed significantly to the risk score.'
        : 'This amount is within the normal merchant baseline.'
    }`;
  }

  if (msg.includes('recommend') || msg.includes('action') || msg.includes('should')) {
    const rec = score?.recommended_action || 'REVIEW';
    const explanations: Record<string, string> = {
      BLOCK: 'The system recommends **BLOCK** — multiple critical signals (device + geo + amount) make this transaction highly likely to be fraudulent.',
      HOLD: 'The system recommends **HOLD** — one or more elevated signals require analyst verification before processing.',
      REVIEW: 'The system recommends **REVIEW** — moderate risk signals present, needs a quick analyst check.',
      APPROVE: 'The system recommends **APPROVE** — no critical signals detected, transaction appears legitimate.',
    };
    return explanations[rec] || `Recommended action: ${rec}`;
  }

  if (msg.includes('customer') || msg.includes('cust')) {
    return `Customer ID: **${txn?.customer_id || 'anonymous'}**. ${
      txn?.customer_id?.includes('anonymous')
        ? 'Anonymous customer — no transaction history available to establish behavioral baseline.'
        : 'Known customer ID on record. No historical fraud flags in current session data.'
    }`;
  }

  if (msg.includes('approve') || msg.includes('block') || msg.includes('escalate')) {
    return `To take an action on this case, use the action buttons at the bottom of the investigation panel — **Approve**, **Hold/Block**, or **Escalate**. Each action is permanently recorded in the immutable audit trail.`;
  }

  return `I'm analyzing case ${caseId.slice(0, 8)} (score: ${score?.score ?? '?'}/100, ${score?.severity || 'unknown'} severity). Ask me about the risk score, device fingerprint, transaction amount, location, customer profile, or what action to take.`;
}

// ---------------------------------------------------------------------------
// Route Handler
// ---------------------------------------------------------------------------
export async function POST(req: NextRequest) {
  try {
    const body: ChatRequest = await req.json();
    const { caseId, messages } = body;

    if (!caseId || !messages || messages.length === 0) {
      return NextResponse.json(
        { error: 'caseId and messages are required' },
        { status: 400 }
      );
    }

    const caseContext = buildCaseContext(caseId);

    // Try Gemini first
    const geminiResponse = await callGeminiChat(caseContext, messages);
    if (geminiResponse) {
      return NextResponse.json({ reply: geminiResponse, ai_powered: true });
    }

    // Fallback
    const lastUserMessage = messages[messages.length - 1]?.content || '';
    const fallbackResponse = deterministicChat(caseId, lastUserMessage);
    return NextResponse.json({ reply: fallbackResponse, ai_powered: false });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Chat failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

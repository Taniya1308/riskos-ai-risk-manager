/**
 * RISKOS AI Investigation Engine — Powered by Google Gemini
 *
 * This module calls the Gemini API to produce:
 *   1. A natural-language explanation of why a transaction is suspicious
 *   2. A structured recommended action
 *   3. Key risk factors as bullet points (for XAI display)
 *
 * Falls back to deterministic analysis when no API key is configured.
 */

import { RiskEngineResult } from './risk-engine';

export interface TransactionDetails {
  id?: string;
  amount: number;
  currency?: string;
  status: string;
  customer_id?: string;
  device_id?: string;
  location_id?: string;
  razorpay_payment_id?: string;
  [key: string]: unknown;
}

export interface AIInvestigationResult {
  explanation_summary: string;
  recommended_action: 'APPROVE' | 'REVIEW' | 'HOLD' | 'BLOCK' | 'ESCALATE';
  key_risk_factors: string[];
  confidence: 'low' | 'medium' | 'high';
  ai_powered: boolean; // true = real Gemini call, false = deterministic fallback
}

// ---------------------------------------------------------------------------
// Gemini-Powered Investigation
// ---------------------------------------------------------------------------

async function callGemini(
  txn: TransactionDetails,
  riskResult: RiskEngineResult
): Promise<AIInvestigationResult | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.includes('placeholder') || apiKey === '') return null;

  try {
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.2,
      },
    });

    const signalSummary = riskResult.signals
      .map(s => `  - ${s.label}: score=${s.score}/100, reason="${s.reason}"`)
      .join('\n');

    const prompt = `You are RISKOS, an expert AI fraud analyst for a Razorpay payment risk management system.

Analyze this payment transaction and provide a structured risk assessment.

## Transaction Details
- Payment ID: ${txn.razorpay_payment_id || txn.id || 'unknown'}
- Amount: ₹${txn.amount?.toLocaleString('en-IN')} ${txn.currency || 'INR'}
- Status: ${txn.status}
- Customer: ${txn.customer_id || 'anonymous'}
- Device ID: ${txn.device_id || 'unknown'}
- Location: ${txn.location_id || 'unknown'}

## Risk Engine Signals (pre-computed)
- Composite Risk Score: ${riskResult.composite_score}/100 (${riskResult.severity.toUpperCase()})
- Triggered Rules: ${riskResult.triggered_rules.join(', ') || 'none'}
${signalSummary}

## Your Task
Return a JSON object with EXACTLY this structure (no markdown, raw JSON only):
{
  "explanation_summary": "2-3 sentence plain English explanation of why this transaction is suspicious, referencing specific signals",
  "recommended_action": "APPROVE" | "REVIEW" | "HOLD" | "BLOCK",
  "key_risk_factors": ["factor 1", "factor 2", "factor 3"],
  "confidence": "low" | "medium" | "high"
}

Rules:
- APPROVE if composite score < 40 and no hard flags
- REVIEW if composite score 40-64
- HOLD if composite score 65-84
- BLOCK if composite score >= 85 OR Tor exit node detected
- Be specific and reference actual transaction values in the explanation
- key_risk_factors should be 2-4 concise bullets (no more than 12 words each)`;

    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();

    let parsed: {
      explanation_summary: string;
      recommended_action: 'APPROVE' | 'REVIEW' | 'HOLD' | 'BLOCK';
      key_risk_factors: string[];
      confidence: 'low' | 'medium' | 'high';
    };

    // Gemini sometimes wraps in ```json ... ```
    const jsonMatch = text.match(/```json\s*([\s\S]*?)```/) || text.match(/```\s*([\s\S]*?)```/);
    const jsonText = jsonMatch ? jsonMatch[1] : text;
    parsed = JSON.parse(jsonText);

    return {
      ...parsed,
      ai_powered: true,
    };
  } catch (err) {
    console.error('[RISKOS] Gemini API call failed, falling back to deterministic:', err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Deterministic Fallback
// ---------------------------------------------------------------------------

function deterministicInvestigation(
  txn: TransactionDetails,
  riskResult: RiskEngineResult
): AIInvestigationResult {
  const { composite_score, severity, signals, recommended_action } = riskResult;

  const topSignals = [...signals]
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .filter(s => s.score >= 30);

  const key_risk_factors = topSignals.map(s => s.reason);
  if (key_risk_factors.length === 0) {
    key_risk_factors.push(`Transaction scored ${composite_score}/100 — within acceptable range`);
  }

  let explanation_summary: string;

  if (composite_score >= 80) {
    explanation_summary = `This transaction exhibits multiple critical fraud indicators with a composite risk score of ${composite_score}/100. ` +
      `Primary concerns: ${topSignals[0]?.reason || 'high-risk pattern detected'}. ` +
      `Immediate manual review is strongly recommended before processing.`;
  } else if (composite_score >= 60) {
    explanation_summary = `Risk evaluation returned a score of ${composite_score}/100 (${severity}). ` +
      `The transaction shows elevated signals including ${topSignals[0]?.reason?.toLowerCase() || 'suspicious activity'}. ` +
      `A hold and secondary verification is recommended.`;
  } else if (composite_score >= 40) {
    explanation_summary = `Moderate risk detected at ${composite_score}/100. ` +
      `${topSignals[0]?.reason || 'Some signals require attention'} — analyst review suggested before approval.`;
  } else {
    explanation_summary = `Transaction scored ${composite_score}/100 — within normal risk parameters. ` +
      `No critical fraud signals detected. Standard processing recommended.`;
  }

  // Map engine recommendation to investigation recommendation
  const actionMap: Record<string, AIInvestigationResult['recommended_action']> = {
    APPROVE: 'APPROVE',
    REVIEW: 'REVIEW',
    HOLD: 'HOLD',
    BLOCK: 'BLOCK',
  };

  return {
    explanation_summary,
    recommended_action: actionMap[recommended_action] ?? 'REVIEW',
    key_risk_factors,
    confidence: composite_score >= 70 ? 'high' : composite_score >= 40 ? 'medium' : 'low',
    ai_powered: false,
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function runAIInvestigation(
  txn: TransactionDetails,
  riskResult: RiskEngineResult
): Promise<AIInvestigationResult> {
  // First, try Gemini
  const geminiResult = await callGemini(txn, riskResult);
  if (geminiResult) return geminiResult;

  // Fallback to deterministic
  return deterministicInvestigation(txn, riskResult);
}

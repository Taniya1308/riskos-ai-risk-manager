/**
 * RISKOS Multi-Signal Risk Scoring Engine
 * Evaluates transactions across 6 independent risk dimensions,
 * computes a weighted composite score, and returns a full signal breakdown.
 */

export interface TransactionInput {
  id: string;
  amount: number; // in INR (rupees, not paise)
  currency: string;
  status: string;
  customer_id: string;
  device_id: string;
  location_id: string;
  razorpay_payment_id?: string;
}

export interface RiskSignal {
  label: string;
  score: number;      // 0–100
  weight: number;     // percentage contribution to final score
  reason: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface RiskEngineResult {
  composite_score: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  signals: RiskSignal[];
  triggered_rules: string[];
  recommended_action: 'APPROVE' | 'REVIEW' | 'HOLD' | 'BLOCK';
}

// ---------------------------------------------------------------------------
// High-Risk Reference Sets
// ---------------------------------------------------------------------------

const HIGH_RISK_LOCATIONS = new Set([
  'IN_MUMBAI_VPN', 'IN_MUMBAI_HIGH_RISK_TOR', 'IN_DELHI_VPN',
  'TOR_EXIT_NODE', 'PROXY_ANONYMOUS', 'VPN_DETECTED',
  'IN_MUMBAI_HIGH_RISK_TOR', 'UNKNOWN_GEO', 'FOREIGN_IP_MISMATCH',
]);

const SUSPICIOUS_DEVICE_PATTERNS = [
  'proxy', 'anomaly', 'unknown', 'fingerprint_hop', 'emulator', 'rooted',
  'tor', 'vpn', 'spoofed',
];

const HIGH_RISK_CURRENCIES = new Set(['USD', 'EUR', 'GBP']); // foreign currency from INR merchant

// ---------------------------------------------------------------------------
// Signal Evaluators
// ---------------------------------------------------------------------------

function scoreAmountDeviation(amount: number): RiskSignal {
  let score = 0;
  let reason = '';

  if (amount >= 200000) {
    score = 95; reason = `Extreme amount ₹${amount.toLocaleString('en-IN')} — far exceeds all typical merchant thresholds`;
  } else if (amount >= 100000) {
    score = 80; reason = `Very high transaction amount ₹${amount.toLocaleString('en-IN')} (>₹1L)`;
  } else if (amount >= 50000) {
    score = 60; reason = `High amount ₹${amount.toLocaleString('en-IN')} exceeds standard ₹50K alert threshold`;
  } else if (amount >= 25000) {
    score = 35; reason = `Moderate-high amount ₹${amount.toLocaleString('en-IN')}`;
  } else if (amount >= 10000) {
    score = 15; reason = `Standard transaction amount ₹${amount.toLocaleString('en-IN')}`;
  } else {
    score = 5; reason = `Low-value transaction ₹${amount.toLocaleString('en-IN')} — within normal range`;
  }

  return {
    label: 'Amount Deviation',
    score,
    weight: 30,
    reason,
    severity: score >= 80 ? 'critical' : score >= 60 ? 'high' : score >= 35 ? 'medium' : 'low',
  };
}

function scorePaymentStatus(status: string, eventType?: string): RiskSignal {
  let score = 0;
  let reason = '';

  if (status === 'failed' || eventType === 'payment.failed') {
    score = 85; reason = 'Payment explicitly failed — high fraud signal';
  } else if (status === 'refunded') {
    score = 50; reason = 'Refunded transaction — potential chargeback pattern';
  } else if (status === 'created') {
    score = 30; reason = 'Payment created but not yet authorized — pending verification';
  } else if (status === 'captured' || status === 'authorized') {
    score = 10; reason = 'Payment successfully authorized/captured';
  } else {
    score = 25; reason = `Unrecognized status "${status}" — requires manual review`;
  }

  return {
    label: 'Payment Status',
    score,
    weight: 25,
    reason,
    severity: score >= 80 ? 'critical' : score >= 50 ? 'high' : score >= 30 ? 'medium' : 'low',
  };
}

function scoreDeviceIntegrity(device_id: string): RiskSignal {
  if (!device_id || device_id === 'device_unknown' || device_id === 'unknown') {
    return {
      label: 'Device Integrity',
      score: 70,
      weight: 20,
      reason: 'No device fingerprint — payment originated from unidentified device',
      severity: 'high',
    };
  }

  const lower = device_id.toLowerCase();
  const matchedPattern = SUSPICIOUS_DEVICE_PATTERNS.find(p => lower.includes(p));

  if (matchedPattern) {
    return {
      label: 'Device Integrity',
      score: 85,
      weight: 20,
      reason: `Device ID contains suspicious pattern "${matchedPattern}" — potential fraud tooling`,
      severity: 'critical',
    };
  }

  // Check for rapid device ID cycling (numeric suffix variation)
  const hasLargeNumericSuffix = /\d{6,}/.test(device_id);
  if (hasLargeNumericSuffix) {
    return {
      label: 'Device Integrity',
      score: 45,
      weight: 20,
      reason: 'Device ID format suggests automated/scripted generation',
      severity: 'medium',
    };
  }

  return {
    label: 'Device Integrity',
    score: 10,
    weight: 20,
    reason: `Recognized device fingerprint "${device_id.substring(0, 12)}…" — consistent with legitimate user`,
    severity: 'low',
  };
}

function scoreGeoIpRisk(location_id: string): RiskSignal {
  if (!location_id || location_id === 'unknown') {
    return {
      label: 'Geo / IP Variance',
      score: 65,
      weight: 15,
      reason: 'Location data missing — cannot verify payment origin',
      severity: 'high',
    };
  }

  if (HIGH_RISK_LOCATIONS.has(location_id)) {
    const isTor = location_id.includes('TOR') || location_id.includes('tor');
    return {
      label: 'Geo / IP Variance',
      score: isTor ? 95 : 80,
      weight: 15,
      reason: isTor
        ? `Tor exit node detected (${location_id}) — strong anonymity evasion signal`
        : `High-risk location (${location_id}) — VPN/proxy usage detected`,
      severity: 'critical',
    };
  }

  const lower = location_id.toLowerCase();
  if (lower.includes('vpn') || lower.includes('proxy') || lower.includes('tor')) {
    return {
      label: 'Geo / IP Variance',
      score: 75,
      weight: 15,
      reason: `Anonymization detected in location "${location_id}"`,
      severity: 'high',
    };
  }

  return {
    label: 'Geo / IP Variance',
    score: 10,
    weight: 15,
    reason: `Location "${location_id}" — no elevated risk indicators`,
    severity: 'low',
  };
}

function scoreVelocityRisk(customer_id: string, amount: number): RiskSignal {
  // Import velocity analysis from mock-store (real per-customer time-window tracking)
  let velocityScore = 15;
  let velocityReason = `Customer "${(customer_id || 'unknown').substring(0, 12)}" has normal transaction velocity`;

  try {
    // Dynamic require to avoid circular — only runs server-side
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { analyzeVelocity } = require('./mock-store');
    const analysis = analyzeVelocity(customer_id, amount);
    velocityScore = analysis.velocity_score;
    velocityReason = analysis.reason;
  } catch {
    // Fallback if mock-store not available
    const isAnonymous = !customer_id || customer_id.includes('anonymous') || customer_id.includes('anon');
    if (isAnonymous) {
      velocityScore = 60;
      velocityReason = 'Anonymous customer — no transaction history to establish baseline';
    }
  }

  return {
    label: 'Velocity & Frequency',
    score: velocityScore,
    weight: 5,
    reason: velocityReason,
    severity: velocityScore >= 80 ? 'critical' : velocityScore >= 60 ? 'high' : velocityScore >= 40 ? 'medium' : 'low',
  };
}

function scoreCurrencyRisk(currency: string): RiskSignal {
  if (HIGH_RISK_CURRENCIES.has(currency)) {
    return {
      label: 'Currency Mismatch',
      score: 50,
      weight: 5,
      reason: `Foreign currency (${currency}) on an INR-native merchant — potential cross-border fraud`,
      severity: 'medium',
    };
  }

  return {
    label: 'Currency Mismatch',
    score: 5,
    weight: 5,
    reason: `Currency ${currency} — expected denomination for this merchant`,
    severity: 'low',
  };
}

// ---------------------------------------------------------------------------
// Composite Scoring & Rule Engine
// ---------------------------------------------------------------------------

function computeComposite(signals: RiskSignal[]): number {
  const total = signals.reduce((sum, s) => sum + (s.score * s.weight) / 100, 0);
  return Math.min(Math.round(total), 100);
}

function deriveSeverity(score: number): 'low' | 'medium' | 'high' | 'critical' {
  if (score >= 80) return 'critical';
  if (score >= 60) return 'high';
  if (score >= 40) return 'medium';
  return 'low';
}

function deriveAction(
  score: number,
  severity: string,
  signals: RiskSignal[]
): 'APPROVE' | 'REVIEW' | 'HOLD' | 'BLOCK' {
  // Hard block on Tor/extreme conditions
  const hasTor = signals.some(s => s.reason.toLowerCase().includes('tor'));
  const hasExtreme = signals.some(s => s.score >= 95);
  if (hasTor || (hasExtreme && score >= 85)) return 'BLOCK';

  if (score >= 65) return 'HOLD';
  if (score >= 40) return 'REVIEW';
  return 'APPROVE';
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function runRiskEngine(txn: TransactionInput, eventType?: string): RiskEngineResult {
  const signals: RiskSignal[] = [
    scoreAmountDeviation(txn.amount),
    scorePaymentStatus(txn.status, eventType),
    scoreDeviceIntegrity(txn.device_id),
    scoreGeoIpRisk(txn.location_id),
    scoreVelocityRisk(txn.customer_id, txn.amount),
    scoreCurrencyRisk(txn.currency),
  ];

  const composite_score = computeComposite(signals);
  const severity = deriveSeverity(composite_score);
  const recommended_action = deriveAction(composite_score, severity, signals);

  const triggered_rules: string[] = [];
  if (txn.amount > 50000) triggered_rules.push('RULE_HIGH_AMOUNT');
  if (txn.status === 'failed') triggered_rules.push('RULE_PAYMENT_FAILED');
  if (signals.find(s => s.label === 'Device Integrity')!.score >= 70) triggered_rules.push('RULE_SUSPICIOUS_DEVICE');
  if (signals.find(s => s.label === 'Geo / IP Variance')!.score >= 70) triggered_rules.push('RULE_HIGH_RISK_GEO');
  if (composite_score >= 80) triggered_rules.push('RULE_COMPOSITE_CRITICAL');

  return { composite_score, severity, signals, triggered_rules, recommended_action };
}

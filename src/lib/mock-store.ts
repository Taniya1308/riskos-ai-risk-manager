// In-memory mock store for demo/development when Supabase credentials are not provided.
// Persists across Next.js hot-reloads via global singleton.

export interface MockTransaction {
  id: string;
  razorpay_payment_id: string;
  customer_id: string;
  amount: number;
  currency: string;
  status: string;
  device_id: string;
  location_id: string;
  created_at: string;
}

export interface MockRiskScore {
  id: string;
  transaction_id: string;
  score: number;
  severity: string;
  signals?: Array<{
    label: string;
    score: number;
    weight: number;
    reason: string;
    severity: string;
  }>;
  triggered_rules?: string[];
  recommended_action?: string;
  created_at: string;
}

export interface MockRiskCase {
  id: string;
  transaction_id: string;
  risk_score_id: string;
  status: string;
  created_at: string;
  transactions?: MockTransaction;
  risk_scores?: MockRiskScore;
}

export interface MockAuditLog {
  id: string;
  case_id: string;
  actor: string;
  action: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

// Velocity tracking: per-customer transaction history within time windows
export interface VelocityRecord {
  customer_id: string;
  timestamps: number[]; // epoch ms of each transaction
  total_amount: number;
  transaction_count: number;
}

declare global {
  // eslint-disable-next-line no-var
  var __MOCK_DATABASE__:
    | {
        transactions: MockTransaction[];
        risk_scores: MockRiskScore[];
        risk_cases: MockRiskCase[];
        audit_logs: MockAuditLog[];
        velocity: Map<string, VelocityRecord>;
      }
    | undefined;
}

// ---------------------------------------------------------------------------
// Real Velocity Tracking
// ---------------------------------------------------------------------------

/** Record a new transaction for velocity analysis */
export function recordVelocity(customer_id: string, amount: number): void {
  if (!global.__MOCK_DATABASE__) return;
  const now = Date.now();
  const existing = global.__MOCK_DATABASE__.velocity.get(customer_id);
  if (existing) {
    existing.timestamps.push(now);
    existing.total_amount += amount;
    existing.transaction_count += 1;
    // Keep only last 24h
    const cutoff = now - 24 * 60 * 60 * 1000;
    existing.timestamps = existing.timestamps.filter(t => t > cutoff);
  } else {
    global.__MOCK_DATABASE__.velocity.set(customer_id, {
      customer_id,
      timestamps: [now],
      total_amount: amount,
      transaction_count: 1,
    });
  }
}

export interface VelocityAnalysis {
  txn_count_1h: number;   // transactions in last 1 hour
  txn_count_24h: number;  // transactions in last 24 hours
  total_amount_24h: number;
  is_high_velocity: boolean;
  velocity_score: number; // 0-100
  reason: string;
}

/** Analyze velocity risk for a customer */
export function analyzeVelocity(customer_id: string, current_amount: number): VelocityAnalysis {
  const isAnonymous = !customer_id ||
    customer_id.includes('anonymous') ||
    customer_id.includes('anon') ||
    customer_id.includes('guest');

  if (isAnonymous) {
    return {
      txn_count_1h: 0,
      txn_count_24h: 0,
      total_amount_24h: current_amount,
      is_high_velocity: false,
      velocity_score: 60,
      reason: 'Anonymous customer — no transaction history to establish baseline velocity',
    };
  }

  const record = global.__MOCK_DATABASE__?.velocity.get(customer_id);
  if (!record) {
    return {
      txn_count_1h: 0,
      txn_count_24h: 0,
      total_amount_24h: current_amount,
      is_high_velocity: false,
      velocity_score: 10,
      reason: `First transaction for customer "${customer_id.substring(0, 12)}" — no prior velocity data`,
    };
  }

  const now = Date.now();
  const oneHourAgo = now - 60 * 60 * 1000;
  const txn_count_1h = record.timestamps.filter(t => t > oneHourAgo).length;
  const txn_count_24h = record.timestamps.length;
  const total_amount_24h = record.total_amount;

  let velocity_score = 10;
  let is_high_velocity = false;
  let reason = '';

  if (txn_count_1h >= 5) {
    velocity_score = 90;
    is_high_velocity = true;
    reason = `${txn_count_1h} transactions in the last hour — extreme velocity, likely automated`;
  } else if (txn_count_1h >= 3) {
    velocity_score = 70;
    is_high_velocity = true;
    reason = `${txn_count_1h} transactions in 1 hour — elevated frequency exceeds normal user behavior`;
  } else if (total_amount_24h > 500000) {
    velocity_score = 65;
    is_high_velocity = true;
    reason = `Total spend ₹${total_amount_24h.toLocaleString('en-IN')} in 24h — exceeds daily threshold`;
  } else if (txn_count_24h >= 3) {
    velocity_score = 40;
    reason = `${txn_count_24h} transactions today — slightly elevated, monitor closely`;
  } else {
    velocity_score = 10;
    reason = `Normal velocity: ${txn_count_24h} transaction(s) in 24h`;
  }

  return { txn_count_1h, txn_count_24h, total_amount_24h, is_high_velocity, velocity_score, reason };
}

function getInitialData() {
  const txn1: MockTransaction = {
    id: 'txn_demo_01',
    razorpay_payment_id: 'pay_N8kL39sD2qA1',
    customer_id: 'cust_sarah_992',
    amount: 72000,
    currency: 'INR',
    status: 'captured',
    device_id: 'dev_unknown_proxy_91',
    location_id: 'IN_MUMBAI_VPN',
    created_at: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
  };

  const score1: MockRiskScore = {
    id: 'score_demo_01',
    transaction_id: txn1.id,
    score: 88,
    severity: 'critical',
    signals: [
      { label: 'Amount Deviation', score: 80, weight: 30, reason: 'High amount ₹72,000 exceeds standard ₹50K alert threshold', severity: 'high' },
      { label: 'Payment Status', score: 10, weight: 25, reason: 'Payment successfully authorized/captured', severity: 'low' },
      { label: 'Device Integrity', score: 85, weight: 20, reason: 'Device ID contains suspicious pattern "proxy" — potential fraud tooling', severity: 'critical' },
      { label: 'Geo / IP Variance', score: 80, weight: 15, reason: 'High-risk location (IN_MUMBAI_VPN) — VPN/proxy usage detected', severity: 'critical' },
      { label: 'Velocity & Frequency', score: 15, weight: 5, reason: 'Customer "cust_sarah_9" has normal transaction velocity', severity: 'low' },
      { label: 'Currency Mismatch', score: 5, weight: 5, reason: 'Currency INR — expected denomination for this merchant', severity: 'low' },
    ],
    triggered_rules: ['RULE_HIGH_AMOUNT', 'RULE_SUSPICIOUS_DEVICE', 'RULE_HIGH_RISK_GEO', 'RULE_COMPOSITE_CRITICAL'],
    recommended_action: 'BLOCK',
    created_at: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
  };

  const case1: MockRiskCase = {
    id: 'case_demo_01',
    transaction_id: txn1.id,
    risk_score_id: score1.id,
    status: 'new',
    created_at: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
    transactions: txn1,
    risk_scores: score1,
  };

  const audit1: MockAuditLog = {
    id: 'audit_demo_01',
    case_id: case1.id,
    actor: 'system_agent',
    action: 'AUTOMATED_CASE_CREATED',
    metadata: {
      initial_score: 88,
      ai_investigation: {
        explanation_summary:
          'This transaction exhibits multiple critical fraud indicators with a composite risk score of 88/100. Primary concern: Device ID contains a "proxy" pattern suggesting fraud tooling, combined with VPN-masked location from Mumbai. Immediate manual review is strongly recommended before processing.',
        recommended_action: 'BLOCK',
        key_risk_factors: [
          'Device fingerprint matches known proxy/fraud tooling pattern',
          'VPN-masked IP origin from high-risk Mumbai zone',
          'Transaction amount ₹72,000 exceeds ₹50K alert threshold',
        ],
        confidence: 'high',
        ai_powered: false,
      },
    },
    created_at: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
  };

  const txn2: MockTransaction = {
    id: 'txn_demo_02',
    razorpay_payment_id: 'pay_P4mX81vW9zB3',
    customer_id: 'cust_rahul_104',
    amount: 54000,
    currency: 'INR',
    status: 'captured',
    device_id: 'device_unknown',
    location_id: 'IN_BANGALORE',
    created_at: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
  };

  const score2: MockRiskScore = {
    id: 'score_demo_02',
    transaction_id: txn2.id,
    score: 62,
    severity: 'high',
    signals: [
      { label: 'Amount Deviation', score: 60, weight: 30, reason: 'High amount ₹54,000 exceeds standard ₹50K alert threshold', severity: 'high' },
      { label: 'Payment Status', score: 10, weight: 25, reason: 'Payment successfully authorized/captured', severity: 'low' },
      { label: 'Device Integrity', score: 70, weight: 20, reason: 'No device fingerprint — payment originated from unidentified device', severity: 'high' },
      { label: 'Geo / IP Variance', score: 10, weight: 15, reason: 'Location "IN_BANGALORE" — no elevated risk indicators', severity: 'low' },
      { label: 'Velocity & Frequency', score: 15, weight: 5, reason: 'Customer "cust_rahul_1" has normal transaction velocity', severity: 'low' },
      { label: 'Currency Mismatch', score: 5, weight: 5, reason: 'Currency INR — expected denomination for this merchant', severity: 'low' },
    ],
    triggered_rules: ['RULE_HIGH_AMOUNT', 'RULE_SUSPICIOUS_DEVICE'],
    recommended_action: 'HOLD',
    created_at: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
  };

  const case2: MockRiskCase = {
    id: 'case_demo_02',
    transaction_id: txn2.id,
    risk_score_id: score2.id,
    status: 'new',
    created_at: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
    transactions: txn2,
    risk_scores: score2,
  };

  const audit2: MockAuditLog = {
    id: 'audit_demo_02',
    case_id: case2.id,
    actor: 'system_agent',
    action: 'AUTOMATED_CASE_CREATED',
    metadata: {
      initial_score: 62,
      ai_investigation: {
        explanation_summary:
          'Risk evaluation returned a score of 62/100 (high). The transaction of ₹54,000 exceeds the alert threshold, and the payment originated from an unidentified device with no prior fingerprint record. A hold and secondary verification is recommended.',
        recommended_action: 'HOLD',
        key_risk_factors: [
          'No device fingerprint — unidentified payment source',
          'Amount ₹54,000 crosses ₹50K threshold',
          'First-time transaction from this customer profile',
        ],
        confidence: 'medium',
        ai_powered: false,
      },
    },
    created_at: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
  };

  const txn3: MockTransaction = {
    id: 'txn_demo_03',
    razorpay_payment_id: 'pay_Q7rY52wT6cC8',
    customer_id: 'cust_priya_256',
    amount: 8500,
    currency: 'INR',
    status: 'captured',
    device_id: 'dev_chrome_mobile_ios17',
    location_id: 'IN_CHENNAI',
    created_at: new Date(Date.now() - 1000 * 60 * 58).toISOString(),
  };

  const score3: MockRiskScore = {
    id: 'score_demo_03',
    transaction_id: txn3.id,
    score: 18,
    severity: 'low',
    signals: [
      { label: 'Amount Deviation', score: 15, weight: 30, reason: 'Standard transaction amount ₹8,500', severity: 'low' },
      { label: 'Payment Status', score: 10, weight: 25, reason: 'Payment successfully authorized/captured', severity: 'low' },
      { label: 'Device Integrity', score: 10, weight: 20, reason: 'Recognized device fingerprint — consistent with legitimate user', severity: 'low' },
      { label: 'Geo / IP Variance', score: 10, weight: 15, reason: 'Location "IN_CHENNAI" — no elevated risk indicators', severity: 'low' },
      { label: 'Velocity & Frequency', score: 15, weight: 5, reason: 'Customer "cust_priya_2" has normal transaction velocity', severity: 'low' },
      { label: 'Currency Mismatch', score: 5, weight: 5, reason: 'Currency INR — expected denomination for this merchant', severity: 'low' },
    ],
    triggered_rules: [],
    recommended_action: 'APPROVE',
    created_at: new Date(Date.now() - 1000 * 60 * 58).toISOString(),
  };

  const case3: MockRiskCase = {
    id: 'case_demo_03',
    transaction_id: txn3.id,
    risk_score_id: score3.id,
    status: 'approved',
    created_at: new Date(Date.now() - 1000 * 60 * 58).toISOString(),
    transactions: txn3,
    risk_scores: score3,
  };

  const audit3: MockAuditLog = {
    id: 'audit_demo_03',
    case_id: case3.id,
    actor: 'system_agent',
    action: 'AUTOMATED_CASE_CREATED',
    metadata: {
      initial_score: 18,
      ai_investigation: {
        explanation_summary:
          'Transaction scored 18/100 — within normal risk parameters. Recognized device, standard Chennai location, and ₹8,500 amount all within expected merchant baseline. Standard processing recommended.',
        recommended_action: 'APPROVE',
        key_risk_factors: ['No critical signals detected across all 6 risk dimensions'],
        confidence: 'high',
        ai_powered: false,
      },
    },
    created_at: new Date(Date.now() - 1000 * 60 * 58).toISOString(),
  };

  const audit3b: MockAuditLog = {
    id: 'audit_demo_03b',
    case_id: case3.id,
    actor: 'Analyst_Current',
    action: 'DECISION_APPROVED',
    metadata: { timestamp: new Date(Date.now() - 1000 * 60 * 55).toISOString() },
    created_at: new Date(Date.now() - 1000 * 60 * 55).toISOString(),
  };

  return {
    transactions: [txn1, txn2, txn3],
    risk_scores: [score1, score2, score3],
    risk_cases: [case1, case2, case3],
    audit_logs: [audit1, audit2, audit3, audit3b],
  };
}

if (!global.__MOCK_DATABASE__) {
  global.__MOCK_DATABASE__ = {
    ...getInitialData(),
    velocity: new Map<string, VelocityRecord>(),
  };
}

export const mockDb = global.__MOCK_DATABASE__!;

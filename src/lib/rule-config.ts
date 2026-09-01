/**
 * RISKOS Rule Engine Configuration Store
 * Persists risk thresholds and signal weights across hot-reloads.
 * In production this would be stored in DB/Redis.
 */

export interface RuleConfig {
  auto_block_threshold: number;    // score ≥ this → auto-block (default 85)
  case_creation_threshold: number; // score ≥ this → create case (default 40)
  signal_weights: {
    amount_deviation: number;   // % weight (default 30)
    payment_status: number;     // % weight (default 25)
    device_integrity: number;   // % weight (default 20)
    geo_ip_variance: number;    // % weight (default 15)
    velocity_frequency: number; // % weight (default 5)
    currency_mismatch: number;  // % weight (default 5)
  };
  amount_thresholds: {
    low: number;     // below this = low risk (default 10000)
    medium: number;  // below this = medium risk (default 25000)
    high: number;    // below this = high risk (default 50000)
    critical: number;// above this = critical (default 100000)
  };
  notifications: {
    email_on_critical: boolean;
    email_on_auto_block: boolean;
    slack_webhook_url: string;
  };
  updated_at: string;
  updated_by: string;
}

export interface AlertRule {
  id: string;
  name: string;
  condition: 'score_above' | 'amount_above' | 'severity_is' | 'location_is';
  value: string | number;
  action: 'notify' | 'auto_block' | 'escalate';
  enabled: boolean;
  created_at: string;
}

declare global {
  // eslint-disable-next-line no-var
  var __RISKOS_CONFIG__: {
    rules: RuleConfig;
    alert_rules: AlertRule[];
  } | undefined;
}

const DEFAULT_CONFIG: RuleConfig = {
  auto_block_threshold: 85,
  case_creation_threshold: 40,
  signal_weights: {
    amount_deviation: 30,
    payment_status: 25,
    device_integrity: 20,
    geo_ip_variance: 15,
    velocity_frequency: 5,
    currency_mismatch: 5,
  },
  amount_thresholds: {
    low: 10000,
    medium: 25000,
    high: 50000,
    critical: 100000,
  },
  notifications: {
    email_on_critical: false,
    email_on_auto_block: true,
    slack_webhook_url: '',
  },
  updated_at: new Date().toISOString(),
  updated_by: 'system',
};

const DEFAULT_ALERT_RULES: AlertRule[] = [
  { id: 'alert_1', name: 'Critical Score Alert',    condition: 'score_above',    value: 80,       action: 'notify',     enabled: true,  created_at: new Date().toISOString() },
  { id: 'alert_2', name: 'High Amount Alert',       condition: 'amount_above',   value: 50000,    action: 'notify',     enabled: true,  created_at: new Date().toISOString() },
  { id: 'alert_3', name: 'Auto-Block Extreme Risk', condition: 'score_above',    value: 90,       action: 'auto_block', enabled: true,  created_at: new Date().toISOString() },
  { id: 'alert_4', name: 'Escalate VPN Traffic',   condition: 'location_is',    value: 'VPN',    action: 'escalate',   enabled: false, created_at: new Date().toISOString() },
];

if (!global.__RISKOS_CONFIG__) {
  global.__RISKOS_CONFIG__ = {
    rules: DEFAULT_CONFIG,
    alert_rules: DEFAULT_ALERT_RULES,
  };
}

export const ruleConfig = global.__RISKOS_CONFIG__!;

export function getRuleConfig(): RuleConfig {
  return ruleConfig.rules;
}

export function updateRuleConfig(updates: Partial<RuleConfig>, updatedBy = 'analyst'): RuleConfig {
  ruleConfig.rules = {
    ...ruleConfig.rules,
    ...updates,
    signal_weights: { ...ruleConfig.rules.signal_weights, ...(updates.signal_weights || {}) },
    amount_thresholds: { ...ruleConfig.rules.amount_thresholds, ...(updates.amount_thresholds || {}) },
    notifications: { ...ruleConfig.rules.notifications, ...(updates.notifications || {}) },
    updated_at: new Date().toISOString(),
    updated_by: updatedBy,
  };
  return ruleConfig.rules;
}

export function getAlertRules(): AlertRule[] {
  return ruleConfig.alert_rules;
}

export function updateAlertRule(id: string, updates: Partial<AlertRule>): AlertRule | null {
  const idx = ruleConfig.alert_rules.findIndex(r => r.id === id);
  if (idx === -1) return null;
  ruleConfig.alert_rules[idx] = { ...ruleConfig.alert_rules[idx], ...updates };
  return ruleConfig.alert_rules[idx];
}

export function addAlertRule(rule: Omit<AlertRule, 'id' | 'created_at'>): AlertRule {
  const newRule: AlertRule = {
    ...rule,
    id: `alert_${Date.now()}`,
    created_at: new Date().toISOString(),
  };
  ruleConfig.alert_rules.push(newRule);
  return newRule;
}

export function deleteAlertRule(id: string): boolean {
  const idx = ruleConfig.alert_rules.findIndex(r => r.id === id);
  if (idx === -1) return false;
  ruleConfig.alert_rules.splice(idx, 1);
  return true;
}

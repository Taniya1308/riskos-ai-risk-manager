'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Settings, Save, RefreshCw, Plus, Trash2, ToggleLeft,
  ToggleRight, AlertTriangle, CheckCircle, Zap, Shield,
  Info, Bell,
} from 'lucide-react';

interface RuleConfig {
  auto_block_threshold: number;
  case_creation_threshold: number;
  signal_weights: Record<string, number>;
  amount_thresholds: Record<string, number>;
  notifications: {
    email_on_critical: boolean;
    email_on_auto_block: boolean;
    slack_webhook_url: string;
  };
  updated_at: string;
  updated_by: string;
}

interface AlertRule {
  id: string;
  name: string;
  condition: string;
  value: string | number;
  action: string;
  enabled: boolean;
  created_at: string;
}

function Tooltip({ text }: { text: string }) {
  return (
    <div className="group relative inline-flex">
      <Info className="h-3.5 w-3.5 text-slate-600 cursor-help" />
      <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover:block w-48 rounded-lg border border-white/[0.1] bg-slate-800 px-3 py-2 text-[11px] text-slate-300 z-20 shadow-xl pointer-events-none">
        {text}
      </div>
    </div>
  );
}

function SliderInput({ label, value, min, max, step = 1, onChange, tooltip, unit = '' }:
  { label: string; value: number; min: number; max: number; step?: number; onChange: (v: number) => void; tooltip?: string; unit?: string }) {

  const fmt = (n: number) => {
    if (unit === '₹') {
      if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
      if (n >= 1000)   return `₹${(n / 1000).toFixed(0)}K`;
      return `₹${n}`;
    }
    return `${n}${unit}`;
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <label className="text-xs font-semibold text-slate-300">{label}</label>
          {tooltip && <Tooltip text={tooltip} />}
        </div>
        <span className="text-sm font-black text-indigo-400">{fmt(value)}</span>
      </div>
      <input
        type="range"
        min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full h-2 rounded-full appearance-none cursor-pointer accent-indigo-500"
        style={{ background: `linear-gradient(to right, rgb(99 102 241) 0%, rgb(99 102 241) ${((value - min) / (max - min)) * 100}%, rgba(255,255,255,0.08) ${((value - min) / (max - min)) * 100}%, rgba(255,255,255,0.08) 100%)` }}
      />
      <div className="flex justify-between text-[10px] text-slate-600">
        <span>{fmt(min)}</span><span>{fmt(max)}</span>
      </div>
    </div>
  );
}

export default function RulesPage() {
  const [config, setConfig]     = useState<RuleConfig | null>(null);
  const [alerts, setAlerts]     = useState<AlertRule[]>([]);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [saved, setSaved]       = useState(false);
  const [saveAttempted, setSaveAttempted] = useState(false);
  const [newRule, setNewRule]   = useState({ name: '', condition: 'score_above', value: '70', action: 'notify' });
  const [showNewRule, setShowNewRule] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/rules');
      const d   = await res.json();
      setConfig(d.config);
      setAlerts(d.alert_rules);
    } catch {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function saveConfig() {
    if (!config) return;
    setSaveAttempted(true);
    const totalWeight = Object.values(config.signal_weights).reduce((a, b) => a + b, 0);
    if (totalWeight !== 100 || config.auto_block_threshold <= config.case_creation_threshold) return;
    setSaving(true);
    try {
      await fetch('/api/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_config', config, updated_by: 'Analyst_Current' }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {}
    finally { setSaving(false); }
  }

  async function toggleAlert(id: string, enabled: boolean) {
    await fetch('/api/rules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update_alert', id, updates: { enabled } }),
    });
    setAlerts(p => p.map(a => a.id === id ? { ...a, enabled } : a));
  }

  async function deleteAlert(id: string) {
    await fetch('/api/rules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete_alert', id }),
    });
    setAlerts(p => p.filter(a => a.id !== id));
  }

  async function addAlert() {
    if (!newRule.name.trim()) return;
    const res = await fetch('/api/rules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'add_alert', rule: { ...newRule, value: isNaN(Number(newRule.value)) ? newRule.value : Number(newRule.value) } }),
    });
    const d = await res.json();
    if (d.rule) {
      setAlerts(p => [...p, d.rule]);
      setNewRule({ name: '', condition: 'score_above', value: '70', action: 'notify' });
      setShowNewRule(false);
    }
  }

  function updateWeight(key: string, val: number) {
    if (!config) return;
    setConfig({ ...config, signal_weights: { ...config.signal_weights, [key]: val } });
  }

  const totalWeight = config ? Object.values(config.signal_weights).reduce((a, b) => a + b, 0) : 0;

  if (loading) return (
    <div className="flex items-center justify-center gap-3 min-h-screen">
      <div className="h-6 w-6 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
      <span className="text-slate-500">Loading rule configuration…</span>
    </div>
  );

  if (!config) return <p className="text-center text-slate-500 py-20">Failed to load config</p>;

  return (
    <div className="min-h-screen text-slate-100">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-black font-mono text-white">Risk Rules</h1>
            <p className="text-sm text-slate-500 mt-1">
              Configure thresholds, signal weights, and alert rules
            </p>
          </div>
          <div className="flex items-center gap-3">
            {config.updated_at && (
              <p className="text-[11px] text-slate-600 hidden sm:block">
                Last saved {new Date(config.updated_at).toLocaleTimeString()}
              </p>
            )}
            <button onClick={saveConfig} disabled={saving}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                saved
                  ? 'bg-emerald-600 text-white'
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/25'
              } disabled:opacity-50`}>
              {saving ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : saved ? <CheckCircle className="h-3.5 w-3.5" /> : <Save className="h-3.5 w-3.5" />}
              {saved ? 'Saved!' : 'Save Changes'}
            </button>
          </div>
        </div>

        {/* Core Thresholds */}
        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-6 backdrop-blur-sm space-y-6">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="h-4 w-4 text-red-400" />
            <p className="text-sm font-bold text-slate-200">Core Risk Thresholds</p>
          </div>

          <SliderInput
            label="Auto-Block Threshold"
            value={config.auto_block_threshold}
            min={50} max={100}
            onChange={v => setConfig({ ...config, auto_block_threshold: v })}
            tooltip="Payments scoring above this are automatically blocked and refunded without analyst review"
          />

          <SliderInput
            label="Case Creation Threshold"
            value={config.case_creation_threshold}
            min={10} max={80}
            onChange={v => setConfig({ ...config, case_creation_threshold: v })}
            tooltip="Payments scoring above this create a case in the queue for analyst review"
          />

          {config.auto_block_threshold <= config.case_creation_threshold && saveAttempted && (
            <div className="flex items-center gap-2 p-3 rounded-xl border border-amber-500/30 bg-amber-500/10 text-xs text-amber-400">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              Auto-block threshold must be higher than case creation threshold
            </div>
          )}
        </div>

        {/* Signal Weights */}
        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-6 backdrop-blur-sm space-y-5">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-violet-400" />
              <p className="text-sm font-bold text-slate-200">Signal Weights</p>
              <Tooltip text="Each signal contributes to the composite risk score by its weight percentage. Total should equal 100%." />
            </div>
            <span className={`text-sm font-black ${totalWeight === 100 ? 'text-emerald-400' : 'text-amber-400'}`}>
              Total: {totalWeight}%
            </span>
          </div>

          {[
            { key: 'amount_deviation',   label: 'Transaction Amount',   tooltip: 'How much weight to give high-value transaction amounts' },
            { key: 'payment_status',     label: 'Payment Status',       tooltip: 'Weight for failed or suspicious payment statuses' },
            { key: 'device_integrity',   label: 'Device Fingerprint',   tooltip: 'Weight for unknown or suspicious device signatures' },
            { key: 'geo_ip_variance',    label: 'Location / IP Risk',   tooltip: 'Weight for VPN, Tor, and high-risk locations' },
            { key: 'velocity_frequency', label: 'Transaction Velocity', tooltip: 'Weight for high-frequency transactions from same customer' },
            { key: 'currency_mismatch',  label: 'Currency Mismatch',    tooltip: 'Weight for foreign currency on an INR merchant' },
          ].map(({ key, label, tooltip }) => (
            <SliderInput
              key={key}
              label={label}
              value={config.signal_weights[key] || 0}
              min={0} max={60} unit="%"
              onChange={v => updateWeight(key, v)}
              tooltip={tooltip}
            />
          ))}

          {totalWeight !== 100 && saveAttempted && (
            <div className="flex items-center gap-2 p-3 rounded-xl border border-amber-500/30 bg-amber-500/10 text-xs text-amber-400">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              Weights must add up to 100%. Currently at {totalWeight}%.
            </div>
          )}
        </div>

        {/* Amount Thresholds */}
        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-6 backdrop-blur-sm space-y-5">
          <div className="flex items-center gap-2 mb-2">
            <Settings className="h-4 w-4 text-blue-400" />
            <p className="text-sm font-bold text-slate-200">Amount Risk Thresholds (₹)</p>
          </div>
          {[
            { key: 'low',      label: 'Low Risk Threshold',      max: 50000,   tooltip: 'Transactions below this are considered low-risk by amount' },
            { key: 'medium',   label: 'Medium Risk Threshold',   max: 100000,  tooltip: 'Transactions above this get elevated amount risk score' },
            { key: 'high',     label: 'High Risk Threshold',     max: 500000,  tooltip: 'Transactions above this get high amount risk score' },
            { key: 'critical', label: 'Critical Risk Threshold', max: 2000000, tooltip: 'Transactions above this get maximum amount risk score' },
          ].map(({ key, label, max, tooltip }) => (
            <SliderInput
              key={key}
              label={label}
              value={config.amount_thresholds[key] || 0}
              min={0} max={max} step={1000}
              onChange={v => setConfig({ ...config, amount_thresholds: { ...config.amount_thresholds, [key]: v } })}
              tooltip={tooltip}
              unit="₹"
            />
          ))}
        </div>

        {/* Alert Rules */}
        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-6 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-amber-400" />
              <p className="text-sm font-bold text-slate-200">Alert Rules</p>
              <span className="text-[11px] text-slate-600">{alerts.length} rules</span>
            </div>
            <button onClick={() => setShowNewRule(!showNewRule)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-indigo-500/30 bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 text-xs font-bold transition">
              <Plus className="h-3.5 w-3.5" />
              Add Rule
            </button>
          </div>

          {/* New rule form */}
          {showNewRule && (
            <div className="mb-4 p-4 rounded-xl border border-indigo-500/20 bg-indigo-500/[0.04] space-y-3">
              <p className="text-xs font-bold text-slate-300">New Alert Rule</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <input
                  placeholder="Rule name"
                  value={newRule.name}
                  onChange={e => setNewRule({ ...newRule, name: e.target.value })}
                  className="col-span-2 sm:col-span-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
                <select value={newRule.condition} onChange={e => setNewRule({ ...newRule, condition: e.target.value })}
                  className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500">
                  <option value="score_above">Score above</option>
                  <option value="amount_above">Amount above</option>
                  <option value="severity_is">Severity is</option>
                  <option value="location_is">Location contains</option>
                </select>
                <input
                  placeholder="Value (e.g. 70)"
                  value={newRule.value}
                  onChange={e => setNewRule({ ...newRule, value: e.target.value })}
                  className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
                <select value={newRule.action} onChange={e => setNewRule({ ...newRule, action: e.target.value })}
                  className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500">
                  <option value="notify">Notify analyst</option>
                  <option value="auto_block">Auto block</option>
                  <option value="escalate">Escalate</option>
                </select>
              </div>
              <div className="flex gap-2">
                <button onClick={addAlert}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition">
                  Add Rule
                </button>
                <button onClick={() => setShowNewRule(false)}
                  className="px-4 py-2 rounded-xl border border-white/[0.08] bg-white/[0.03] text-slate-400 hover:text-white text-xs font-semibold transition">
                  Cancel
                </button>
              </div>
            </div>
          )}

          <div className="space-y-2">
            {alerts.map(rule => (
              <div key={rule.id} className={`flex items-center gap-3 p-4 rounded-xl border transition ${
                rule.enabled ? 'border-white/[0.07] bg-white/[0.02]' : 'border-white/[0.04] bg-white/[0.01] opacity-60'
              }`}>
                <button onClick={() => toggleAlert(rule.id, !rule.enabled)}
                  className="flex-shrink-0 text-slate-400 hover:text-white transition">
                  {rule.enabled
                    ? <ToggleRight className="h-5 w-5 text-indigo-400" />
                    : <ToggleLeft className="h-5 w-5" />}
                </button>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-slate-200">{rule.name}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    When <span className="text-slate-400">{rule.condition.replace(/_/g, ' ')}</span>{' '}
                    <span className="text-slate-300 font-semibold">{rule.value}</span>{' '}
                    → <span className={`font-bold ${rule.action === 'auto_block' ? 'text-red-400' : rule.action === 'escalate' ? 'text-purple-400' : 'text-amber-400'}`}>
                      {rule.action.replace(/_/g, ' ')}
                    </span>
                  </p>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border flex-shrink-0 ${
                  rule.action === 'auto_block' ? 'bg-red-500/10 text-red-400 border-red-500/25' :
                  rule.action === 'escalate'   ? 'bg-purple-500/10 text-purple-400 border-purple-500/25' :
                  'bg-amber-500/10 text-amber-400 border-amber-500/25'
                }`}>
                  {rule.action.replace(/_/g, ' ')}
                </span>
                <button onClick={() => deleteAlert(rule.id)}
                  className="flex-shrink-0 p-1.5 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}

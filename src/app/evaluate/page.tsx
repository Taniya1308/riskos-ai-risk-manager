'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Target, CheckCircle, XCircle, AlertTriangle, RefreshCw,
  TrendingUp, DollarSign, BarChart3, Info,
} from 'lucide-react';

interface Metrics {
  total: number;
  true_positives: number;
  false_positives: number;
  true_negatives: number;
  false_negatives: number;
  precision: number;
  recall: number;
  f1_score: number;
  false_positive_rate: number;
  false_negative_cost: number;
  false_positive_cost: number;
  threshold_used: number;
}

interface Prediction {
  payment_id: string;
  actual: 'fraud' | 'legitimate';
  predicted: 'fraud' | 'legitimate';
  risk_score: number;
  correct: boolean;
}

interface EvalData {
  dataset_size: number;
  fraud_cases: number;
  legit_cases: number;
  metrics: Metrics;
  predictions: Prediction[];
}

function MetricCard({ label, value, sub, color, icon: Icon, tooltip }: {
  label: string; value: string | number; sub: string;
  color: string; icon: React.ElementType; tooltip?: string;
}) {
  return (
    <div className={`rounded-2xl border p-5 space-y-2 backdrop-blur-sm ${color}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <p className="text-[11px] text-slate-400 font-medium uppercase tracking-wide">{label}</p>
          {tooltip && (
            <div className="group relative">
              <Info className="h-3 w-3 text-slate-600 cursor-help" />
              <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover:block w-52 rounded-lg border border-white/[0.1] bg-slate-800 px-3 py-2 text-[11px] text-slate-300 z-20 shadow-xl pointer-events-none">
                {tooltip}
              </div>
            </div>
          )}
        </div>
        <Icon className="h-4 w-4 text-slate-500" />
      </div>
      <p className="text-3xl font-black text-white">{value}</p>
      <p className="text-[11px] text-slate-500">{sub}</p>
    </div>
  );
}

function pct(n: number) { return `${Math.round(n * 100)}%`; }
function fmt(n: number) {
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000)   return `₹${(n / 1000).toFixed(0)}K`;
  return `₹${n}`;
}

export default function EvaluatePage() {
  const [data, setData]       = useState<EvalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [threshold, setThreshold] = useState(50);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/evaluate?threshold=${threshold}`);
      setData(await res.json());
    } catch {}
    finally { setLoading(false); }
  }, [threshold]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const m = data?.metrics;

  return (
    <div className="min-h-screen text-slate-100">
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute top-0 right-1/3 w-[500px] h-[400px] bg-indigo-600/[0.04] rounded-full blur-3xl" />
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-black font-mono text-white">Model Evaluation</h1>
            <p className="text-sm text-slate-500 mt-1">
              Precision, recall, and cost metrics on a 20-payment held-out labeled test set
            </p>
          </div>
          <button onClick={fetchData} disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-white/[0.08] bg-white/[0.03] text-xs text-slate-400 hover:text-white hover:bg-white/[0.06] transition">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Dataset info */}
        <div className="rounded-2xl border border-indigo-500/20 bg-indigo-500/[0.04] px-5 py-4 flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-indigo-400" />
            <span className="text-sm font-semibold text-slate-200">Test Dataset</span>
          </div>
          <div className="flex items-center gap-5 text-xs text-slate-400">
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-slate-400" />{data?.dataset_size || 20} total payments</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-red-400" />{data?.fraud_cases || 10} confirmed fraud</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-400" />{data?.legit_cases || 10} confirmed legitimate</span>
            <span className="text-slate-600">· Held-out, labeled by ground truth</span>
          </div>
        </div>

        {/* Threshold slider */}
        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm font-bold text-slate-200">Detection Threshold</p>
              <p className="text-[11px] text-slate-500">Payments scoring above this are classified as fraud. Lower = more sensitive, higher = more selective.</p>
            </div>
            <span className="text-xl font-black text-indigo-400">{threshold}</span>
          </div>
          <input
            type="range" min={10} max={90} step={5} value={threshold}
            onChange={e => setThreshold(Number(e.target.value))}
            className="w-full h-2 rounded-full appearance-none cursor-pointer accent-indigo-500"
            style={{ background: `linear-gradient(to right, rgb(99 102 241) 0%, rgb(99 102 241) ${((threshold - 10) / 80) * 100}%, rgba(255,255,255,0.08) ${((threshold - 10) / 80) * 100}%, rgba(255,255,255,0.08) 100%)` }}
          />
          <div className="flex justify-between text-[10px] text-slate-600 mt-1">
            <span>10 (catch everything)</span><span>90 (catch only extreme fraud)</span>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-3 py-20">
            <div className="h-6 w-6 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
            <span className="text-slate-500">Running evaluation…</span>
          </div>
        ) : m ? (
          <>
            {/* Core metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <MetricCard
                label="Precision" value={pct(m.precision)}
                sub={`${m.true_positives} correct fraud flags`}
                color="border-indigo-500/20 bg-indigo-500/[0.05]"
                icon={Target}
                tooltip="Of all payments flagged as fraud, what % were actually fraud. High precision = fewer false alarms."
              />
              <MetricCard
                label="Recall" value={pct(m.recall)}
                sub={`${m.true_positives} of ${m.true_positives + m.false_negatives} fraud caught`}
                color="border-violet-500/20 bg-violet-500/[0.05]"
                icon={TrendingUp}
                tooltip="Of all actual fraud payments, what % did we catch. High recall = fewer missed frauds."
              />
              <MetricCard
                label="F1 Score" value={pct(m.f1_score)}
                sub="Harmonic mean of precision + recall"
                color="border-blue-500/20 bg-blue-500/[0.05]"
                icon={BarChart3}
                tooltip="Balanced score combining precision and recall. 100% = perfect on both."
              />
              <MetricCard
                label="False Positive Rate" value={pct(m.false_positive_rate)}
                sub={`${m.false_positives} legit payments blocked`}
                color={m.false_positive_rate > 0.2 ? 'border-red-500/20 bg-red-500/[0.05]' : 'border-emerald-500/20 bg-emerald-500/[0.05]'}
                icon={AlertTriangle}
                tooltip="Of all legitimate payments, what % were incorrectly blocked. Lower is better."
              />
              <MetricCard
                label="FN Cost (missed fraud)" value={fmt(m.false_negative_cost)}
                sub={`${m.false_negatives} fraud cases missed`}
                color="border-red-500/20 bg-red-500/[0.05]"
                icon={DollarSign}
                tooltip="Estimated financial cost of fraud that was not caught (full transaction amount)."
              />
              <MetricCard
                label="FP Cost (false alarms)" value={fmt(m.false_positive_cost)}
                sub={`${m.false_positives} legit txns blocked`}
                color="border-amber-500/20 bg-amber-500/[0.05]"
                icon={DollarSign}
                tooltip="Estimated cost of blocking legitimate payments (merchant friction, ₹500 per blocked transaction)."
              />
            </div>

            {/* Confusion matrix */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-6 backdrop-blur-sm">
                <p className="text-sm font-bold text-slate-200 mb-4">Confusion Matrix</p>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'True Positives', value: m.true_positives,  desc: 'Fraud correctly caught',          color: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' },
                    { label: 'False Positives', value: m.false_positives, desc: 'Legitimate incorrectly blocked', color: 'bg-red-500/10 border-red-500/20 text-red-400' },
                    { label: 'False Negatives', value: m.false_negatives, desc: 'Fraud missed',                  color: 'bg-red-500/10 border-red-500/20 text-red-400' },
                    { label: 'True Negatives', value: m.true_negatives,  desc: 'Legitimate correctly passed',    color: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' },
                  ].map(({ label, value, desc, color }) => (
                    <div key={label} className={`rounded-xl border p-4 ${color}`}>
                      <p className="text-2xl font-black">{value}</p>
                      <p className="text-xs font-semibold mt-0.5">{label}</p>
                      <p className="text-[11px] opacity-70 mt-0.5">{desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Accuracy summary */}
              <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-6 backdrop-blur-sm">
                <p className="text-sm font-bold text-slate-200 mb-4">Summary</p>
                <div className="space-y-3">
                  {[
                    { label: 'Overall Accuracy', value: pct((m.true_positives + m.true_negatives) / m.total), color: 'text-indigo-400' },
                    { label: 'Fraud Detection Rate', value: pct(m.recall), color: 'text-emerald-400' },
                    { label: 'False Alarm Rate', value: pct(m.false_positive_rate), color: m.false_positive_rate > 0.1 ? 'text-red-400' : 'text-emerald-400' },
                    { label: 'Total Cost of Errors', value: fmt(m.false_negative_cost + m.false_positive_cost), color: 'text-amber-400' },
                    { label: 'Test Threshold', value: m.threshold_used.toString(), color: 'text-slate-300' },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="flex items-center justify-between py-2 border-b border-white/[0.05] last:border-0">
                      <p className="text-xs text-slate-400">{label}</p>
                      <p className={`text-sm font-black ${color}`}>{value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Prediction table */}
            <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] overflow-hidden backdrop-blur-sm">
              <div className="px-5 py-4 border-b border-white/[0.06]">
                <p className="text-sm font-bold text-slate-200">Per-Payment Predictions</p>
                <p className="text-[11px] text-slate-500 mt-0.5">Full results on all 20 labeled test payments</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-white/[0.06] bg-white/[0.02]">
                      {['Payment ID', 'Risk Score', 'Ground Truth', 'Predicted', 'Result'].map(h => (
                        <th key={h} className="text-left px-4 py-3 text-[10px] text-slate-500 font-semibold uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {data.predictions.map(p => (
                      <tr key={p.payment_id} className={`hover:bg-white/[0.02] transition ${!p.correct ? 'bg-red-500/[0.03]' : ''}`}>
                        <td className="px-4 py-3 font-mono text-slate-400">{p.payment_id}</td>
                        <td className="px-4 py-3">
                          <span className={`font-black ${p.risk_score >= 80 ? 'text-red-400' : p.risk_score >= 60 ? 'text-orange-400' : p.risk_score >= 40 ? 'text-yellow-400' : 'text-emerald-400'}`}>
                            {p.risk_score}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${p.actual === 'fraud' ? 'bg-red-500/10 text-red-400 border-red-500/25' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25'}`}>
                            {p.actual}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${p.predicted === 'fraud' ? 'bg-red-500/10 text-red-400 border-red-500/25' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25'}`}>
                            {p.predicted}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {p.correct
                            ? <span className="flex items-center gap-1 text-emerald-400"><CheckCircle className="h-3.5 w-3.5" /> Correct</span>
                            : <span className="flex items-center gap-1 text-red-400"><XCircle className="h-3.5 w-3.5" /> {p.predicted === 'fraud' ? 'False Positive' : 'False Negative'}</span>
                          }
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Methodology note */}
            <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5 backdrop-blur-sm text-xs text-slate-500 space-y-1.5">
              <p className="text-slate-300 font-semibold text-sm mb-2">Methodology Note</p>
              <p>• Test dataset: 20 payments (10 fraud, 10 legitimate), labeled by ground truth based on known fraud signals</p>
              <p>• Fraud signals used for labeling: Tor exit nodes, VPN/proxy patterns, unknown devices, failed payments, anonymous customers, abnormally high amounts</p>
              <p>• False negative cost = full transaction amount (merchant absorbs the fraud loss)</p>
              <p>• False positive cost = ₹500 per blocked legitimate payment (estimated merchant friction and support overhead)</p>
              <p>• Threshold is configurable — use the slider above to find the optimal precision/recall tradeoff for your risk tolerance</p>
            </div>
          </>
        ) : (
          <p className="text-slate-500 text-center py-20">Failed to load evaluation data</p>
        )}
      </div>
    </div>
  );
}

/**
 * GET  /api/rules  — fetch current rule config + alert rules
 * POST /api/rules  — update rule config
 */

import { NextRequest, NextResponse } from 'next/server';
import { getRuleConfig, updateRuleConfig, getAlertRules, updateAlertRule, addAlertRule, deleteAlertRule } from '@/lib/rule-config';

export async function GET() {
  return NextResponse.json({
    config: getRuleConfig(),
    alert_rules: getAlertRules(),
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, ...data } = body;

    if (action === 'update_config') {
      const updated = updateRuleConfig(data.config, data.updated_by || 'analyst');
      return NextResponse.json({ success: true, config: updated });
    }

    if (action === 'update_alert') {
      const updated = updateAlertRule(data.id, data.updates);
      if (!updated) return NextResponse.json({ error: 'Alert rule not found' }, { status: 404 });
      return NextResponse.json({ success: true, rule: updated });
    }

    if (action === 'add_alert') {
      const newRule = addAlertRule(data.rule);
      return NextResponse.json({ success: true, rule: newRule });
    }

    if (action === 'delete_alert') {
      const ok = deleteAlertRule(data.id);
      if (!ok) return NextResponse.json({ error: 'Alert rule not found' }, { status: 404 });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to update rules';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

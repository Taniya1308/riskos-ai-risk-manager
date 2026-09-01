/**
 * GET /api/cases/export
 * Export all risk cases as CSV for reporting.
 * Supports ?status=blocked&severity=critical&from=2024-01-01 filters.
 */

import { NextRequest, NextResponse } from 'next/server';
import { mockDb } from '@/lib/mock-store';

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const statusFilter   = params.get('status');
  const severityFilter = params.get('severity');
  const fromDate       = params.get('from');
  const toDate         = params.get('to');

  let cases = [...mockDb.risk_cases];

  // Apply filters
  if (statusFilter)   cases = cases.filter(c => c.status === statusFilter);
  if (severityFilter) cases = cases.filter(c => c.risk_scores?.severity === severityFilter);
  if (fromDate)       cases = cases.filter(c => new Date(c.created_at) >= new Date(fromDate));
  if (toDate)         cases = cases.filter(c => new Date(c.created_at) <= new Date(toDate));

  // Build CSV
  const headers = [
    'Case ID',
    'Payment ID',
    'Customer ID',
    'Amount (INR)',
    'Currency',
    'Payment Status',
    'Risk Score',
    'Severity',
    'Case Status',
    'Device ID',
    'Location',
    'Triggered Rules',
    'AI Recommendation',
    'Created At',
  ];

  const rows = cases.map(c => {
    const txn = c.transactions;
    const sc  = c.risk_scores;
    return [
      c.id,
      txn?.razorpay_payment_id || '',
      txn?.customer_id || '',
      txn?.amount?.toString() || '0',
      txn?.currency || 'INR',
      txn?.status || '',
      sc?.score?.toString() || '0',
      sc?.severity || '',
      c.status || 'new',
      txn?.device_id || '',
      txn?.location_id || '',
      (sc?.triggered_rules || []).join(' | '),
      sc?.recommended_action || '',
      c.created_at,
    ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(',');
  });

  const csv = [headers.join(','), ...rows].join('\n');
  const filename = `riskos-cases-${new Date().toISOString().slice(0, 10)}.csv`;

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}

/**
 * POST /api/cases/notes
 * Add a text note to a risk case.
 *
 * GET  /api/cases/notes?caseId=xxx
 * Get all notes for a case.
 */

import { NextRequest, NextResponse } from 'next/server';
import { mockDb } from '@/lib/mock-store';

export async function GET(req: NextRequest) {
  const caseId = req.nextUrl.searchParams.get('caseId');
  if (!caseId) return NextResponse.json({ error: 'caseId required' }, { status: 400 });

  const notes = mockDb.audit_logs
    .filter(l => l.case_id === caseId && l.action === 'ANALYST_NOTE')
    .map(l => ({
      id: l.id,
      author: l.actor,
      text: (l.metadata?.note as string) || '',
      created_at: l.created_at,
    }))
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  return NextResponse.json({ notes });
}

export async function POST(req: NextRequest) {
  try {
    const { caseId, note, author } = await req.json();
    if (!caseId || !note?.trim()) {
      return NextResponse.json({ error: 'caseId and note are required' }, { status: 400 });
    }

    const noteEntry = {
      id: `note_${Date.now()}`,
      case_id: caseId,
      actor: author || 'Analyst_Current',
      action: 'ANALYST_NOTE' as const,
      metadata: { note: note.trim() },
      created_at: new Date().toISOString(),
    };

    mockDb.audit_logs.unshift(noteEntry);

    return NextResponse.json({
      success: true,
      note: {
        id: noteEntry.id,
        author: noteEntry.actor,
        text: note.trim(),
        created_at: noteEntry.created_at,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to add note';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

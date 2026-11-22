import { NextRequest, NextResponse } from 'next/server';
import { getUser, supabaseAdmin, supabaseServer } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { eventId, reason } = await req.json();
  if (!eventId || !reason?.trim()) {
    return NextResponse.json({ error: 'eventId and reason are required' }, { status: 400 });
  }

  const db = await supabaseServer();
  const { data: staffRows } = await db.from('business_staff').select('business_id, role').eq('user_id', user.id);
  if (!staffRows || staffRows.length === 0) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  // Only managers/owners can reverse
  const canReverse = staffRows.some(r => ['manager', 'owner', 'admin'].includes(r.role));
  if (!canReverse) return NextResponse.json({ error: 'Only managers can reverse transactions' }, { status: 403 });

  const admin = supabaseAdmin();

  const { data, error } = await admin.rpc('manager_reverse_transaction', {
    p_event_id: eventId,
    p_manager_id: user.id,
    p_reason: reason.trim(),
  });

  if (error) {
    console.error('manager_reverse_transaction error:', error);
    return NextResponse.json({ error: error.message || 'Failed to reverse transaction' }, { status: 500 });
  }

  return NextResponse.json(data);
}

import { NextRequest, NextResponse } from 'next/server';
import { getUser, supabaseAdmin, supabaseServer } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { passToken, branchId, idempotencyKey } = await req.json();
  if (!passToken || !idempotencyKey) {
    return NextResponse.json({ error: 'passToken and idempotencyKey are required' }, { status: 400 });
  }

  const db = await supabaseServer();
  const { data: staffRows } = await db.from('business_staff').select('business_id, role').eq('user_id', user.id);
  if (!staffRows || staffRows.length === 0) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const admin = supabaseAdmin();

  const { data: membership } = await admin
    .from('memberships')
    .select('id, business_id, rewards_available')
    .eq('pass_token', passToken)
    .single();

  if (!membership) return NextResponse.json({ error: 'Card not found' }, { status: 404 });
  if (!staffRows.some(r => r.business_id === membership.business_id)) {
    return NextResponse.json({ error: 'Forbidden: wrong business' }, { status: 403 });
  }
  if (membership.rewards_available < 1) {
    return NextResponse.json({ error: 'No rewards available to redeem' }, { status: 400 });
  }

  const { data, error } = await admin.rpc('cashier_redeem_reward', {
    p_membership_id: membership.id,
    p_cashier_id: user.id,
    p_branch_id: branchId || null,
    p_idempotency_key: idempotencyKey,
  });

  if (error) {
    console.error('cashier_redeem_reward error:', error);
    return NextResponse.json({ error: error.message || 'Failed to redeem reward' }, { status: 500 });
  }

  return NextResponse.json(data);
}

import { NextRequest, NextResponse } from 'next/server';
import { getUser, supabaseAdmin, supabaseServer } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { passToken, coffeeCount = 1, branchId, idempotencyKey } = await req.json();
  if (!passToken || !idempotencyKey) {
    return NextResponse.json({ error: 'passToken and idempotencyKey are required' }, { status: 400 });
  }
  if (coffeeCount < 1 || coffeeCount > 20) {
    return NextResponse.json({ error: 'coffeeCount must be between 1 and 20' }, { status: 400 });
  }

  const db = await supabaseServer();
  const { data: staffRows } = await db.from('business_staff').select('business_id, role').eq('user_id', user.id);
  if (!staffRows || staffRows.length === 0) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const admin = supabaseAdmin();

  // Get membership by pass token
  const { data: membership } = await admin
    .from('memberships')
    .select('id, business_id, stamps, rewards_available, stamps_required:businesses(stamps_required)')
    .eq('pass_token', passToken)
    .single();

  if (!membership) return NextResponse.json({ error: 'Card not found' }, { status: 404 });

  const hasAccess = staffRows.some(r => r.business_id === membership.business_id);
  if (!hasAccess) return NextResponse.json({ error: 'Forbidden: wrong business' }, { status: 403 });

  const { data, error } = await admin.rpc('cashier_award_stamps', {
    p_membership_id: membership.id,
    p_cashier_id: user.id,
    p_branch_id: branchId || null,
    p_coffee_count: coffeeCount,
    p_idempotency_key: idempotencyKey,
  });

  if (error) {
    console.error('cashier_award_stamps error:', error);
    return NextResponse.json({ error: error.message || 'Failed to award stamps' }, { status: 500 });
  }

  return NextResponse.json(data);
}

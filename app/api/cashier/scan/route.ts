import { NextRequest, NextResponse } from 'next/server';
import { getUser, supabaseAdmin, supabaseServer } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { passToken } = await req.json();
  if (!passToken) return NextResponse.json({ error: 'passToken required' }, { status: 400 });

  const admin = supabaseAdmin();

  // Verify staff role for at least one business
  const db = await supabaseServer();
  const { data: staffRows } = await db.from('business_staff').select('business_id, role').eq('user_id', user.id);
  if (!staffRows || staffRows.length === 0) return NextResponse.json({ error: 'Forbidden: not staff' }, { status: 403 });

  const { data, error } = await admin.rpc('get_customer_pass_by_token', { p_pass_token: passToken });
  if (error || !data) return NextResponse.json({ error: 'Card not found' }, { status: 404 });

  const pass = data as {
    membership_id: string; pass_token: string; first_name: string | null;
    stamps: number; stamps_required: number; rewards_available: number;
    business_id: string; business_name: string;
  };

  // Check that the cashier belongs to this business
  const hasAccess = staffRows.some(r => r.business_id === pass.business_id);
  if (!hasAccess) return NextResponse.json({ error: 'Forbidden: wrong business' }, { status: 403 });

  return NextResponse.json({
    firstName: pass.first_name || 'Client',
    stamps: pass.stamps,
    stampsRequired: pass.stamps_required,
    rewardsAvailable: pass.rewards_available,
    passToken: pass.pass_token,
    membershipId: pass.membership_id,
  });
}

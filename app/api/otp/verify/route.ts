import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { normalizeMoroccoPhone } from '@/lib/phone';

export async function POST(req: NextRequest) {
  const { businessSlug, phone, code } = await req.json();
  if (!businessSlug || !phone || !code) {
    return NextResponse.json({ error: 'businessSlug, phone, and code are required' }, { status: 400 });
  }

  const phoneResult = normalizeMoroccoPhone(phone);
  if (!phoneResult.valid) {
    return NextResponse.json({ error: phoneResult.error }, { status: 400 });
  }
  const normalizedPhone = phoneResult.normalized;

  const admin = supabaseAdmin();

  const { data: business } = await admin.from('businesses').select('id').eq('slug', businessSlug).single();
  if (!business) return NextResponse.json({ error: 'Business not found' }, { status: 404 });

  // Look up OTP
  const { data: otpRow } = await admin
    .from('otp_verifications')
    .select('*')
    .eq('phone', normalizedPhone)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (!otpRow) return NextResponse.json({ error: 'Code invalide ou expiré' }, { status: 400 });

  // Check expiry
  if (new Date(otpRow.expires_at) < new Date()) {
    await admin.from('otp_verifications').delete().eq('id', otpRow.id);
    return NextResponse.json({ error: 'Code expiré. Demandez un nouveau code.' }, { status: 400 });
  }

  // Check attempts
  if (otpRow.attempts >= 3) {
    return NextResponse.json({ error: 'Trop de tentatives. Demandez un nouveau code.' }, { status: 400 });
  }

  if (otpRow.code !== code.toString().trim()) {
    await admin.from('otp_verifications').update({ attempts: otpRow.attempts + 1 }).eq('id', otpRow.id);
    return NextResponse.json({ error: 'Code incorrect.' }, { status: 400 });
  }

  // OTP valid — delete it and return pass token
  await admin.from('otp_verifications').delete().eq('id', otpRow.id);

  const { data: membership } = await admin
    .from('memberships')
    .select('pass_token, first_name, stamps, rewards_available')
    .eq('id', otpRow.membership_id)
    .single();

  if (!membership) return NextResponse.json({ error: 'Membership not found' }, { status: 404 });

  return NextResponse.json({
    passToken: membership.pass_token,
    firstName: membership.first_name,
    stamps: membership.stamps,
    rewards: membership.rewards_available,
  });
}

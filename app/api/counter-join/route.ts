import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { normalizeMoroccoPhone } from '@/lib/phone';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { businessSlug, branchSlug, firstName, phone, optIn = false, lang = 'fr' } = body;

    if (!businessSlug || !firstName?.trim() || !phone) {
      return NextResponse.json({ error: 'businessSlug, firstName, and phone are required' }, { status: 400 });
    }

    // Normalize phone
    const phoneResult = normalizeMoroccoPhone(phone);
    if (!phoneResult.valid) {
      return NextResponse.json({ error: phoneResult.error || 'Invalid phone number' }, { status: 400 });
    }
    const normalizedPhone = phoneResult.normalized;

    const admin = supabaseAdmin();

    // Look up business by slug
    const { data: business, error: bizErr } = await admin
      .from('businesses')
      .select('id, name, stamps_required, reward_name')
      .eq('slug', businessSlug)
      .single();

    if (bizErr || !business) {
      return NextResponse.json({ error: 'Café not found' }, { status: 404 });
    }

    // Look up branch if branchSlug provided
    let branchId: string | null = null;
    if (branchSlug) {
      const { data: branch } = await admin
        .from('branches')
        .select('id')
        .eq('business_id', business.id)
        .eq('slug', branchSlug)
        .single();
      branchId = branch?.id ?? null;
    }

    // Check for existing membership by phone in this business
    const { data: existing } = await admin
      .from('memberships')
      .select('id, pass_token, first_name, stamps, rewards_available, preferred_language')
      .eq('business_id', business.id)
      .eq('phone', normalizedPhone)
      .maybeSingle();

    if (existing) {
      // Returning customer — check if same device (cookie check would be ideal but we're stateless here)
      // Return their existing card data — no OTP needed for counter (staff is present)
      return NextResponse.json({
        passToken: existing.pass_token,
        isNew: false,
        firstName: existing.first_name || firstName.trim(),
        businessName: business.name,
        stamps: existing.stamps || 0,
        rewards: existing.rewards_available || 0,
      });
    }

    // New customer — create membership using RPC
    const { data: rpc, error: rpcErr } = await admin.rpc('join_cafe_customer', {
      p_business_id: business.id,
      p_branch_id: branchId,
      p_first_name: firstName.trim(),
      p_phone: normalizedPhone,
      p_opt_in: optIn,
      p_lang: lang,
    });

    if (rpcErr) {
      console.error('join_cafe_customer error:', rpcErr);
      // If unique constraint violation on phone, return existing
      if (rpcErr.code === '23505') {
        const { data: retryExisting } = await admin
          .from('memberships')
          .select('id, pass_token, first_name, stamps, rewards_available')
          .eq('business_id', business.id)
          .eq('phone', normalizedPhone)
          .maybeSingle();
        if (retryExisting) {
          return NextResponse.json({
            passToken: retryExisting.pass_token,
            isNew: false,
            firstName: retryExisting.first_name || firstName.trim(),
            businessName: business.name,
            stamps: retryExisting.stamps || 0,
            rewards: retryExisting.rewards_available || 0,
          });
        }
      }
      return NextResponse.json({ error: 'Could not create membership. Please try again.' }, { status: 500 });
    }

    const result = rpc as { pass_token: string; membership_id: string } | null;
    if (!result) {
      return NextResponse.json({ error: 'Unexpected error. Please try again.' }, { status: 500 });
    }

    return NextResponse.json({
      passToken: result.pass_token,
      isNew: true,
      firstName: firstName.trim(),
      businessName: business.name,
      stamps: 0,
      rewards: 0,
    });

  } catch (err) {
    console.error('counter-join error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

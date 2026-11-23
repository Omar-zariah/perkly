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
    const cleanName = firstName.trim();

    const admin = supabaseAdmin();

    // Look up business by slug or UUID
    const isBizUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(businessSlug.trim());
    let bizQuery = admin
      .from('businesses')
      .select('id, name, slug, stamps_required, reward_name');
    if (isBizUuid) {
      bizQuery = bizQuery.eq('id', businessSlug.trim());
    } else {
      bizQuery = bizQuery.ilike('slug', businessSlug.trim());
    }
    const { data: business, error: bizErr } = await bizQuery.maybeSingle();

    if (bizErr || !business) {
      return NextResponse.json({ error: 'Café not found' }, { status: 404 });
    }

    // Look up branch if branchSlug provided
    let branchId: string | null = null;
    let validBranchSlug: string | null = null;
    if (branchSlug) {
      const isBranchUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(branchSlug.trim());
      let bQuery = admin
        .from('branches')
        .select('id, slug')
        .eq('business_id', business.id);
      if (isBranchUuid) {
        bQuery = bQuery.eq('id', branchSlug.trim());
      } else {
        bQuery = bQuery.ilike('slug', branchSlug.trim());
      }
      const { data: branch } = await bQuery.maybeSingle();
      if (branch) {
        branchId = branch.id;
        validBranchSlug = branch.slug;
      }
    }

    // 1. Check if customer already exists for this business + phone
    const { data: existing } = await admin
      .from('memberships')
      .select('id, pass_token, first_name, stamps, rewards_available, preferred_language')
      .eq('business_id', business.id)
      .eq('phone', normalizedPhone)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({
        passToken: existing.pass_token,
        isNew: false,
        firstName: existing.first_name || cleanName,
        businessName: business.name,
        stamps: existing.stamps || 0,
        rewards: existing.rewards_available || 0,
      });
    }

    // 2. Try the PostgreSQL RPC with the exact signature: p_business_slug, p_branch_slug
    let passToken: string | null = null;
    let isNewCustomer = true;

    const { data: rpc, error: rpcErr } = await admin.rpc('join_cafe_customer', {
      p_business_slug: business.slug || businessSlug.trim(),
      p_branch_slug: validBranchSlug || (branchSlug ? branchSlug.trim() : null),
      p_first_name: cleanName,
      p_phone: normalizedPhone,
      p_opt_in: Boolean(optIn),
      p_lang: lang || 'fr',
    });

    if (!rpcErr && rpc?.pass_token) {
      passToken = rpc.pass_token;
      isNewCustomer = rpc.is_new ?? true;
    } else {
      console.warn('RPC join_cafe_customer failed or returned null, attempting direct insert:', rpcErr);

      // Fallback: Check if row was created despite error or already exists
      const { data: retryCheck } = await admin
        .from('memberships')
        .select('id, pass_token, first_name, stamps, rewards_available')
        .eq('business_id', business.id)
        .eq('phone', normalizedPhone)
        .maybeSingle();

      if (retryCheck) {
        return NextResponse.json({
          passToken: retryCheck.pass_token,
          isNew: false,
          firstName: retryCheck.first_name || cleanName,
          businessName: business.name,
          stamps: retryCheck.stamps || 0,
          rewards: retryCheck.rewards_available || 0,
        });
      }

      // Direct insertion fallback (guarantees signup succeeds)
      const generatedToken = crypto.randomUUID().replace(/-/g, '');
      const { data: newRow, error: insertErr } = await admin
        .from('memberships')
        .insert({
          business_id: business.id,
          branch_id: branchId,
          first_name: cleanName,
          phone: normalizedPhone,
          pass_token: generatedToken,
          stamps: 0,
          total_visits: 0,
          rewards_available: 0,
          marketing_opt_in: Boolean(optIn),
          preferred_language: lang || 'fr',
        })
        .select('id, pass_token, first_name')
        .single();

      if (insertErr) {
        console.error('Direct insert fallback failed:', insertErr);
        // Double check in case of race condition / unique constraint
        const { data: finalCheck } = await admin
          .from('memberships')
          .select('id, pass_token, first_name, stamps, rewards_available')
          .eq('business_id', business.id)
          .eq('phone', normalizedPhone)
          .maybeSingle();

        if (finalCheck) {
          return NextResponse.json({
            passToken: finalCheck.pass_token,
            isNew: false,
            firstName: finalCheck.first_name || cleanName,
            businessName: business.name,
            stamps: finalCheck.stamps || 0,
            rewards: finalCheck.rewards_available || 0,
          });
        }
        return NextResponse.json({ error: 'Could not create membership. Please try again.' }, { status: 500 });
      }

      passToken = newRow.pass_token;
      isNewCustomer = true;
    }

    return NextResponse.json({
      passToken,
      isNew: isNewCustomer,
      firstName: cleanName,
      businessName: business.name,
      stamps: 0,
      rewards: 0,
    });

  } catch (err) {
    console.error('counter-join exception:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

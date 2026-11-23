-- ==============================================================================
-- Fix join_cafe_customer RPC function
-- ==============================================================================
-- 1. Uses built-in `replace(gen_random_uuid()::text, '-', '')` instead of `gen_random_bytes`
--    which doesn't require pgcrypto or extensions schema.
-- 2. Sets `search_path = public, pg_catalog, extensions` so standard functions resolve.
-- 3. Grants execute to public and anon so counter customers can sign up without login.
-- ==============================================================================

create or replace function public.join_cafe_customer(
  p_business_slug text,
  p_branch_slug text default null,
  p_first_name text default 'Client',
  p_phone text default '',
  p_opt_in boolean default false,
  p_lang text default 'fr'
)
returns jsonb language plpgsql security definer set search_path = public, pg_catalog, extensions as $$
declare
  v_biz public.businesses%rowtype;
  v_branch_id uuid := null;
  v_membership public.memberships%rowtype;
  v_is_new boolean := false;
  v_clean_phone text := trim(p_phone);
  v_clean_name text := trim(coalesce(p_first_name, 'Client'));
  v_pass_token text;
begin
  -- Validate business by slug or id
  select * into v_biz from public.businesses 
  where slug = lower(trim(p_business_slug)) or id::text = trim(p_business_slug);
  
  if not found then
    raise exception 'Café introuvable / Business not found';
  end if;

  -- Resolve branch if provided
  if p_branch_slug is not null and trim(p_branch_slug) <> '' then
    select id into v_branch_id from public.branches 
    where business_id = v_biz.id and (slug = lower(trim(p_branch_slug)) or id::text = trim(p_branch_slug));
  end if;

  -- Default to first branch if none specified
  if v_branch_id is null then
    select id into v_branch_id from public.branches where business_id = v_biz.id order by created_at asc limit 1;
  end if;

  -- Check if customer already exists for this business + normalized phone
  select * into v_membership from public.memberships 
  where business_id = v_biz.id and phone = v_clean_phone;

  if found then
    -- Returning customer: update preferences if requested
    update public.memberships set
      first_name = coalesce(nullif(v_clean_name, ''), first_name),
      marketing_opt_in = coalesce(p_opt_in, marketing_opt_in),
      preferred_language = coalesce(p_lang, preferred_language)
    where id = v_membership.id
    returning * into v_membership;
    v_is_new := false;
  else
    -- New customer: create membership with 0 stamps and unique pass token
    v_pass_token := replace(gen_random_uuid()::text, '-', '');
    
    insert into public.memberships (
      business_id,
      branch_id,
      first_name,
      phone,
      pass_token,
      stamps,
      total_visits,
      rewards_available,
      marketing_opt_in,
      preferred_language
    ) values (
      v_biz.id,
      v_branch_id,
      v_clean_name,
      v_clean_phone,
      v_pass_token,
      0,
      0,
      0,
      coalesce(p_opt_in, false),
      coalesce(p_lang, 'fr')
    )
    returning * into v_membership;
    v_is_new := true;

    -- Audit enrollment event
    insert into public.loyalty_events (
      membership_id,
      business_id,
      branch_id,
      kind,
      quantity,
      stamps_before,
      stamps_after,
      rewards_before,
      rewards_after
    ) values (
      v_membership.id,
      v_biz.id,
      v_branch_id,
      'enrollment',
      1,
      0,
      0,
      0,
      0
    );
  end if;

  return jsonb_build_object(
    'is_new', v_is_new,
    'membership_id', v_membership.id,
    'pass_token', v_membership.pass_token,
    'first_name', v_membership.first_name,
    'phone', v_membership.phone,
    'stamps', v_membership.stamps,
    'rewards_available', v_membership.rewards_available,
    'total_visits', v_membership.total_visits,
    'business', jsonb_build_object(
      'id', v_biz.id,
      'name', v_biz.name,
      'slug', v_biz.slug,
      'reward_name', v_biz.reward_name,
      'stamps_required', v_biz.stamps_required,
      'primary_color', v_biz.primary_color,
      'accent_color', v_biz.accent_color,
      'offer_sentence_fr', v_biz.offer_sentence_fr,
      'offer_sentence_ar', v_biz.offer_sentence_ar
    )
  );
end $$;

grant execute on function public.join_cafe_customer(text, text, text, text, boolean, text) to public, anon, authenticated;

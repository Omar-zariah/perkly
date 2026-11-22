-- ==============================================================================
-- Seed: Café Atlas, Nador Demo (Pilot Merchant)
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/hcxtgxwwybvpklccssxm/sql/new
--
-- Password for all demo accounts: Perkly2026!
-- ==============================================================================

create extension if not exists pgcrypto;

do $$
declare
  v_owner_id uuid;
  v_mgr_id   uuid;
  v_csh_id   uuid;
  v_biz_id   uuid;
  v_b1_id    uuid;
  v_b2_id    uuid;

  v_m1_id    uuid;
  v_m2_id    uuid;
  v_m3_id    uuid;

  v_pw       text := 'Perkly2026!';
  v_enc_pw   text;
begin
  v_enc_pw := crypt(v_pw, gen_salt('bf'));

  -- 1. Create Staff Accounts in auth.users
  -- Owner
  select id into v_owner_id from auth.users where lower(email) = 'atlas.owner@perkly.ma';
  if v_owner_id is null then
    v_owner_id := gen_random_uuid();
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, email_change, email_change_token_new, recovery_token
    ) values (
      '00000000-0000-0000-0000-000000000000', v_owner_id, 'authenticated', 'authenticated',
      'atlas.owner@perkly.ma', v_enc_pw, now(),
      '{"provider":"email","providers":["email"]}', '{"name":"Sarah Mansouri (Propriétaire)"}', now(), now(),
      '', '', '', ''
    );
    insert into auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
    values (v_owner_id, v_owner_id, jsonb_build_object('sub', v_owner_id::text, 'email', 'atlas.owner@perkly.ma'), 'email', 'atlas.owner@perkly.ma', now(), now(), now())
    on conflict do nothing;
  else
    update auth.users set encrypted_password = v_enc_pw, email_confirmed_at = now() where id = v_owner_id;
  end if;

  -- Manager
  select id into v_mgr_id from auth.users where lower(email) = 'atlas.manager@perkly.ma';
  if v_mgr_id is null then
    v_mgr_id := gen_random_uuid();
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, email_change, email_change_token_new, recovery_token
    ) values (
      '00000000-0000-0000-0000-000000000000', v_mgr_id, 'authenticated', 'authenticated',
      'atlas.manager@perkly.ma', v_enc_pw, now(),
      '{"provider":"email","providers":["email"]}', '{"name":"Karim Tazi (Gérant)"}', now(), now(),
      '', '', '', ''
    );
    insert into auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
    values (v_mgr_id, v_mgr_id, jsonb_build_object('sub', v_mgr_id::text, 'email', 'atlas.manager@perkly.ma'), 'email', 'atlas.manager@perkly.ma', now(), now(), now())
    on conflict do nothing;
  else
    update auth.users set encrypted_password = v_enc_pw, email_confirmed_at = now() where id = v_mgr_id;
  end if;

  -- Cashier
  select id into v_csh_id from auth.users where lower(email) = 'atlas.cashier@perkly.ma';
  if v_csh_id is null then
    v_csh_id := gen_random_uuid();
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, email_change, email_change_token_new, recovery_token
    ) values (
      '00000000-0000-0000-0000-000000000000', v_csh_id, 'authenticated', 'authenticated',
      'atlas.cashier@perkly.ma', v_enc_pw, now(),
      '{"provider":"email","providers":["email"]}', '{"name":"Fatima Zahra (Serveur/Caisse)"}', now(), now(),
      '', '', '', ''
    );
    insert into auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
    values (v_csh_id, v_csh_id, jsonb_build_object('sub', v_csh_id::text, 'email', 'atlas.cashier@perkly.ma'), 'email', 'atlas.cashier@perkly.ma', now(), now(), now())
    on conflict do nothing;
  else
    update auth.users set encrypted_password = v_enc_pw, email_confirmed_at = now() where id = v_csh_id;
  end if;

  -- 2. Create or Update Business
  select id into v_biz_id from public.businesses where slug = 'cafe-atlas';
  if v_biz_id is null then
    insert into public.businesses (
      name,
      slug,
      owner_id,
      stamps_required,
      reward_name,
      plan,
      subscription_status,
      primary_color,
      accent_color,
      currency,
      monthly_price_mad,
      offer_sentence_fr,
      offer_sentence_ar
    ) values (
      'Café Atlas, Nador',
      'cafe-atlas',
      v_owner_id,
      8,
      'Café standard gratuit',
      'growth',
      'active',
      '#1b4332',
      '#d8f3dc',
      'MAD',
      299,
      'Achetez 8 cafés et obtenez le suivant gratuit',
      'اشتري 8 قهوات واحصل على التالية مجاناً'
    ) returning id into v_biz_id;
  else
    update public.businesses set
      owner_id = v_owner_id,
      stamps_required = 8,
      reward_name = 'Café standard gratuit',
      primary_color = '#1b4332',
      accent_color = '#d8f3dc',
      currency = 'MAD',
      monthly_price_mad = 299,
      offer_sentence_fr = 'Achetez 8 cafés et obtenez le suivant gratuit',
      offer_sentence_ar = 'اشتري 8 قهوات واحصل على التالية مجاناً'
    where id = v_biz_id;
  end if;

  -- 3. Create Branches
  -- Branch 1: Nador Centre
  select id into v_b1_id from public.branches where business_id = v_biz_id and slug = 'nador-centre';
  if v_b1_id is null then
    insert into public.branches (business_id, name, slug, address, city, phone)
    values (v_biz_id, 'Nador Centre - Boulevard Hassan II', 'nador-centre', '42 Boulevard Hassan II', 'Nador', '+212 536-601122')
    returning id into v_b1_id;
  end if;

  -- Branch 2: Corniche Mar Chica
  select id into v_b2_id from public.branches where business_id = v_biz_id and slug = 'corniche-marchica';
  if v_b2_id is null then
    insert into public.branches (business_id, name, slug, address, city, phone)
    values (v_biz_id, 'Corniche - Mar Chica', 'corniche-marchica', 'Boulevard de la Corniche Mar Chica', 'Nador', '+212 536-604488')
    returning id into v_b2_id;
  end if;

  -- 4. Assign Staff
  insert into public.business_staff (business_id, user_id, role)
  values (v_biz_id, v_owner_id, 'owner')
  on conflict (business_id, user_id) do update set role = 'owner';

  insert into public.business_staff (business_id, user_id, role)
  values (v_biz_id, v_mgr_id, 'manager')
  on conflict (business_id, user_id) do update set role = 'manager';

  insert into public.business_staff (business_id, user_id, role)
  values (v_biz_id, v_csh_id, 'staff')
  on conflict (business_id, user_id) do update set role = 'staff';

  -- 5. Seed Customer 1: Youssef (Active Regular, 7/8 stamps + 1 reward ready)
  select id into v_m1_id from public.memberships where business_id = v_biz_id and phone = '+212612345678';
  if v_m1_id is null then
    insert into public.memberships (
      business_id, branch_id, first_name, phone, pass_token,
      stamps, total_visits, total_stamps_earned, rewards_available, marketing_opt_in, preferred_language, created_at, last_visit_at
    ) values (
      v_biz_id, v_b1_id, 'Youssef', '+212612345678', 'atlas-pass-youssef-7890',
      7, 15, 23, 1, true, 'fr', now() - interval '30 days', now() - interval '2 days'
    ) returning id into v_m1_id;
  else
    update public.memberships set
      stamps = 7, total_visits = 15, total_stamps_earned = 23, rewards_available = 1, pass_token = 'atlas-pass-youssef-7890'
    where id = v_m1_id;
  end if;

  -- 6. Seed Customer 2: Amina (3/8 stamps)
  select id into v_m2_id from public.memberships where business_id = v_biz_id and phone = '+212765432109';
  if v_m2_id is null then
    insert into public.memberships (
      business_id, branch_id, first_name, phone, pass_token,
      stamps, total_visits, total_stamps_earned, rewards_available, marketing_opt_in, preferred_language, created_at, last_visit_at
    ) values (
      v_biz_id, v_b1_id, 'Amina', '+212765432109', 'atlas-pass-amina-4321',
      3, 3, 3, 0, true, 'ar', now() - interval '10 days', now() - interval '1 day'
    ) returning id into v_m2_id;
  end if;

  -- 7. Seed Customer 3: Bilal (Enrolled, 0 stamps)
  select id into v_m3_id from public.memberships where business_id = v_biz_id and phone = '+212622334455';
  if v_m3_id is null then
    insert into public.memberships (
      business_id, branch_id, first_name, phone, pass_token,
      stamps, total_visits, total_stamps_earned, rewards_available, marketing_opt_in, preferred_language, created_at, last_visit_at
    ) values (
      v_biz_id, v_b2_id, 'Bilal', '+212622334455', 'atlas-pass-bilal-1122',
      0, 0, 0, 0, false, 'ar', now() - interval '2 hours', null
    ) returning id into v_m3_id;
  end if;

  -- 8. Seed Sample Loyalty Events for Audit and Analytics
  insert into public.loyalty_events (membership_id, business_id, branch_id, staff_id, kind, quantity, items_count, stamps_before, stamps_after, rewards_before, rewards_after, created_at)
  values
    (v_m1_id, v_biz_id, v_b1_id, v_csh_id, 'stamp', 1, 1, 6, 7, 1, 1, now() - interval '2 days'),
    (v_m1_id, v_biz_id, v_b1_id, v_csh_id, 'redeem', 1, 1, 6, 6, 2, 1, now() - interval '5 days'),
    (v_m2_id, v_biz_id, v_b1_id, v_csh_id, 'stamp', 2, 2, 1, 3, 0, 0, now() - interval '1 day'),
    (v_m3_id, v_biz_id, v_b2_id, v_csh_id, 'enrollment', 1, 1, 0, 0, 0, 0, now() - interval '2 hours')
  on conflict do nothing;

end $$;

-- Verify setup
select 
  b.name as business,
  br.name as branch,
  m.first_name,
  m.phone,
  m.stamps || '/8 stamps' as balance,
  m.rewards_available as rewards_ready,
  m.pass_token
from public.memberships m
join public.businesses b on b.id = m.business_id
left join public.branches br on br.id = m.branch_id
where b.slug = 'cafe-atlas';

-- ==============================================================================
-- Seed Demo Users & Assign Roles in Supabase
-- Run this in your Supabase SQL Editor: https://supabase.com/dashboard/project/hcxtgxwwybvpklccssxm/sql/new
--
-- Shared Default Password for all accounts: Perkly2026!
-- ==============================================================================

create extension if not exists pgcrypto;

-- Ensure constraint supports expanded roles
alter table public.business_staff 
  drop constraint if exists business_staff_role_check;

alter table public.business_staff 
  add constraint business_staff_role_check 
  check (role in ('owner', 'admin', 'manager', 'staff', 'cashier'));

-- Ensure platform_admins table exists
create table if not exists public.platform_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'superadmin' check(role in ('superadmin', 'support')),
  created_at timestamptz not null default now()
);

alter table public.platform_admins enable row level security;

do $$
declare
  -- User IDs
  v_superadmin_id uuid;
  v_owner_id      uuid;
  v_admin_id      uuid;
  v_manager_id    uuid;
  v_staff_id      uuid;
  v_customer_id   uuid;

  -- Business ID & Membership ID
  v_biz_id        uuid;
  v_membership_id uuid;

  -- Common password
  v_password      text := 'Perkly2026!';
  v_encrypted_pw  text;
begin
  v_encrypted_pw := crypt(v_password, gen_salt('bf'));

  -- ============================================================================
  -- 1. CREATE ACCOUNTS IN auth.users & auth.identities
  -- ============================================================================

  -- 1A. SUPER ADMIN (Platform wide)
  select id into v_superadmin_id from auth.users where lower(email) = 'superadmin@perkly.app';
  if v_superadmin_id is null then
    v_superadmin_id := gen_random_uuid();
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, email_change, email_change_token_new, recovery_token
    ) values (
      '00000000-0000-0000-0000-000000000000', v_superadmin_id, 'authenticated', 'authenticated',
      'superadmin@perkly.app', v_encrypted_pw, now(),
      '{"provider":"email","providers":["email"]}', '{"name":"Alex Superadmin"}', now(), now(),
      '', '', '', ''
    );
    insert into auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
    values (v_superadmin_id, v_superadmin_id, jsonb_build_object('sub', v_superadmin_id::text, 'email', 'superadmin@perkly.app'), 'email', 'superadmin@perkly.app', now(), now(), now())
    on conflict do nothing;
  else
    update auth.users set encrypted_password = v_encrypted_pw, email_confirmed_at = now() where id = v_superadmin_id;
  end if;

  -- 1B. BUSINESS OWNER
  select id into v_owner_id from auth.users where lower(email) = 'owner@sundaycoffee.com';
  if v_owner_id is null then
    v_owner_id := gen_random_uuid();
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, email_change, email_change_token_new, recovery_token
    ) values (
      '00000000-0000-0000-0000-000000000000', v_owner_id, 'authenticated', 'authenticated',
      'owner@sundaycoffee.com', v_encrypted_pw, now(),
      '{"provider":"email","providers":["email"]}', '{"name":"Sarah Owner"}', now(), now(),
      '', '', '', ''
    );
    insert into auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
    values (v_owner_id, v_owner_id, jsonb_build_object('sub', v_owner_id::text, 'email', 'owner@sundaycoffee.com'), 'email', 'owner@sundaycoffee.com', now(), now(), now())
    on conflict do nothing;
  else
    update auth.users set encrypted_password = v_encrypted_pw, email_confirmed_at = now() where id = v_owner_id;
  end if;

  -- 1C. BUSINESS ADMIN
  select id into v_admin_id from auth.users where lower(email) = 'admin@sundaycoffee.com';
  if v_admin_id is null then
    v_admin_id := gen_random_uuid();
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, email_change, email_change_token_new, recovery_token
    ) values (
      '00000000-0000-0000-0000-000000000000', v_admin_id, 'authenticated', 'authenticated',
      'admin@sundaycoffee.com', v_encrypted_pw, now(),
      '{"provider":"email","providers":["email"]}', '{"name":"David Admin"}', now(), now(),
      '', '', '', ''
    );
    insert into auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
    values (v_admin_id, v_admin_id, jsonb_build_object('sub', v_admin_id::text, 'email', 'admin@sundaycoffee.com'), 'email', 'admin@sundaycoffee.com', now(), now(), now())
    on conflict do nothing;
  else
    update auth.users set encrypted_password = v_encrypted_pw, email_confirmed_at = now() where id = v_admin_id;
  end if;

  -- 1D. STORE MANAGER
  select id into v_manager_id from auth.users where lower(email) = 'manager@sundaycoffee.com';
  if v_manager_id is null then
    v_manager_id := gen_random_uuid();
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, email_change, email_change_token_new, recovery_token
    ) values (
      '00000000-0000-0000-0000-000000000000', v_manager_id, 'authenticated', 'authenticated',
      'manager@sundaycoffee.com', v_encrypted_pw, now(),
      '{"provider":"email","providers":["email"]}', '{"name":"Marcus Manager"}', now(), now(),
      '', '', '', ''
    );
    insert into auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
    values (v_manager_id, v_manager_id, jsonb_build_object('sub', v_manager_id::text, 'email', 'manager@sundaycoffee.com'), 'email', 'manager@sundaycoffee.com', now(), now(), now())
    on conflict do nothing;
  else
    update auth.users set encrypted_password = v_encrypted_pw, email_confirmed_at = now() where id = v_manager_id;
  end if;

  -- 1E. STAFF / CASHIER
  select id into v_staff_id from auth.users where lower(email) = 'staff@sundaycoffee.com';
  if v_staff_id is null then
    v_staff_id := gen_random_uuid();
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, email_change, email_change_token_new, recovery_token
    ) values (
      '00000000-0000-0000-0000-000000000000', v_staff_id, 'authenticated', 'authenticated',
      'staff@sundaycoffee.com', v_encrypted_pw, now(),
      '{"provider":"email","providers":["email"]}', '{"name":"Chloe Staff"}', now(), now(),
      '', '', '', ''
    );
    insert into auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
    values (v_staff_id, v_staff_id, jsonb_build_object('sub', v_staff_id::text, 'email', 'staff@sundaycoffee.com'), 'email', 'staff@sundaycoffee.com', now(), now(), now())
    on conflict do nothing;
  else
    update auth.users set encrypted_password = v_encrypted_pw, email_confirmed_at = now() where id = v_staff_id;
  end if;

  -- 1F. CUSTOMER
  select id into v_customer_id from auth.users where lower(email) = 'customer@gmail.com';
  if v_customer_id is null then
    v_customer_id := gen_random_uuid();
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, email_change, email_change_token_new, recovery_token
    ) values (
      '00000000-0000-0000-0000-000000000000', v_customer_id, 'authenticated', 'authenticated',
      'customer@gmail.com', v_encrypted_pw, now(),
      '{"provider":"email","providers":["email"]}', '{"name":"Emma Customer"}', now(), now(),
      '', '', '', ''
    );
    insert into auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
    values (v_customer_id, v_customer_id, jsonb_build_object('sub', v_customer_id::text, 'email', 'customer@gmail.com'), 'email', 'customer@gmail.com', now(), now(), now())
    on conflict do nothing;
  else
    update auth.users set encrypted_password = v_encrypted_pw, email_confirmed_at = now() where id = v_customer_id;
  end if;


  -- ============================================================================
  -- 2. ASSIGN PLATFORM SUPERADMIN ROLE
  -- ============================================================================
  insert into public.platform_admins (user_id, role)
  values (v_superadmin_id, 'superadmin')
  on conflict (user_id) do nothing;


  -- ============================================================================
  -- 3. CREATE DEMO BUSINESS (Sunday Coffee Co.) OWNED BY Sarah Owner
  -- ============================================================================
  select id into v_biz_id from public.businesses where slug = 'sunday-coffee';
  if v_biz_id is null then
    insert into public.businesses (
      name, slug, owner_id, stamps_required, reward_name, plan, subscription_status
    ) values (
      'Sunday Coffee Co.', 'sunday-coffee', v_owner_id, 10, 'Free Artisan Coffee', 'growth', 'active'
    ) returning id into v_biz_id;
  else
    update public.businesses 
    set owner_id = v_owner_id, 
        plan = 'growth', 
        subscription_status = 'active'
    where id = v_biz_id;
  end if;


  -- ============================================================================
  -- 4. ASSIGN BUSINESS ROLES IN public.business_staff
  -- ============================================================================
  -- 4A. Owner
  insert into public.business_staff (business_id, user_id, role)
  values (v_biz_id, v_owner_id, 'owner')
  on conflict (business_id, user_id) do update set role = 'owner';

  -- 4B. Admin
  insert into public.business_staff (business_id, user_id, role)
  values (v_biz_id, v_admin_id, 'admin')
  on conflict (business_id, user_id) do update set role = 'admin';

  -- 4C. Manager
  insert into public.business_staff (business_id, user_id, role)
  values (v_biz_id, v_manager_id, 'manager')
  on conflict (business_id, user_id) do update set role = 'manager';

  -- 4D. Staff / Cashier
  insert into public.business_staff (business_id, user_id, role)
  values (v_biz_id, v_staff_id, 'staff')
  on conflict (business_id, user_id) do update set role = 'staff';


  -- ============================================================================
  -- 5. CREATE CUSTOMER MEMBERSHIP CARD (Emma Customer with 7/10 stamps + 1 reward ready)
  -- ============================================================================
  insert into public.memberships (
    business_id, customer_id, stamps, total_visits, rewards_available, marketing_opt_in
  ) values (
    v_biz_id, v_customer_id, 7, 17, 1, true
  )
  on conflict (business_id, customer_id) do update set
    stamps = 7,
    total_visits = 17,
    rewards_available = 1,
    marketing_opt_in = true
  returning id into v_membership_id;

end $$;

-- ==============================================================================
-- 6. VERIFY ALL CREATED USERS & ROLES
-- ==============================================================================
select 
  u.email,
  coalesce(pa.role, bs.role, 'customer') as assigned_role,
  coalesce(b.name, 'Platform-wide') as business_context,
  u.email_confirmed_at is not null as is_confirmed
from auth.users u
left join public.platform_admins pa on pa.user_id = u.id
left join public.business_staff bs on bs.user_id = u.id
left join public.businesses b on b.id = bs.business_id
where u.email in (
  'superadmin@perkly.app',
  'owner@sundaycoffee.com',
  'admin@sundaycoffee.com',
  'manager@sundaycoffee.com',
  'staff@sundaycoffee.com',
  'customer@gmail.com'
)
order by 
  case coalesce(pa.role, bs.role, 'customer')
    when 'superadmin' then 1
    when 'owner' then 2
    when 'admin' then 3
    when 'manager' then 4
    when 'staff' then 5
    else 6
  end;

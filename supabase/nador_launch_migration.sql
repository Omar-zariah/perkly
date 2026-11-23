-- ==============================================================================
-- Perkly Nador, Morocco Café Pilot Launch Migration
-- Supports:
-- 1. Phone-first frictionless counter customer signup (+212 Morocco)
-- 2. Multi-branch management (Café Atlas - Nador Centre, Corniche, etc.)
-- 3. Excess stamps carry-forward (rollover) and multi-reward balances
-- 4. Manager reversal audit trail with reason preservation
-- 5. Opaque personal pass tokens & separate public/personal QRs
-- 6. OTP returning customer verification
-- ==============================================================================

create extension if not exists pgcrypto;

-- 1. Enhance public.businesses with café branding & pilot settings
alter table public.businesses
  add column if not exists logo_url text,
  add column if not exists primary_color text default '#163f2c',
  add column if not exists accent_color text default '#d1f36a',
  add column if not exists currency text default 'MAD',
  add column if not exists monthly_price_mad int default 299,
  add column if not exists description text,
  add column if not exists offer_sentence_fr text default 'Achetez 8 cafés et obtenez le suivant gratuit',
  add column if not exists offer_sentence_ar text default 'اشتري 8 قهوات واحصل على التالية مجاناً';

-- 2. Branches table
create table if not exists public.branches (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null check(length(trim(name)) between 2 and 100),
  slug text not null check(slug ~ '^[a-z0-9-]{2,50}$'),
  address text,
  city text not null default 'Nador',
  phone text,
  created_at timestamptz not null default now(),
  unique(business_id, slug)
);

create index if not exists idx_branches_biz on public.branches(business_id);

-- 3. Enhance public.memberships with phone, first_name, and opaque pass_token
alter table public.memberships
  add column if not exists first_name text,
  add column if not exists phone text,
  add column if not exists pass_token text default encode(gen_random_bytes(16), 'hex'),
  add column if not exists branch_id uuid references public.branches(id) on delete set null,
  add column if not exists total_stamps_earned int not null default 0 check(total_stamps_earned >= 0),
  add column if not exists last_visit_at timestamptz,
  add column if not exists preferred_language text default 'fr' check(preferred_language in ('fr', 'ar'));

-- Backfill pass_token if null
update public.memberships set pass_token = encode(gen_random_bytes(16), 'hex') where pass_token is null;
alter table public.memberships alter column pass_token set not null;

create unique index if not exists idx_memberships_pass_token on public.memberships(pass_token);
create index if not exists idx_memberships_phone on public.memberships(business_id, phone);

-- Drop old foreign key constraint if strict on customer_id so phone-only counter customers can join
alter table public.memberships alter column customer_id drop not null;

-- Ensure unique membership per phone per business (when phone is provided)
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'memberships_biz_phone_uniq'
  ) then
    alter table public.memberships add constraint memberships_biz_phone_uniq unique (business_id, phone);
  end if;
exception when others then
  null;
end $$;

-- 4. Enhance public.loyalty_events for multi-coffee rollover, cashier audit, and reversals
alter table public.loyalty_events
  add column if not exists branch_id uuid references public.branches(id) on delete set null,
  add column if not exists quantity int not null default 1,
  add column if not exists items_count int not null default 1,
  add column if not exists stamps_before int not null default 0,
  add column if not exists stamps_after int not null default 0,
  add column if not exists rewards_before int not null default 0,
  add column if not exists rewards_after int not null default 0,
  add column if not exists idempotency_key text,
  add column if not exists reversed_event_id uuid references public.loyalty_events(id),
  add column if not exists reversal_reason text;

create unique index if not exists idx_loyalty_events_idempotency 
  on public.loyalty_events(idempotency_key) where idempotency_key is not null;

-- Update loyalty_events kind check to include 'reversal' and 'enrollment'
alter table public.loyalty_events drop constraint if exists loyalty_events_kind_check;
alter table public.loyalty_events add constraint loyalty_events_kind_check 
  check(kind in ('stamp', 'redeem', 'reversal', 'enrollment'));

-- 5. OTP Verifications table (for returning customer login on new devices)
create table if not exists public.otp_verifications (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  phone text not null,
  code text not null,
  attempts int not null default 0,
  expires_at timestamptz not null default (now() + interval '10 minutes'),
  verified_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_otp_biz_phone on public.otp_verifications(business_id, phone, created_at desc);

-- Enable RLS on new tables
alter table public.branches enable row level security;
alter table public.otp_verifications enable row level security;

-- Policies for branches & businesses public catalog
drop policy if exists "branches public read" on public.branches;
create policy "branches public read" on public.branches for select to public using(true);
create policy "staff manage branches" on public.branches for all to authenticated using(public.is_business_admin(business_id));

drop policy if exists "business public catalog" on public.businesses;
drop policy if exists "businesses public read" on public.businesses;
create policy "businesses public read" on public.businesses for select to public using(true);

-- ==============================================================================
-- 6. STORED PROCEDURES (RPCS)
-- ==============================================================================

-- 6A. Customer Counter Quick Signup (No password, 2 fields: first_name & phone)
create or replace function public.join_cafe_customer(
  p_business_slug text,
  p_branch_slug text default null,
  p_first_name text default 'Client',
  p_phone text default '',
  p_opt_in boolean default false,
  p_lang text default 'fr'
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_biz public.businesses%rowtype;
  v_branch_id uuid := null;
  v_membership public.memberships%rowtype;
  v_is_new boolean := false;
  v_clean_phone text := trim(p_phone);
  v_clean_name text := trim(coalesce(p_first_name, 'Client'));
  v_pass_token text;
begin
  -- Validate business
  select * into v_biz from public.businesses where slug = lower(trim(p_business_slug));
  if not found then
    raise exception 'Café introuvable / Business not found';
  end if;

  -- Resolve branch if provided
  if p_branch_slug is not null and trim(p_branch_slug) <> '' then
    select id into v_branch_id from public.branches 
    where business_id = v_biz.id and slug = lower(trim(p_branch_slug));
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
    v_pass_token := encode(gen_random_bytes(16), 'hex');
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

-- 6B. Retrieve customer pass by secure opaque token
create or replace function public.get_customer_pass_by_token(p_pass_token text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_m public.memberships%rowtype;
  v_biz public.businesses%rowtype;
  v_branch_name text := null;
begin
  select * into v_m from public.memberships where pass_token = trim(p_pass_token);
  if not found then
    return null;
  end if;

  select * into v_biz from public.businesses where id = v_m.business_id;
  if v_m.branch_id is not null then
    select name into v_branch_name from public.branches where id = v_m.branch_id;
  end if;

  return jsonb_build_object(
    'id', v_m.id,
    'pass_token', v_m.pass_token,
    'first_name', v_m.first_name,
    'phone_masked', '+212 ' || substr(v_m.phone, 5, 1) || '•• •• •• ' || substr(v_m.phone, 11),
    'stamps', v_m.stamps,
    'rewards_available', v_m.rewards_available,
    'total_visits', v_m.total_visits,
    'marketing_opt_in', v_m.marketing_opt_in,
    'preferred_language', v_m.preferred_language,
    'branch_name', v_branch_name,
    'created_at', v_m.created_at,
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

-- 6C. Cashier Scan & Award Stamps with Rollover & Idempotency
create or replace function public.cashier_award_stamps(
  p_pass_token text,
  p_coffees_count int default 1,
  p_branch_id uuid default null,
  p_idempotency_key text default null
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_m public.memberships%rowtype;
  v_biz public.businesses%rowtype;
  v_required int;
  v_stamps_before int;
  v_rewards_before int;
  v_total_raw int;
  v_new_rewards_unlocked int;
  v_new_stamps_remainder int;
  v_new_rewards_available int;
  v_event_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Non authentifié / Not authenticated';
  end if;

  -- Check idempotency: if already processed with this key, return saved result
  if p_idempotency_key is not null then
    select id into v_event_id from public.loyalty_events where idempotency_key = p_idempotency_key;
    if found then
      -- return current balance
      select * into v_m from public.memberships where pass_token = p_pass_token;
      return jsonb_build_object(
        'success', true,
        'stamps', v_m.stamps,
        'rewards_available', v_m.rewards_available,
        'rewards_unlocked_now', 0,
        'already_processed', true
      );
    end if;
  end if;

  -- Validate coffee count
  if p_coffees_count < 1 or p_coffees_count > 50 then
    raise exception 'Nombre de cafés invalide / Invalid coffee quantity (1-50)';
  end if;

  -- Find membership and lock for update
  select * into v_m from public.memberships where pass_token = trim(p_pass_token) for update;
  if not found then
    raise exception 'Carte introuvable / Card pass not found';
  end if;

  -- Verify staff authorization for this business
  if not public.is_staff(v_m.business_id) then
    raise exception 'Non autorisé pour cet établissement / Unauthorized for this business';
  end if;

  select * into v_biz from public.businesses where id = v_m.business_id;
  v_required := coalesce(v_biz.stamps_required, 8);

  v_stamps_before := v_m.stamps;
  v_rewards_before := v_m.rewards_available;

  -- Rollover calculation:
  -- e.g. 7/8 stamps + 2 coffees = 9 total => 1 reward unlocked + 1/8 stamp remainder
  v_total_raw := v_stamps_before + p_coffees_count;
  v_new_rewards_unlocked := v_total_raw / v_required;
  v_new_stamps_remainder := v_total_raw % v_required;
  v_new_rewards_available := v_rewards_before + v_new_rewards_unlocked;

  -- Update membership
  update public.memberships set
    stamps = v_new_stamps_remainder,
    rewards_available = v_new_rewards_available,
    total_visits = total_visits + 1, -- multiple coffees in one transaction counts as 1 visit
    total_stamps_earned = total_stamps_earned + p_coffees_count,
    last_visit_at = now()
  where id = v_m.id
  returning * into v_m;

  -- Record audit event
  insert into public.loyalty_events (
    membership_id,
    business_id,
    branch_id,
    staff_id,
    kind,
    quantity,
    items_count,
    stamps_before,
    stamps_after,
    rewards_before,
    rewards_after,
    idempotency_key
  ) values (
    v_m.id,
    v_biz.id,
    p_branch_id,
    auth.uid(),
    'stamp',
    p_coffees_count,
    p_coffees_count,
    v_stamps_before,
    v_new_stamps_remainder,
    v_rewards_before,
    v_new_rewards_available,
    p_idempotency_key
  ) returning id into v_event_id;

  return jsonb_build_object(
    'success', true,
    'event_id', v_event_id,
    'customer_name', v_m.first_name,
    'stamps', v_m.stamps,
    'stamps_required', v_required,
    'rewards_available', v_m.rewards_available,
    'rewards_unlocked_now', v_new_rewards_unlocked,
    'total_visits', v_m.total_visits
  );
end $$;

-- 6D. Cashier Redeem Free Coffee Reward
create or replace function public.cashier_redeem_reward(
  p_pass_token text,
  p_branch_id uuid default null,
  p_idempotency_key text default null
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_m public.memberships%rowtype;
  v_rewards_before int;
  v_event_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Non authentifié / Not authenticated';
  end if;

  -- Check idempotency
  if p_idempotency_key is not null then
    select id into v_event_id from public.loyalty_events where idempotency_key = p_idempotency_key;
    if found then
      select * into v_m from public.memberships where pass_token = p_pass_token;
      return jsonb_build_object(
        'success', true,
        'rewards_available', v_m.rewards_available,
        'already_processed', true
      );
    end if;
  end if;

  -- Find membership and lock row
  select * into v_m from public.memberships where pass_token = trim(p_pass_token) for update;
  if not found then
    raise exception 'Carte introuvable / Card pass not found';
  end if;

  if not public.is_staff(v_m.business_id) then
    raise exception 'Non autorisé / Unauthorized';
  end if;

  if v_m.rewards_available < 1 then
    raise exception 'Aucune récompense disponible pour cette carte / No rewards ready to claim';
  end if;

  v_rewards_before := v_m.rewards_available;

  -- Deduct 1 reward
  update public.memberships set
    rewards_available = rewards_available - 1
  where id = v_m.id
  returning * into v_m;

  -- Record audit event
  insert into public.loyalty_events (
    membership_id,
    business_id,
    branch_id,
    staff_id,
    kind,
    quantity,
    items_count,
    stamps_before,
    stamps_after,
    rewards_before,
    rewards_after,
    idempotency_key
  ) values (
    v_m.id,
    v_m.business_id,
    p_branch_id,
    auth.uid(),
    'redeem',
    1,
    1,
    v_m.stamps,
    v_m.stamps,
    v_rewards_before,
    v_m.rewards_available,
    p_idempotency_key
  ) returning id into v_event_id;

  return jsonb_build_object(
    'success', true,
    'event_id', v_event_id,
    'customer_name', v_m.first_name,
    'stamps', v_m.stamps,
    'rewards_available', v_m.rewards_available
  );
end $$;

-- 6E. Manager/Admin Reversal of Transaction with Preserved Audit Reason
create or replace function public.manager_reverse_transaction(
  p_event_id uuid,
  p_reason text
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_orig public.loyalty_events%rowtype;
  v_m public.memberships%rowtype;
  v_biz public.businesses%rowtype;
  v_reversal_id uuid;
  v_clean_reason text := trim(p_reason);
begin
  if auth.uid() is null then
    raise exception 'Non authentifié / Not authenticated';
  end if;

  if length(v_clean_reason) < 3 then
    raise exception 'Un motif de correction valide est requis (min 3 caractères) / Reason required';
  end if;

  -- Fetch original event
  select * into v_orig from public.loyalty_events where id = p_event_id;
  if not found then
    raise exception 'Transaction introuvable / Transaction not found';
  end if;

  if v_orig.kind = 'reversal' then
    raise exception 'Impossible d''annuler une annulation / Cannot reverse a reversal';
  end if;

  -- Check if already reversed
  if exists (select 1 from public.loyalty_events where reversed_event_id = p_event_id) then
    raise exception 'Cette transaction a déjà été annulée / Transaction already reversed';
  end if;

  -- Only manager, owner, or platform admin can reverse
  if not public.is_business_admin(v_orig.business_id) then
    raise exception 'Seuls les gérants et propriétaires peuvent annuler une transaction / Manager authorization required';
  end if;

  select * into v_m from public.memberships where id = v_orig.membership_id for update;
  select * into v_biz from public.businesses where id = v_orig.business_id;

  -- Revert changes based on event kind
  if v_orig.kind = 'stamp' then
    -- Revert stamp & rewards added
    update public.memberships set
      stamps = v_orig.stamps_before,
      rewards_available = v_orig.rewards_before,
      total_visits = greatest(0, total_visits - 1),
      total_stamps_earned = greatest(0, total_stamps_earned - v_orig.quantity)
    where id = v_m.id
    returning * into v_m;
  elsif v_orig.kind = 'redeem' then
    -- Restore redeemed reward
    update public.memberships set
      rewards_available = rewards_available + 1
    where id = v_m.id
    returning * into v_m;
  end if;

  -- Record reversal audit event preserving original ID and reason
  insert into public.loyalty_events (
    membership_id,
    business_id,
    branch_id,
    staff_id,
    kind,
    quantity,
    items_count,
    stamps_before,
    stamps_after,
    rewards_before,
    rewards_after,
    reversed_event_id,
    reversal_reason
  ) values (
    v_m.id,
    v_orig.business_id,
    v_orig.branch_id,
    auth.uid(),
    'reversal',
    v_orig.quantity,
    v_orig.items_count,
    v_orig.stamps_after,
    v_m.stamps,
    v_orig.rewards_after,
    v_m.rewards_available,
    v_orig.id,
    v_clean_reason
  ) returning id into v_reversal_id;

  return jsonb_build_object(
    'success', true,
    'reversal_id', v_reversal_id,
    'original_event_id', v_orig.id,
    'stamps', v_m.stamps,
    'rewards_available', v_m.rewards_available
  );
end $$;

-- Grants
revoke all on function public.join_cafe_customer(text, text, text, text, boolean, text) from public, anon;
grant execute on function public.join_cafe_customer(text, text, text, text, boolean, text) to public, anon, authenticated;

revoke all on function public.get_customer_pass_by_token(text) from public, anon;
grant execute on function public.get_customer_pass_by_token(text) to public, anon, authenticated;

revoke all on function public.cashier_award_stamps(text, int, uuid, text) from public, anon;
grant execute on function public.cashier_award_stamps(text, int, uuid, text) to authenticated;

revoke all on function public.cashier_redeem_reward(text, uuid, text) from public, anon;
grant execute on function public.cashier_redeem_reward(text, uuid, text) to authenticated;

revoke all on function public.manager_reverse_transaction(uuid, text) from public, anon;
grant execute on function public.manager_reverse_transaction(uuid, text) to authenticated;

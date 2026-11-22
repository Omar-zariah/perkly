-- ==============================================================================
-- Migration: Add Multi-Role Support (admin, manager, staff, cashier) & Platform Superadmins
-- Run this in your Supabase SQL Editor: https://supabase.com/dashboard/project/hcxtgxwwybvpklccssxm/sql/new
-- ==============================================================================

-- 1. Expand the allowed roles on business_staff to include 'admin', 'manager', 'staff', 'cashier'
alter table public.business_staff 
  drop constraint if exists business_staff_role_check;

alter table public.business_staff 
  add constraint business_staff_role_check 
  check (role in ('owner', 'admin', 'manager', 'staff', 'cashier'));

-- 2. Create Platform Superadmins table (system-wide global admins)
create table if not exists public.platform_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'superadmin' check(role in ('superadmin', 'support')),
  created_at timestamptz not null default now()
);

alter table public.platform_admins enable row level security;

-- Superadmins can view the platform admins table
create policy "superadmins read platform_admins" 
  on public.platform_admins 
  for select 
  to authenticated 
  using (user_id = (select auth.uid()));

-- 3. Helper: Check if current user is a platform superadmin
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.platform_admins 
    where user_id = (select auth.uid())
  );
$$;

revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

-- 4. Helper: Enhanced is_staff (true if user has any business role or is platform admin)
create or replace function public.is_staff(p_business uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.business_staff 
    where business_id = p_business 
      and user_id = (select auth.uid())
  ) or exists (
    select 1 from public.platform_admins 
    where user_id = (select auth.uid())
  );
$$;

-- 5. Helper: Check if user is a business manager, admin, or owner
create or replace function public.is_business_admin(p_business uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.business_staff 
    where business_id = p_business 
      and user_id = (select auth.uid())
      and role in ('owner', 'admin', 'manager')
  ) or exists (
    select 1 from public.platform_admins 
    where user_id = (select auth.uid())
  );
$$;

revoke all on function public.is_business_admin(uuid) from public, anon;
grant execute on function public.is_business_admin(uuid) to authenticated;

-- 6. RPC: Add or update staff/admin role by email
create or replace function public.add_business_staff(p_business uuid, p_email text, p_role text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_target_user_id uuid;
  v_normalized_role text := lower(trim(p_role));
begin
  -- Permission check: only owner, admin, or platform superadmin can manage staff
  if auth.uid() is null or not public.is_business_admin(p_business) then
    raise exception 'Not authorized to manage staff for this business';
  end if;

  -- Validate role name
  if v_normalized_role not in ('admin', 'manager', 'staff', 'cashier') then
    raise exception 'Invalid role. Choose from: admin, manager, staff, cashier';
  end if;

  -- Look up target user by email in auth.users
  select id into v_target_user_id 
  from auth.users 
  where lower(email) = lower(trim(p_email));

  if v_target_user_id is null then
    raise exception 'No user found with email "%"', p_email;
  end if;

  -- Insert or update role
  insert into public.business_staff(business_id, user_id, role)
  values (p_business, v_target_user_id, v_normalized_role)
  on conflict (business_id, user_id) 
  do update set role = excluded.role;

  return jsonb_build_object(
    'success', true, 
    'user_id', v_target_user_id, 
    'role', v_normalized_role
  );
end $$;

-- 7. RPC: List all staff for a business with emails
create or replace function public.get_business_staff(p_business uuid)
returns table(user_id uuid, email text, role text) 
language sql stable security definer set search_path = '' as $$
  select s.user_id, u.email::text, s.role
  from public.business_staff s
  join auth.users u on u.id = s.user_id
  where s.business_id = p_business
    and (public.is_staff(p_business) or public.is_admin());
$$;

-- 8. RPC: Remove staff member
create or replace function public.remove_business_staff(p_business uuid, p_user_id uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or not public.is_business_admin(p_business) then
    raise exception 'Not authorized';
  end if;

  -- Cannot remove the business owner
  if exists (select 1 from public.businesses where id = p_business and owner_id = p_user_id) then
    raise exception 'Cannot remove the primary business owner';
  end if;

  delete from public.business_staff 
  where business_id = p_business and user_id = p_user_id;

  return true;
end $$;

-- 9. RPC: Grant Platform Superadmin by email
create or replace function public.make_platform_admin(p_email text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid;
begin
  select id into v_uid from auth.users where lower(email) = lower(trim(p_email));
  if v_uid is null then
    raise exception 'User with email "%" not found', p_email;
  end if;

  insert into public.platform_admins(user_id, role)
  values (v_uid, 'superadmin')
  on conflict (user_id) do nothing;

  return true;
end $$;

-- Permissions grant
revoke all on function public.add_business_staff(uuid, text, text) from public, anon;
grant execute on function public.add_business_staff(uuid, text, text) to authenticated;

revoke all on function public.get_business_staff(uuid) from public, anon;
grant execute on function public.get_business_staff(uuid) to authenticated;

revoke all on function public.remove_business_staff(uuid, uuid) from public, anon;
grant execute on function public.remove_business_staff(uuid, uuid) to authenticated;

revoke all on function public.make_platform_admin(text) from public, anon;
grant execute on function public.make_platform_admin(text) to authenticated;

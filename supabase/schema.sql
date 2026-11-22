-- Run once in Supabase SQL Editor. All sensitive mutations go through authenticated RPCs.
create extension if not exists pgcrypto;
create table public.businesses (
 id uuid primary key default gen_random_uuid(),name text not null check(length(name) between 2 and 100),slug text not null unique,
 owner_id uuid not null references auth.users(id),stamps_required int not null default 10 check(stamps_required between 2 and 30),
 reward_name text not null default 'Free reward',stripe_customer_id text unique, stripe_subscription_id text unique,
 plan text not null default 'free' check(plan in ('free','growth')),subscription_status text not null default 'inactive',created_at timestamptz not null default now()
);
create table public.business_staff (
 business_id uuid not null references public.businesses(id) on delete cascade,user_id uuid not null references auth.users(id) on delete cascade,
 role text not null check(role in ('owner','staff')),primary key(business_id,user_id)
);
create table public.memberships (
 id uuid primary key default gen_random_uuid(), business_id uuid not null references public.businesses(id) on delete cascade,
 customer_id uuid not null references auth.users(id) on delete cascade,stamps int not null default 0 check(stamps>=0),
 total_visits int not null default 0 check(total_visits>=0),rewards_available int not null default 0 check(rewards_available>=0),
 marketing_opt_in boolean not null default false,created_at timestamptz not null default now(),
 unique(business_id,customer_id),unique(id,business_id)
);
create table public.loyalty_events (
 id uuid primary key default gen_random_uuid(),membership_id uuid not null references public.memberships(id) on delete cascade,
 business_id uuid not null references public.businesses(id) on delete cascade,staff_id uuid not null references auth.users(id),
 kind text not null check(kind in ('stamp','redeem')),created_at timestamptz not null default now()
);
create table public.notification_logs (
 id uuid primary key default gen_random_uuid(), business_id uuid not null references public.businesses(id) on delete cascade,
 membership_id uuid not null references public.memberships(id) on delete cascade, subject text not null,status text not null,
 sent_at timestamptz not null default now()
);
create table public.stripe_events (id text primary key,received_at timestamptz not null default now());
create index on public.business_staff(user_id);
create index on public.memberships(customer_id);
create index on public.memberships(business_id);
create index on public.loyalty_events(business_id,created_at desc);
create index on public.notification_logs(business_id,sent_at desc);

-- Trusted lookup helper bypasses policy recursion; never exposed as a table write.
create or replace function public.is_staff(p_business uuid)
returns boolean language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.business_staff where business_id=p_business and user_id=(select auth.uid()))
$$;
revoke all on function public.is_staff(uuid) from public,anon;
grant execute on function public.is_staff(uuid) to authenticated;

alter table public.businesses enable row level security;
alter table public.business_staff enable row level security;
alter table public.memberships enable row level security;
alter table public.loyalty_events enable row level security;
alter table public.notification_logs enable row level security;
alter table public.stripe_events enable row level security;
create policy "business public catalog" on public.businesses for select to authenticated using(true);
create policy "staff see staff" on public.business_staff for select to authenticated using(public.is_staff(business_id));
create policy "customer or staff read memberships" on public.memberships for select to authenticated using(customer_id=(select auth.uid()) or public.is_staff(business_id));
create policy "staff see events" on public.loyalty_events for select to authenticated using(public.is_staff(business_id));
create policy "staff see notification activity" on public.notification_logs for select to authenticated using(public.is_staff(business_id));
-- No direct writes granted by RLS. RPCs enforce tenant access and checks.

create or replace function public.create_business(p_name text,p_slug text,p_reward text,p_required int)
returns uuid language plpgsql security definer set search_path='' as $$
declare v_id uuid;
begin
 if auth.uid() is null then raise exception 'Not authenticated';end if;
 if length(trim(p_name)) not between 2 and 100 or p_slug !~ '^[a-z0-9-]{3,40}$'
 or p_required not between 2 and 30 or length(trim(p_reward)) not between 2 and 100 then raise exception 'Invalid business information';end if;
 insert into public.businesses(name,slug,owner_id,stamps_required,reward_name) values(trim(p_name),p_slug,auth.uid(),p_required,trim(p_reward)) returning id into v_id;
 insert into public.business_staff(business_id,user_id,role) values(v_id,auth.uid(),'owner');
 return v_id;
end $$;

create or replace function public.join_business(p_business uuid,p_opt_in boolean default false)
returns uuid language plpgsql security definer set search_path='' as $$
declare v_id uuid;
begin
 if auth.uid() is null then raise exception 'Not authenticated';end if;
 if not exists(select 1 from public.businesses where id=p_business) then raise exception 'Business not found';end if;
 insert into public.memberships(business_id,customer_id,marketing_opt_in) values(p_business,auth.uid(),coalesce(p_opt_in,false))
 on conflict(business_id,customer_id) do update set marketing_opt_in=excluded.marketing_opt_in
 returning id into v_id;
 return v_id;
end $$;

create or replace function public.award_stamp(p_business uuid,p_membership uuid)
returns table(stamps int,total_visits int,rewards_available int) language plpgsql security definer set search_path='' as $$
declare v_m public.memberships%rowtype;v_required int;v_active boolean;v_last timestamptz;
begin
 if auth.uid() is null or not public.is_staff(p_business) then raise exception 'Not authorized';end if;
 select stamps_required, (subscription_status in ('active','trialing') or plan='free') into v_required,v_active from public.businesses where id=p_business;
 if v_required is null or not v_active then raise exception 'Subscription inactive';end if;
 select * into v_m from public.memberships where id=p_membership and business_id=p_business for update;
 if not found then raise exception 'Card not in this business';end if;
 select max(created_at) into v_last from public.loyalty_events where membership_id=p_membership and kind='stamp';
 if v_last > now()-interval '60 seconds' then raise exception 'Please wait 60 seconds between stamps';end if;
 update public.memberships m set total_visits=m.total_visits+1,
 stamps=(m.stamps+1)%v_required,
 rewards_available=m.rewards_available+case when m.stamps+1>=v_required then 1 else 0 end
 where m.id=p_membership returning m.* into v_m;
 insert into public.loyalty_events(membership_id,business_id,staff_id,kind) values(p_membership,p_business,auth.uid(),'stamp');
 return query select v_m.stamps,v_m.total_visits,v_m.rewards_available;
end $$;

create or replace function public.redeem_reward(p_business uuid,p_membership uuid)
returns int language plpgsql security definer set search_path='' as $$
declare v_remaining int;
begin
 if auth.uid() is null or not public.is_staff(p_business) then raise exception 'Not authorized';end if;
 update public.memberships set rewards_available=rewards_available-1 where id=p_membership and business_id=p_business and rewards_available>0
 returning rewards_available into v_remaining;
 if not found then raise exception 'No available rewards for this card';end if;
 insert into public.loyalty_events(membership_id,business_id,staff_id,kind) values(p_membership,p_business,auth.uid(),'redeem');
 return v_remaining;
end $$;
revoke all on function public.create_business(text,text,text,int), public.join_business(uuid,boolean), public.award_stamp(uuid,uuid), public.redeem_reward(uuid,uuid) from public,anon;
grant execute on function public.create_business(text,text,text,int), public.join_business(uuid,boolean), public.award_stamp(uuid,uuid), public.redeem_reward(uuid,uuid) to authenticated;

-- Let a customer withdraw promotional email consent at any time.
create or replace function public.set_marketing_preference(p_membership uuid,p_opt_in boolean)
returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Not authenticated';end if;
 update public.memberships set marketing_opt_in=coalesce(p_opt_in,false)
 where id=p_membership and customer_id=auth.uid();
 if not found then raise exception 'Membership not found';end if;
end $$;
revoke all on function public.set_marketing_preference(uuid,boolean) from public,anon;
grant execute on function public.set_marketing_preference(uuid,boolean) to authenticated;

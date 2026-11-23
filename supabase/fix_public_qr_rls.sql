-- ==============================================================================
-- Fix Public RLS Policy for Counter QR Code Scan
-- ==============================================================================
-- When a customer scans the café counter QR code or taps the NFC tag, they are
-- not logged in (role: 'anon'). They must be permitted to read the café's public
-- branding (name, slug, logo, brand colors, reward sentence).
--
-- Run this in the Supabase SQL Editor:
-- ==============================================================================

alter table public.businesses enable row level security;
drop policy if exists "business public catalog" on public.businesses;
drop policy if exists "businesses public read" on public.businesses;
create policy "businesses public read" on public.businesses for select to public using (true);

alter table public.branches enable row level security;
drop policy if exists "branches public read" on public.branches;
create policy "branches public read" on public.branches for select to public using (true);

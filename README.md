# Perkly — multi-tenant digital loyalty SaaS starter

A runnable **MVP development starter**, not yet a production-certified application.

## Features shipped
- Landing page with responsive design
- Supabase email/password signup, login, verification and SSR authentication
- Business creation with isolation by tenant
- Business owner/staff membership table and tenant-checked RLS
- Customer wallet with QR-coded memberships and opt-in enrollment
- Merchant QR scanning (camera on HTTPS/localhost), manual fallback, stamps and reward redemption
- Atomic database loyalty operations; double-scan cooldown (60 seconds)
- Stripe subscription checkout, customer portal, verified webhook, local subscription state
- Owner-only promotional email campaigns via Resend, marketing opt-in and 24h campaign cooldown
- Simple merchant stats dashboard

## Setup (roughly 15 minutes with accounts already prepared)
1. Install Node.js 22 or later and run `npm install` in this folder.
2. Create a Supabase project. In **SQL Editor**, execute `supabase/schema.sql` once.
3. Copy `.env.example` to `.env.local`. Fill in your Supabase project URL, publishable/anon key, and server-only service role key. **Never expose service key in browser, client bundles, or Git.**
4. In Supabase Auth > URL Configuration, set Site URL to `http://localhost:3000` and redirect allow-list to `http://localhost:3000/auth/callback` (plus production equivalent). Enable email auth. Configure your SMTP for real deployment.
5. Run `npm run dev`; open http://localhost:3000. Create an account, confirm email if required, and create a business from `/dashboard`.
6. Open `/wallet` using a customer account, enroll in that business, tap Show QR card. Using a merchant account at `/merchant/{id}`, scan it or paste the card code. Award stamps or redeem rewards.
7. Optional payments: in Stripe, create a monthly recurring price and copy its `price_...` to `STRIPE_PRICE_GROWTH`. Configure webhook endpoint `/api/billing/webhook` for `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`. For local forwarding: `stripe listen --forward-to localhost:3000/api/billing/webhook` and copy the shown webhook secret. Enable Stripe Customer Portal.
8. Optional marketing emails: verify a sender domain in Resend and set `RESEND_API_KEY` and `NOTIFICATION_FROM_EMAIL`. Send campaigns only from an active Growth subscription, to customers who have expressly opted in.
9. Before deployment, set `NEXT_PUBLIC_APP_URL` to your full HTTPS domain; configure matching Supabase redirect URLs and production Stripe webhook and secrets. Deploy to Vercel or any Node.js Next.js host.

## Architecture
```
Browser (Next.js App Router, server pages + client actions)
   |-- Supabase Auth (cookies + email/password)
   |-- Next.js APIs (authenticated routes)
   |       |-- PostgreSQL via Supabase authenticated RPC
   |       |-- Stripe checkout + portal
   |       |-- Stripe signed webhook -> service role updates
   |       `-- Resend REST API -> opted-in campaign email
   `-- Supabase Postgres with RLS
           businesses <- business_staff (many-to-many roles)
           businesses <- memberships -> auth.users
           memberships <- loyalty_events
           memberships <- notification_logs
```

## Important limitations before production
- **No free-plan capacity caps yet**: add limits (locations, customers, campaign recipients) as business rules, not just UI restrictions.
- **Staff invitation and role management not built**: table exists; implement verified invitations; never grant roles through client-side insert.
- **Customers can opt out through their authenticated wallet, but a one-click unsubscribe link in emails and unsubscribe compliance handling should be added before real promotional campaigns.
- QR value contains membership UUID, not a signed/rotating credential. Treat as *identification only*, not proof of purchase. Staff must verify purchase in the real world. For stronger security, rotate tokens and link to POS transactions.
- The 60-second cooldown is a basic anti-duplicate safeguard, not a comprehensive fraud system.
- Email campaign is synchronous and capped at 100 members; production should use background queue, idempotent dispatches, retry rules, bounce handling and provider webhooks.
- Webhook processing records events but does not lock event ID before updates. Add transactional inbox processing for robust concurrent delivery handling.
- Business analytics shown for latest 1,000 events; production reporting needs accurate aggregate queries.
- Add rate limiting per IP/account, CSRF/origin controls for state-changing routes, audit logs, tests, privacy retention, GDPR compliance, exports/deletion requests, and privacy policy.
- Ensure required approvals and tax setup before accepting subscription payments. Verify Stripe supports your operating company location.
- No push notifications/SMS/WhatsApp, appointment booking, advanced CRM, multi-location org, custom domains or Apple/Google Wallet pass provisioning in this MVP. These are roadmap items.

## Recommended roadmap
1. Customer opt-out management; POS-integrated visit proof; staff invitation/authentication; unit/integration tests.
2. Multi-location organizations and subscription entitlements; async campaigns; consolidated reporting.
3. Wallet pass issuance and pass updates; push opt-ins; customer referral links; segmentation.
4. Platform admin portal; billing dunning, invoices, VAT and privacy admin; self-service onboarding.
# perkly

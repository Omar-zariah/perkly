import { supabaseAdmin } from '@/lib/supabase';
import CounterSignupForm from '@/components/CounterSignupForm';
import Link from 'next/link';

interface PageProps {
  params: Promise<{ businessSlug: string; branchSlug: string }>;
}

export default async function BranchSignupPage({ params }: PageProps) {
  const { businessSlug, branchSlug } = await params;
  const admin = supabaseAdmin();
  const rawBizSlug = decodeURIComponent(businessSlug).trim();
  const rawBranchSlug = decodeURIComponent(branchSlug).trim();

  const isBizUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rawBizSlug);

  let bizQuery = admin
    .from('businesses')
    .select('id, name, slug, logo_url, primary_color, accent_color, stamps_required, reward_name, offer_sentence_fr, offer_sentence_ar');

  if (isBizUuid) {
    bizQuery = bizQuery.eq('id', rawBizSlug);
  } else {
    bizQuery = bizQuery.ilike('slug', rawBizSlug);
  }

  const { data: business, error: bizErr } = await bizQuery.maybeSingle();

  if (bizErr) {
    console.error('Error fetching business:', rawBizSlug, bizErr);
  }

  if (!business) {
    return (
      <main style={{ minHeight: '100dvh', background: '#163f2c', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <div style={{ maxWidth: 420, width: '100%', background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 24, padding: 32, textAlign: 'center', color: '#fff' }}>
          <h2 style={{ margin: '0 0 10px' }}>Établissement introuvable</h2>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, margin: '0 0 20px', lineHeight: 1.5 }}>
            Le café <b>« {rawBizSlug} »</b> n'existe pas.
          </p>
          <Link href="/wallet" className="btn tiny" style={{ background: '#d1f36a', color: '#163f2c', fontWeight: 800 }}>
            Découvrir les cafés partenaires
          </Link>
        </div>
      </main>
    );
  }

  const isBranchUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rawBranchSlug);

  let branchQuery = admin
    .from('branches')
    .select('id, name, slug')
    .eq('business_id', business.id);

  if (isBranchUuid) {
    branchQuery = branchQuery.eq('id', rawBranchSlug);
  } else {
    branchQuery = branchQuery.ilike('slug', rawBranchSlug);
  }

  const { data: branch } = await branchQuery.maybeSingle();

  return (
    <main style={{ minHeight: '100dvh', background: business.primary_color || '#163f2c' }}>
      <CounterSignupForm business={business} branch={branch || undefined} />
    </main>
  );
}

import { supabaseAdmin } from '@/lib/supabase';
import CounterSignupForm from '@/components/CounterSignupForm';
import Link from 'next/link';

interface PageProps {
  params: Promise<{ businessSlug: string }>;
}

export default async function CounterSignupPage({ params }: PageProps) {
  const { businessSlug } = await params;
  const admin = supabaseAdmin();
  const rawSlug = decodeURIComponent(businessSlug).trim();

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rawSlug);

  let query = admin
    .from('businesses')
    .select('id, name, slug, logo_url, primary_color, accent_color, stamps_required, reward_name, offer_sentence_fr, offer_sentence_ar');

  if (isUuid) {
    query = query.eq('id', rawSlug);
  } else {
    query = query.ilike('slug', rawSlug);
  }

  const { data: business, error } = await query.maybeSingle();

  if (error) {
    console.error('Error fetching business for counter page:', rawSlug, error);
  }

  if (!business) {
    return (
      <main style={{ minHeight: '100dvh', background: '#163f2c', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <div style={{ maxWidth: 420, width: '100%', background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 24, padding: 32, textAlign: 'center', color: '#fff' }}>
          <h2 style={{ margin: '0 0 10px' }}>Établissement introuvable</h2>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, margin: '0 0 20px', lineHeight: 1.5 }}>
            Le café <b>« {rawSlug} »</b> n'existe pas ou n'a pas encore configuré sa page de fidélité.
          </p>
          <Link href="/wallet" className="btn tiny" style={{ background: '#d1f36a', color: '#163f2c', fontWeight: 800 }}>
            Découvrir les cafés partenaires
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main style={{ minHeight: '100dvh', background: business.primary_color || '#163f2c' }}>
      <CounterSignupForm business={business} />
    </main>
  );
}

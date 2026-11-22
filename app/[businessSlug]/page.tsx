import { supabaseAdmin } from '@/lib/supabase';
import CounterSignupForm from '@/components/CounterSignupForm';
import { notFound } from 'next/navigation';

interface PageProps {
  params: Promise<{ businessSlug: string }>;
}

export default async function CounterSignupPage({ params }: PageProps) {
  const { businessSlug } = await params;
  const admin = supabaseAdmin();

  const { data: business } = await admin
    .from('businesses')
    .select('id, name, slug, logo_url, primary_color, accent_color, stamps_required, reward_name, offer_sentence_fr, offer_sentence_ar')
    .eq('slug', businessSlug)
    .single();

  if (!business) notFound();

  return (
    <main style={{ minHeight: '100dvh', background: business.primary_color || '#163f2c' }}>
      <CounterSignupForm business={business} />
    </main>
  );
}

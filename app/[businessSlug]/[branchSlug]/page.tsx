import { supabaseAdmin } from '@/lib/supabase';
import CounterSignupForm from '@/components/CounterSignupForm';
import { notFound } from 'next/navigation';

interface PageProps {
  params: Promise<{ businessSlug: string; branchSlug: string }>;
}

export default async function BranchSignupPage({ params }: PageProps) {
  const { businessSlug, branchSlug } = await params;
  const admin = supabaseAdmin();

  const { data: business } = await admin
    .from('businesses')
    .select('id, name, slug, logo_url, primary_color, accent_color, stamps_required, reward_name, offer_sentence_fr, offer_sentence_ar')
    .eq('slug', businessSlug)
    .single();

  if (!business) notFound();

  const { data: branch } = await admin
    .from('branches')
    .select('id, name, slug')
    .eq('business_id', business.id)
    .eq('slug', branchSlug)
    .single();

  if (!branch) notFound();

  return (
    <main style={{ minHeight: '100dvh', background: business.primary_color || '#163f2c' }}>
      <CounterSignupForm business={business} branch={branch} />
    </main>
  );
}

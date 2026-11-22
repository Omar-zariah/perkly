import { supabaseAdmin } from '@/lib/supabase';
import PassCard from '@/components/PassCard';
import { notFound } from 'next/navigation';

interface PageProps {
  params: Promise<{ token: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { token } = await params;
  const admin = supabaseAdmin();
  const { data } = await admin.rpc('get_customer_pass_by_token', { p_pass_token: token });
  if (!data) return { title: 'Carte de fidélité | Perkly' };
  const pass = data as PassData;
  return {
    title: `${pass.first_name || 'Ma carte'} · ${pass.business_name} | Perkly`,
    description: `Carte de fidélité ${pass.business_name} — ${pass.stamps}/${pass.stamps_required} tampons`,
  };
}

interface PassData {
  membership_id: string;
  pass_token: string;
  first_name: string | null;
  stamps: number;
  stamps_required: number;
  rewards_available: number;
  total_stamps_earned: number;
  preferred_language: 'fr' | 'ar';
  business_id: string;
  business_name: string;
  reward_name: string;
  primary_color: string | null;
  accent_color: string | null;
  logo_url: string | null;
  offer_sentence_fr: string | null;
  offer_sentence_ar: string | null;
  branch_name: string | null;
}

export default async function PassPage({ params }: PageProps) {
  const { token } = await params;
  const admin = supabaseAdmin();

  const { data, error } = await admin.rpc('get_customer_pass_by_token', { p_pass_token: token });
  if (error || !data) notFound();

  const pass = data as PassData;

  return (
    <main style={{ minHeight: '100dvh', background: pass.primary_color || '#163f2c', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <PassCard pass={pass} />
    </main>
  );
}

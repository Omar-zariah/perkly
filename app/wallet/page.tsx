import { redirect } from 'next/navigation';
import { getUser, supabaseServer } from '@/lib/supabase';
import CustomerCard from '@/components/CustomerCard';
import JoinBusiness from '@/components/JoinBusiness';
import { Sparkles, Wallet as WalletIcon, Store } from 'lucide-react';

export default async function Wallet({
  searchParams
}: {
  searchParams: Promise<{ join?: string }>
}) {
  const user = await getUser();
  if (!user) redirect('/login');
  const db = await supabaseServer();

  const { data: cards } = await db
    .from('memberships')
    .select('id,stamps,rewards_available,total_visits,marketing_opt_in,business_id,businesses(name,reward_name,stamps_required)')
    .eq('customer_id', user.id)
    .order('created_at', { ascending: false });

  const { data: businesses } = await db
    .from('businesses')
    .select('id,name,reward_name,stamps_required')
    .order('name')
    .limit(100);

  const p = await searchParams;
  const availableToJoin = (businesses || []).filter(
    b => !(cards || []).some(c => c.business_id === b.id)
  );

  return (
    <div className="wrap">
      {/* Header */}
      <div className="pagehead">
        <div>
          <div className="eyebrow" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Sparkles size={14} /> Your Digital Pocket Pass
          </div>
          <h1>My Loyalty Wallet</h1>
          <p className="muted">
            Tap a card to view your live stamp progress, or flip to your scannable pass at checkout.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <span className="pill" style={{ padding: '8px 14px', fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <WalletIcon size={14} /> {cards?.length || 0} Active Pass{(cards?.length || 0) === 1 ? '' : 'es'}
          </span>
        </div>
      </div>

      {/* Cards Grid */}
      {cards && cards.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 24, marginBottom: 40 }}>
          {cards.map((card: any) => (
            <CustomerCard key={card.id} card={card} />
          ))}
        </div>
      ) : (
        <div
          className="panel"
          style={{
            textAlign: 'center',
            padding: '50px 20px',
            borderRadius: 24,
            background: '#ffffff',
            boxShadow: '0 4px 20px rgba(0,0,0,0.03)'
          }}
        >
          <div style={{ width: 56, height: 56, borderRadius: 20, background: '#eaf4eb', color: '#1f5b3a', display: 'grid', placeItems: 'center', margin: '0 auto 16px' }}>
            <Store size={28} />
          </div>
          <h3 style={{ fontSize: 20, margin: '0 0 8px' }}>Your wallet is currently empty</h3>
          <p className="muted" style={{ maxWidth: 420, margin: '0 auto 20px', fontSize: 14 }}>
            Join a participating business below to get your first digital stamp card and start unlocking rewards.
          </p>
        </div>
      )}

      {/* Discover / Join Businesses */}
      <div style={{ marginTop: 50 }}>
        <div className="pagehead" style={{ marginBottom: 18 }}>
          <div>
            <div className="eyebrow">Discover Nearby Places</div>
            <h2 style={{ margin: '6px 0 0', fontSize: 28, letterSpacing: '-1px' }}>Available Loyalty Clubs</h2>
          </div>
        </div>

        {availableToJoin.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 18 }}>
            {availableToJoin.map(b => (
              <div
                className="panel"
                key={b.id}
                style={{
                  borderRadius: 20,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  border: '1px solid #e5ede6',
                  transition: 'transform 0.2s ease',
                  padding: 22
                }}
              >
                <div>
                  <div className="pill" style={{ fontSize: 10, padding: '3px 8px' }}>Active Club</div>
                  <h3 style={{ marginTop: 12, marginBottom: 6, fontSize: 18 }}>{b.name}</h3>
                  <p className="small muted" style={{ margin: '0 0 16px' }}>
                    Collect <b>{b.stamps_required} stamps</b> to earn <b>{b.reward_name}</b>.
                  </p>
                </div>
                <JoinBusiness businessId={b.id} />
              </div>
            ))}
          </div>
        ) : (
          <div className="panel muted" style={{ borderRadius: 16 }}>
            {businesses && businesses.length > 0
              ? "You've added all available businesses to your wallet! 🎉"
              : "No businesses have registered yet. Create one from the Dashboard."}
          </div>
        )}

        {p.join && (
          <p className="small muted" style={{ marginTop: 14 }}>
            Tip: find the matching business above and tap “Add to my wallet”.
          </p>
        )}
      </div>
    </div>
  );
}

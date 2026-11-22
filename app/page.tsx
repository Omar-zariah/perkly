import Link from 'next/link';
import { 
  ArrowUpRight, 
  Gift, 
  ScanLine, 
  BellRing, 
  ChartNoAxesCombined, 
  Wallet, 
  Store, 
  Wifi, 
  Sparkles, 
  QrCode 
} from 'lucide-react';

const features = [
  { icon: ScanLine, title: 'One scan. More smiles.', desc: 'Award stamps in seconds with a secure staff scanning flow.' },
  { icon: Gift, title: 'Rewards worth returning for', desc: 'Turn repeat visits into real rewards your customers will love.' },
  { icon: BellRing, title: 'Stay top of mind', desc: 'Send opted-in customers timely offers and updates.' },
  { icon: ChartNoAxesCombined, title: 'Know your regulars', desc: 'Understand retention and loyalty activity by location.' },
  { icon: Wallet, title: 'A wallet that travels', desc: 'Customers keep all their favorite places in one wallet.' },
  { icon: Store, title: 'Made for local business', desc: 'Coffee shops, salons, restaurants, and everything between.' }
];

export default function Home() {
  return (
    <>
      <div className="wrap hero">
        <div>
          <div className="eyebrow">The new neighborhood loyalty club</div>
          <h1>
            More regulars.<br />
            Less effort.<span style={{ color: '#8eaf59' }}> ✳</span>
          </h1>
          <p>
            Digital stamp cards, effortless rewards, and meaningful customer relationships. 
            One beautiful platform with Apple & Google Wallet ready cards built for the places people love.
          </p>
          <div className="actions">
            <Link className="btn" href="/dashboard">
              Start your loyalty program <ArrowUpRight size={17} />
            </Link>
            <Link className="btn secondary" href="/wallet">
              Open Customer Wallet
            </Link>
          </div>
          <p className="small">No plastic cards. No app downloads required. Apple & Google Wallet compatible.</p>
        </div>

        {/* Hero Interactive Card Preview */}
        <div className="demo-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div className="card-chip" style={{ width: 34, height: 24 }} />
              <Wifi size={18} style={{ transform: 'rotate(90deg)', opacity: 0.8 }} />
              <b>Sunday Coffee Co.</b>
            </div>
            <span style={{ background: '#d1f36a', color: '#163f2c', padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 800 }}>
              VIP PASS
            </span>
          </div>

          <h2>Your next coffee<br />is on us ☕</h2>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 10 }}>
            <span>7 of 10 visits collected</span>
            <span style={{ color: '#d1f36a', fontWeight: 700 }}>70% completed</span>
          </div>

          <div className="stamps">
            {Array.from({ length: 10 }, (_, i) => (
              <span key={i} className={'stamp ' + (i < 7 ? 'on' : '')} style={i === 9 ? { borderColor: '#ffd700', color: '#ffd700' } : {}}>
                {i < 7 ? '✓' : i === 9 ? '🎁' : i + 1}
              </span>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 24, flexWrap: 'wrap' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(0,0,0,0.3)', padding: '6px 12px', borderRadius: 10, fontSize: 11 }}>
              <QrCode size={13} /> Scannable QR Pass
            </div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(0,0,0,0.3)', padding: '6px 12px', borderRadius: 10, fontSize: 11 }}>
              <Sparkles size={13} color="#d1f36a" /> Instant Rewards
            </div>
          </div>
        </div>
      </div>

      <section className="wrap" style={{ paddingTop: 10 }}>
        <div className="eyebrow">Everything in one place</div>
        <h2 className="section-title">Small business. Big loyalty energy.</h2>
        <div className="grid">
          {features.map(({ icon: Icon, title, desc }) => (
            <div className="panel" key={title}>
              <span style={{ color: '#488258' }}>
                <Icon size={25} />
              </span>
              <h3 style={{ marginTop: 18 }}>{title}</h3>
              <p className="muted small" style={{ lineHeight: 1.7 }}>
                {desc}
              </p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

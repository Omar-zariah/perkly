'use client';
import { QRCodeSVG } from 'qrcode.react';
import { useState, useEffect } from 'react';
import { translations, type Locale } from '@/lib/i18n';
import {
  Check, Gift, QrCode, Wifi, Sparkles, RotateCw, Smartphone, X,
  Coffee, MessageCircle, Send, Download, Globe, RefreshCw, Copy
} from 'lucide-react';

interface PassData {
  membership_id: string;
  pass_token: string;
  first_name: string | null;
  stamps: number;
  stamps_required: number;
  rewards_available: number;
  total_stamps_earned: number;
  preferred_language: 'fr' | 'ar';
  business_name: string;
  reward_name: string;
  primary_color: string | null;
  accent_color: string | null;
  logo_url: string | null;
  offer_sentence_fr: string | null;
  offer_sentence_ar: string | null;
  branch_name: string | null;
}

export default function PassCard({ pass }: { pass: PassData }) {
  const [locale, setLocale] = useState<Locale>(pass.preferred_language || 'fr');
  const [isFlipped, setIsFlipped] = useState(false);
  const [walletModal, setWalletModal] = useState(false);
  const [walletTab, setWalletTab] = useState<'scan' | 'pwa' | 'share'>('scan');
  const [stamps, setStamps] = useState(pass.stamps);
  const [rewards, setRewards] = useState(pass.rewards_available);
  const [copied, setCopied] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const t = translations[locale];
  const primary = pass.primary_color || '#163f2c';
  const accent = pass.accent_color || '#d1f36a';
  const stampsRequired = pass.stamps_required || 8;
  const remaining = Math.max(0, stampsRequired - stamps);
  const percent = Math.min(100, Math.round((stamps / stampsRequired) * 100));
  const passUrl = typeof window !== 'undefined' ? window.location.href : `/pass/${pass.pass_token}`;
  const qrValue = `perkly:pass:${pass.pass_token}`;

  const offerText = locale === 'ar'
    ? (pass.offer_sentence_ar || t.offerSentence(stampsRequired, pass.reward_name))
    : (pass.offer_sentence_fr || t.offerSentence(stampsRequired, pass.reward_name));

  useEffect(() => {
    document.documentElement.setAttribute('dir', t.dir);
    document.documentElement.setAttribute('lang', locale);
  }, [locale, t.dir]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('wallet') === '1' || params.get('new') === '1') {
        setWalletModal(true);
        setWalletTab('pwa');
      }
    }
  }, []);

  async function refreshBalance() {
    setRefreshing(true);
    try {
      const res = await fetch(`/api/pass/${pass.pass_token}`);
      if (res.ok) {
        const data = await res.json();
        setStamps(data.stamps ?? stamps);
        setRewards(data.rewards_available ?? rewards);
      }
    } catch { /* silent */ }
    setRefreshing(false);
  }

  function copyToken() {
    navigator.clipboard.writeText(qrValue);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  function downloadSummary() {
    const txt = `PERKLY LOYALTY PASS\n${'─'.repeat(30)}\n${pass.business_name}\n${offerText}\n\nNom: ${pass.first_name || '—'}\nTampons: ${stamps}/${stampsRequired}\nRécompenses: ${rewards}\nToken: ${qrValue}\nDate: ${new Date().toLocaleDateString('fr-MA')}\n${'─'.repeat(30)}\nPrésentez le QR au comptoir.`;
    const blob = new Blob([txt], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${pass.business_name.toLowerCase().replace(/\s+/g, '-')}-pass.txt`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <div className="pass-page-wrap" dir={t.dir}>
      {/* Language toggle */}
      <button
        type="button"
        className="lang-toggle"
        style={{ position: 'fixed', top: 16, insetInlineEnd: 16, zIndex: 100 }}
        onClick={() => setLocale(locale === 'fr' ? 'ar' : 'fr')}
      >
        <Globe size={13} />
        {locale === 'fr' ? 'العربية' : 'Français'}
      </button>

      {/* ───── FLIP CARD ───── */}
      <div className="flip-card-container">
        <div className={`flip-card-inner ${isFlipped ? 'is-flipped' : ''}`}>

          {/* FRONT */}
          <div
            className="card-front"
            style={{
              background: `linear-gradient(135deg, ${primary} 0%, ${primary}cc 50%, ${primary}99 100%)`,
              borderColor: `${accent}44`,
              boxShadow: `0 20px 50px -10px ${primary}88, 0 0 0 1px rgba(255,255,255,0.12) inset`
            }}
          >
            <div className="card-shine" />
            {/* Header */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                <div className="chip-contactless">
                  <div className="card-chip" />
                  <Wifi size={18} style={{ transform: 'rotate(90deg)', opacity: 0.7 }} />
                  <span style={{ fontSize: 10, letterSpacing: '1.5px', opacity: 0.65, fontWeight: 700 }}>PERKLY</span>
                </div>
                {rewards > 0 && (
                  <div style={{ background: 'linear-gradient(135deg,#ffd700,#ffaa00)', color: '#1a1a1a', padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 5, boxShadow: '0 0 14px rgba(255,215,0,0.5)' }}>
                    <Gift size={12} /> {rewards} {locale === 'ar' ? 'مجاناً!' : 'Offert!'}
                  </div>
                )}
              </div>

              <div style={{ marginTop: 16 }}>
                {pass.logo_url
                  ? <img src={pass.logo_url} alt={pass.business_name} style={{ width: 44, height: 44, borderRadius: 12, objectFit: 'cover', marginBottom: 8 }} />
                  : <Coffee size={28} style={{ color: accent, marginBottom: 8 }} />
                }
                <h2 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: '#fff', letterSpacing: '-0.5px' }}>{pass.business_name}</h2>
                <p style={{ margin: '3px 0 0', fontSize: 13, color: `${accent}cc` }}>
                  {pass.first_name ? `${locale === 'ar' ? 'مرحباً' : 'Bonjour'}, ${pass.first_name}` : offerText}
                </p>
                {pass.branch_name && (
                  <p style={{ margin: '3px 0 0', fontSize: 11, color: 'rgba(255,255,255,0.45)' }}>📍 {pass.branch_name}</p>
                )}
              </div>
            </div>

            {/* Punch grid */}
            <div>
              <div className="punch-grid">
                {Array.from({ length: stampsRequired }).map((_, i) => {
                  const stamped = i < stamps;
                  const isLast = i === stampsRequired - 1;
                  return (
                    <div
                      key={i}
                      className={`punch-slot ${stamped ? 'stamped' : isLast ? 'empty reward-slot' : 'empty'}`}
                      style={stamped ? { background: accent, borderColor: accent, color: primary } : { borderColor: `${accent}44` }}
                    >
                      {stamped ? <Check size={16} strokeWidth={3} /> : isLast ? <Gift size={14} style={{ color: accent }} /> : <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)' }}>{i + 1}</span>}
                    </div>
                  );
                })}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 700, marginBottom: 5, color: 'rgba(255,255,255,0.75)' }}>
                <span>{t.stampsCount(stamps, stampsRequired)}</span>
                <span style={{ color: accent }}>{remaining === 0 ? t.rewardUnlocked : t.stampsRemaining(remaining)}</span>
              </div>
              <div style={{ height: 6, background: 'rgba(255,255,255,0.15)', borderRadius: 20, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${percent}%`, background: accent, borderRadius: 20, transition: 'width 0.5s ease' }} />
              </div>
            </div>

            {/* Front actions */}
            <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
              <button type="button" className="btn tiny" style={{ flex: 1, background: accent, color: primary, fontWeight: 800, borderRadius: 12, justifyContent: 'center' }} onClick={() => setIsFlipped(true)}>
                <QrCode size={14} /> {t.flipToQr}
              </button>
              <button type="button" className="btn tiny" style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', borderRadius: 12, padding: '8px 12px' }} onClick={() => setWalletModal(true)}>
                <Smartphone size={14} />
              </button>
              <button type="button" className="btn tiny" style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', borderRadius: 12, padding: '8px 12px' }} onClick={refreshBalance} disabled={refreshing}>
                <RefreshCw size={14} className={refreshing ? 'spin' : ''} />
              </button>
            </div>
          </div>

          {/* BACK (QR) */}
          <div className="card-back">
            <div className="mag-stripe" />
            <div style={{ textAlign: 'center', marginTop: -6 }}>
              <div style={{ background: '#fff', padding: 14, borderRadius: 20, display: 'inline-block', boxShadow: '0 8px 30px rgba(0,0,0,0.5)' }}>
                <QRCodeSVG value={qrValue} size={170} level="M" />
              </div>
              <div style={{ marginTop: 10 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{pass.business_name}</span>
                <p style={{ margin: '3px 0 0', fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>{t.showToCashier}</p>
              </div>
              <button onClick={copyToken} type="button" style={{ marginTop: 8, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', borderRadius: 10, padding: '4px 10px', fontSize: 11, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                {copied ? <Check size={11} /> : <Copy size={11} />}
                {copied ? 'Copié!' : `ID: ${pass.pass_token.slice(0, 8)}…`}
              </button>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
              <button type="button" className="btn tiny" style={{ flex: 1, background: '#fff', color: '#1a1a1a', fontWeight: 800, borderRadius: 12, justifyContent: 'center' }} onClick={() => setIsFlipped(false)}>
                <RotateCw size={13} /> {t.flipToStamps}
              </button>
              <button type="button" className="btn tiny" style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', borderRadius: 12, padding: '8px 12px' }} onClick={downloadSummary}>
                <Download size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Offer pill below card */}
      <div style={{ textAlign: 'center', marginTop: 20, paddingInline: 20 }}>
        <div className="offer-pill" style={{ background: `${accent}22`, borderColor: `${accent}55`, color: accent, display: 'inline-flex' }}>
          <Gift size={13} /> {offerText}
        </div>
      </div>

      {/* Add to phone button */}
      <div style={{ textAlign: 'center', marginTop: 14 }}>
        <button className="counter-primary-btn" style={{ background: accent, color: primary, display: 'inline-flex', paddingInline: 24 }} onClick={() => setWalletModal(true)}>
          <Smartphone size={16} /> {t.addToHomeScreen}
        </button>
      </div>

      {/* Wallet Modal */}
      {walletModal && (
        <div className="pass-modal-backdrop" onClick={() => setWalletModal(false)}>
          <div className="pass-modal" onClick={e => e.stopPropagation()} dir="ltr">
            <button onClick={() => setWalletModal(false)} style={{ position: 'absolute', top: 14, right: 14, border: 0, background: 'none', cursor: 'pointer', color: '#6b7280' }}>
              <X size={20} />
            </button>
            <div style={{ width: 52, height: 52, borderRadius: 16, background: '#eaf4eb', color: '#1f5b3a', display: 'grid', placeItems: 'center', margin: '0 auto 12px' }}>
              <Smartphone size={26} />
            </div>
            <h3 style={{ margin: '0 0 4px', textAlign: 'center' }}>Ajouter à votre téléphone</h3>
            <p className="small muted" style={{ textAlign: 'center', marginBottom: 14 }}>Votre carte <b>{pass.business_name}</b> toujours avec vous</p>

            <div className="wallet-tabs">
              {(['scan', 'pwa', 'share'] as const).map(tab => (
                <button key={tab} type="button" className={`wallet-tab-btn ${walletTab === tab ? 'active' : ''}`} onClick={() => setWalletTab(tab)}>
                  {tab === 'scan' ? <>📷 Scan</> : tab === 'pwa' ? <><Smartphone size={12} /> Accueil</> : <><Send size={12} /> Partager</>}
                </button>
              ))}
            </div>

            {walletTab === 'scan' && (
              <div style={{ textAlign: 'center', padding: '8px 0 16px' }}>
                <p className="small muted" style={{ marginBottom: 10 }}>Scannez avec l'appareil photo de votre téléphone :</p>
                <div style={{ background: '#f9faf9', padding: 14, borderRadius: 18, display: 'inline-block', border: '1px solid #e5ede6' }}>
                  <QRCodeSVG value={passUrl} size={150} level="M" />
                </div>
                <p style={{ marginTop: 8, fontSize: 11, color: '#52795d', fontWeight: 600 }}>✓ Synchronisé en temps réel</p>
              </div>
            )}

            {walletTab === 'pwa' && (
              <div style={{ padding: '8px 16px 14px', background: '#f8faf8', borderRadius: 16 }}>
                <b style={{ fontSize: 13, display: 'block', marginBottom: 10 }}>Sauvegarder comme app sur mobile :</b>
                <div style={{ display: 'grid', gap: 10, fontSize: 12 }}>
                  {[
                    'Sur iPhone Safari, tapez l\'icône Partager (⎋). Sur Android Chrome, tapez le menu (⋮).',
                    'Sélectionnez "Ajouter à l\'écran d\'accueil" ou "Installer l\'app".',
                    'Votre carte vivra sur l\'écran d\'accueil comme une vraie app de wallet !'
                  ].map((text, i) => (
                    <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                      <span style={{ width: 22, height: 22, borderRadius: '50%', background: primary, color: '#fff', display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{i + 1}</span>
                      <span>{text}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {walletTab === 'share' && (
              <div style={{ display: 'grid', gap: 8, padding: '10px 0 16px' }}>
                <a href={`https://api.whatsapp.com/send?text=${encodeURIComponent(`Ma carte ${pass.business_name}: ${passUrl}`)}`} target="_blank" rel="noopener noreferrer" className="btn" style={{ background: '#25D366', color: '#fff', justifyContent: 'center' }}>
                  <MessageCircle size={16} /> Envoyer via WhatsApp
                </a>
                <a href={`sms:?body=${encodeURIComponent(`Ma carte ${pass.business_name}: ${passUrl}`)}`} className="btn secondary" style={{ justifyContent: 'center' }}>
                  <Send size={15} /> Envoyer par SMS
                </a>
              </div>
            )}

            <button className="btn" style={{ width: '100%', justifyContent: 'center', marginTop: 10 }} onClick={downloadSummary}>
              <Download size={15} /> Sauvegarder hors-ligne
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

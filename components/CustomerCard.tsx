'use client';
import { QRCodeSVG } from 'qrcode.react';
import { useState, useRef } from 'react';
import { 
  Sparkles, 
  Check, 
  Gift, 
  QrCode, 
  Wifi, 
  Share2, 
  Copy, 
  Download, 
  X,
  Smartphone,
  RotateCw,
  Send,
  MessageCircle,
  HelpCircle,
  CheckCircle2,
  ExternalLink,
  Info
} from 'lucide-react';

interface Business {
  name: string;
  reward_name: string;
  stamps_required: number;
}

interface CardData {
  id: string;
  business_id: string;
  stamps: number;
  total_visits: number;
  rewards_available: number;
  marketing_opt_in: boolean;
  businesses: Business;
}

const PALETTES = [
  {
    bg: 'linear-gradient(135deg, #0d3b26 0%, #154c33 50%, #1b6342 100%)',
    accent: '#d1f36a',
    pillBg: 'rgba(209, 243, 106, 0.18)',
    pillColor: '#d1f36a',
    border: 'rgba(209, 243, 106, 0.25)',
    name: 'Emerald Reserve'
  },
  {
    bg: 'linear-gradient(135deg, #181920 0%, #252834 50%, #323746 100%)',
    accent: '#ffd700',
    pillBg: 'rgba(255, 215, 0, 0.18)',
    pillColor: '#ffd700',
    border: 'rgba(255, 215, 0, 0.3)',
    name: 'Obsidian Black'
  },
  {
    bg: 'linear-gradient(135deg, #23193a 0%, #39245c 50%, #522f84 100%)',
    accent: '#ff90e8',
    pillBg: 'rgba(255, 144, 232, 0.18)',
    pillColor: '#ff90e8',
    border: 'rgba(255, 144, 232, 0.25)',
    name: 'Velvet Plum'
  },
  {
    bg: 'linear-gradient(135deg, #0a2540 0%, #103b66 50%, #175492 100%)',
    accent: '#64d2ff',
    pillBg: 'rgba(100, 210, 255, 0.18)',
    pillColor: '#64d2ff',
    border: 'rgba(100, 210, 255, 0.25)',
    name: 'Pacific Azure'
  },
  {
    bg: 'linear-gradient(135deg, #3d1f11 0%, #633219 50%, #8c4521 100%)',
    accent: '#ffbe76',
    pillBg: 'rgba(255, 190, 118, 0.18)',
    pillColor: '#ffbe76',
    border: 'rgba(255, 190, 118, 0.25)',
    name: 'Amber Artisan'
  }
];

function getPalette(idOrName: string) {
  let hash = 0;
  for (let i = 0; i < idOrName.length; i++) {
    hash = (hash << 5) - hash + idOrName.charCodeAt(i);
    hash |= 0;
  }
  return PALETTES[Math.abs(hash) % PALETTES.length];
}

export default function CustomerCard({ card }: { card: CardData }) {
  const [isFlipped, setIsFlipped] = useState(false);
  const [optIn, setOptIn] = useState(Boolean(card.marketing_opt_in));
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState('');
  const [walletModal, setWalletModal] = useState<'apple' | 'google' | 'phone' | null>(null);
  const [activeTab, setActiveTab] = useState<'scan' | 'pwa' | 'share'>('scan');
  const [copied, setCopied] = useState(false);

  const b = card.businesses;
  const stampsRequired = b?.stamps_required || 10;
  const currentStamps = card.stamps || 0;
  const rewardsReady = card.rewards_available || 0;
  const palette = getPalette(b?.name || card.id);
  const percentComplete = Math.min(100, Math.round((currentStamps / stampsRequired) * 100));
  const remaining = Math.max(0, stampsRequired - currentStamps);

  // Cross-device phone link: use current origin or local network IP so phone can open it
  const phoneUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/wallet` 
    : 'http://192.168.1.206:3000/wallet';

  async function updateConsent() {
    setPending(true);
    const r = await fetch('/api/preferences', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ membershipId: card.id, optIn: !optIn })
    });
    setPending(false);
    if (r.ok) {
      setOptIn(!optIn);
      setMessage('Preferences saved');
      setTimeout(() => setMessage(''), 3000);
    } else {
      setMessage('Could not save preference');
    }
  }

  function copyPassId() {
    navigator.clipboard.writeText(`perkly:member:${card.id}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  async function shareCard() {
    const shareData = {
      title: `${b?.name} Loyalty Pass`,
      text: `My ${b?.name} loyalty pass (${currentStamps}/${stampsRequired} stamps). Scan or open to view:`,
      url: phoneUrl
    };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch {
        setWalletModal('phone');
      }
    } else {
      setWalletModal('phone');
    }
  }

  function downloadPassSummary() {
    const passText = `PERKLY DIGITAL LOYALTY PASS\n--------------------------\nBusiness: ${b?.name}\nReward: ${b?.reward_name}\nProgress: ${currentStamps} / ${stampsRequired} Stamps\nRewards Ready: ${rewardsReady}\nPass Token: perkly:member:${card.id}\nCreated: ${new Date().toLocaleDateString()}\n--------------------------\nPresent QR at counter or save to phone home screen.`;
    const blob = new Blob([passText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(b?.name || 'loyalty').toLowerCase().replace(/\s+/g, '-')}-pass.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flip-card-container">
      <div className={`flip-card-inner ${isFlipped ? 'is-flipped' : ''}`}>
        
        {/* ================= FRONT OF CARD (STAMPS VIEW) ================= */}
        <div 
          className="card-front" 
          style={{ 
            background: palette.bg, 
            borderColor: palette.border,
            boxShadow: '0 20px 45px -10px rgba(13, 59, 38, 0.45), 0 0 0 1px rgba(255, 255, 255, 0.16) inset' 
          }}
        >
          <div className="card-shine" />

          {/* Header */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
              <div className="chip-contactless">
                <div className="card-chip" />
                <Wifi size={20} style={{ transform: 'rotate(90deg)', opacity: 0.8 }} />
                <span style={{ fontSize: 11, letterSpacing: '1.5px', opacity: 0.75, fontWeight: 700 }}>
                  PERKLY VIP
                </span>
              </div>
              <div 
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  background: palette.pillBg,
                  color: palette.pillColor,
                  padding: '4px 10px',
                  borderRadius: 20,
                  fontSize: 11,
                  fontWeight: 800,
                  letterSpacing: '0.5px'
                }}
              >
                <Sparkles size={13} />
                {palette.name}
              </div>
            </div>

            <div style={{ marginTop: 18, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 24, letterSpacing: '-0.8px', color: '#ffffff' }}>
                  {b?.name}
                </h2>
                <p style={{ margin: '4px 0 0', fontSize: 13, opacity: 0.9, color: '#e0ece4' }}>
                  Reward: <b>{b?.reward_name}</b>
                </p>
              </div>
              {rewardsReady > 0 && (
                <div 
                  style={{
                    background: 'linear-gradient(135deg, #ffd700, #ffaa00)',
                    color: '#1a1a1a',
                    padding: '5px 12px',
                    borderRadius: 20,
                    fontSize: 12,
                    fontWeight: 800,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    boxShadow: '0 0 16px rgba(255,215,0,0.6)'
                  }}
                >
                  <Gift size={14} />
                  {rewardsReady} Ready!
                </div>
              )}
            </div>
          </div>

          {/* Punch Slots Grid */}
          <div>
            <div className="punch-grid">
              {Array.from({ length: stampsRequired }).map((_, index) => {
                const isStamped = index < currentStamps;
                const isLast = index === stampsRequired - 1;
                const isReadyToClaim = isLast && rewardsReady > 0;

                return (
                  <div
                    key={index}
                    className={`punch-slot ${
                      isStamped ? 'stamped' : isReadyToClaim ? 'reward-ready' : isLast ? 'empty reward-slot' : 'empty'
                    }`}
                    title={isLast ? `Reward: ${b?.reward_name}` : `Stamp ${index + 1}`}
                  >
                    {isStamped ? (
                      <Check size={18} strokeWidth={3} />
                    ) : isLast ? (
                      <Gift size={17} />
                    ) : (
                      <span>{index + 1}</span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Progress & Milestone Reminder */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
                <span>{currentStamps} of {stampsRequired} visits collected</span>
                <span style={{ color: palette.accent }}>
                  {remaining === 0 ? 'Reward Unlocked!' : `${remaining} more to go`}
                </span>
              </div>
              <div style={{ height: 8, background: 'rgba(255,255,255,0.2)', borderRadius: 20, overflow: 'hidden' }}>
                <div 
                  style={{ 
                    height: '100%', 
                    width: `${percentComplete}%`, 
                    background: palette.accent, 
                    borderRadius: 20,
                    transition: 'width 0.5s ease' 
                  }} 
                />
              </div>
            </div>
          </div>

          {/* Front Action Buttons */}
          <div>
            <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
              <button
                type="button"
                className="btn tiny"
                style={{ 
                  flex: 1, 
                  background: palette.accent, 
                  color: '#123321', 
                  fontWeight: 800,
                  borderRadius: 12,
                  justifyContent: 'center'
                }}
                onClick={() => setIsFlipped(true)}
              >
                <QrCode size={15} /> Flip to QR Pass
              </button>

              <button
                type="button"
                className="btn tiny"
                style={{
                  background: 'rgba(255,255,255,0.18)',
                  color: '#ffffff',
                  border: '1px solid rgba(255,255,255,0.25)',
                  borderRadius: 12,
                  padding: '8px 12px'
                }}
                onClick={() => setWalletModal('phone')}
                title="Add to Phone Wallet"
              >
                <Smartphone size={15} />
              </button>
            </div>

            {/* Quick Wallet Badges on Front */}
            <div className="wallet-btn-group" style={{ marginTop: 10 }}>
              <button
                type="button"
                className="wallet-btn wallet-btn-apple"
                style={{ padding: '7px 11px', fontSize: 11 }}
                onClick={() => setWalletModal('apple')}
              >
                <svg width="12" height="12" viewBox="0 0 170 170" fill="currentColor">
                  <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.7-3.04-7.69-7.79-11.97-14.24-6.3-9.57-11.12-20.73-14.44-33.48-3.33-12.74-5-24.36-5-34.86 0-14.79 3.82-26.79 11.45-36.02 7.64-9.22 17.1-13.88 28.38-13.98 4.8 0 10.15 1.25 16.06 3.75 5.91 2.5 9.77 3.85 11.58 4.05 1.48-.2 5.61-1.61 12.38-4.23 6.78-2.61 12.56-3.83 17.34-3.65 13.06.63 23.36 5.3 30.9 14.02-11.41 6.89-17.02 16.5-16.84 28.84.18 9.69 3.93 17.77 11.25 24.23 7.32 6.47 16.03 10.22 26.13 11.27-2.02 6.33-4.5 12.75-7.46 19.26zM119.22 33.15c0-7.23 2.65-13.98 7.95-20.25 5.3-6.27 11.84-10.24 19.63-11.9-1.08 7.23-3.8 13.89-8.15 19.98-4.36 6.09-10.82 10.02-19.43 12.17z"/>
                </svg>
                Apple Wallet
              </button>

              <button
                type="button"
                className="wallet-btn wallet-btn-google"
                style={{ padding: '7px 11px', fontSize: 11 }}
                onClick={() => setWalletModal('google')}
              >
                <svg width="12" height="12" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                </svg>
                Google Wallet
              </button>

              <button
                type="button"
                className="wallet-btn wallet-btn-offline"
                style={{ padding: '7px 11px', fontSize: 11 }}
                onClick={() => setWalletModal('phone')}
              >
                <Smartphone size={12} /> Save to Phone
              </button>
            </div>
          </div>
        </div>

        {/* ================= BACK OF CARD (QR PASS VIEW) ================= */}
        <div className="card-back">
          {/* Magnetic Stripe */}
          <div className="mag-stripe" />

          {/* QR Scannable Body */}
          <div style={{ textAlign: 'center', marginTop: -6 }}>
            <div 
              style={{ 
                background: '#ffffff', 
                padding: 12, 
                borderRadius: 18, 
                display: 'inline-block',
                boxShadow: '0 8px 30px rgba(0,0,0,0.5)' 
              }}
            >
              <QRCodeSVG 
                value={`perkly:member:${card.id}`} 
                size={165}
                level="M"
              />
            </div>

            <div style={{ marginTop: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#ffffff' }}>
                {b?.name} Official Pass
              </span>
              <p style={{ margin: '2px 0 0', fontSize: 11, opacity: 0.75 }}>
                Hold near scanner at checkout to collect stamps
              </p>
            </div>

            <button
              onClick={copyPassId}
              type="button"
              style={{
                marginTop: 8,
                background: 'rgba(255,255,255,0.12)',
                border: '1px solid rgba(255,255,255,0.25)',
                color: '#ffffff',
                borderRadius: 10,
                padding: '4px 10px',
                fontSize: 11,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5
              }}
            >
              {copied ? <Check size={12} /> : <Copy size={12} />}
              {copied ? 'Pass Token Copied!' : `Token: ${card.id.slice(0, 8)}...`}
            </button>
          </div>

          {/* Back Footer Actions */}
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button
              type="button"
              className="btn tiny"
              style={{ 
                flex: 1, 
                background: '#ffffff', 
                color: '#1a1a1a', 
                fontWeight: 800,
                borderRadius: 12,
                justifyContent: 'center'
              }}
              onClick={() => setIsFlipped(false)}
            >
              <RotateCw size={14} /> Flip to Stamps
            </button>

            <button
              type="button"
              className="btn tiny"
              style={{
                background: 'rgba(255,255,255,0.15)',
                color: '#ffffff',
                borderRadius: 12,
                padding: '8px 12px'
              }}
              onClick={() => setWalletModal('phone')}
              title="Add Pass to Phone"
            >
              <Smartphone size={14} /> Add to Phone
            </button>
          </div>
        </div>

      </div>

      {/* ================= ADD TO WALLET / PHONE MODAL ================= */}
      {walletModal && (
        <div className="pass-modal-backdrop" onClick={() => setWalletModal(null)}>
          <div className="pass-modal" onClick={e => e.stopPropagation()}>
            <button 
              onClick={() => setWalletModal(null)}
              style={{ position: 'absolute', top: 16, right: 16, border: 0, background: 'none', cursor: 'pointer', color: '#6b7280' }}
            >
              <X size={20} />
            </button>

            {/* Modal Header */}
            <div style={{ width: 56, height: 56, borderRadius: 18, background: '#eaf4eb', color: '#1f5b3a', display: 'grid', placeItems: 'center', margin: '0 auto 14px' }}>
              <Smartphone size={28} />
            </div>

            <h3 style={{ margin: '0 0 6px', fontSize: 20 }}>
              {walletModal === 'apple' ? 'Add to Apple Wallet' : walletModal === 'google' ? 'Save to Google Wallet' : 'Add Pass to Your Phone'}
            </h3>
            <p className="small muted" style={{ margin: '0 0 16px', lineHeight: 1.4 }}>
              Carry your <b>{b?.name}</b> pass everywhere with 1-tap checkout access on your phone.
            </p>

            {/* Navigation Tabs */}
            <div className="wallet-tabs">
              <button 
                type="button" 
                className={`wallet-tab-btn ${activeTab === 'scan' ? 'active' : ''}`}
                onClick={() => setActiveTab('scan')}
              >
                <QrCode size={13} /> Scan to Phone
              </button>
              <button 
                type="button" 
                className={`wallet-tab-btn ${activeTab === 'pwa' ? 'active' : ''}`}
                onClick={() => setActiveTab('pwa')}
              >
                <Smartphone size={13} /> 1-Tap Home Pass
              </button>
              <button 
                type="button" 
                className={`wallet-tab-btn ${activeTab === 'share' ? 'active' : ''}`}
                onClick={() => setActiveTab('share')}
              >
                <Send size={13} /> Send Link
              </button>
            </div>

            {/* TAB 1: SCAN PHONE CAMERA */}
            {activeTab === 'scan' && (
              <div style={{ padding: '8px 0 16px', textAlign: 'center' }}>
                <p className="small muted" style={{ margin: '0 0 12px' }}>
                  Open your <b>iPhone or Android Camera</b> and point it at this QR code to open your pass instantly on mobile:
                </p>
                <div style={{ background: '#f9faf9', padding: 14, borderRadius: 18, display: 'inline-block', border: '1px solid #e5ede6' }}>
                  <QRCodeSVG value={phoneUrl} size={150} level="M" />
                </div>
                <div style={{ marginTop: 10, fontSize: 11, color: '#52795d', fontWeight: 600 }}>
                  ✓ Live sync with your Perkly account
                </div>
              </div>
            )}

            {/* TAB 2: PWA / LOCKSCREEN ADD */}
            {activeTab === 'pwa' && (
              <div style={{ padding: '8px 0 14px', textAlign: 'left', background: '#f8faf8', borderRadius: 16, paddingLeft: 16, paddingRight: 16 }}>
                <b style={{ fontSize: 13, display: 'block', marginBottom: 10 }}>How to save as an app pass on mobile:</b>
                <div style={{ display: 'grid', gap: 10, fontSize: 12 }}>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <span style={{ width: 22, height: 22, borderRadius: '50%', background: '#163f2c', color: '#fff', display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>1</span>
                    <span>On iPhone Safari, tap the <b>Share icon (⎋)</b>. On Android Chrome, tap the <b>3 dots menu (⋮)</b>.</span>
                  </div>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <span style={{ width: 22, height: 22, borderRadius: '50%', background: '#163f2c', color: '#fff', display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>2</span>
                    <span>Tap <b>"Add to Home Screen"</b> or <b>"Install App"</b>.</span>
                  </div>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <span style={{ width: 22, height: 22, borderRadius: '50%', background: '#163f2c', color: '#fff', display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>3</span>
                    <span>Your loyalty card will now live on your phone home screen just like an Apple or Google Wallet card!</span>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: SEND PASS LINK */}
            {activeTab === 'share' && (
              <div style={{ display: 'grid', gap: 8, padding: '10px 0 16px' }}>
                <a
                  href={`https://api.whatsapp.com/send?text=${encodeURIComponent(`Here is my ${b?.name} digital loyalty pass: ${phoneUrl}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn"
                  style={{ background: '#25D366', color: '#ffffff', width: '100%', justifyContent: 'center' }}
                >
                  <MessageCircle size={16} /> Send via WhatsApp
                </a>

                <a
                  href={`sms:?body=${encodeURIComponent(`My ${b?.name} loyalty pass: ${phoneUrl}`)}`}
                  className="btn secondary"
                  style={{ width: '100%', justifyContent: 'center' }}
                >
                  <Send size={15} /> Send via SMS Text Message
                </a>
              </div>
            )}

            {/* Modal Bottom Actions */}
            <div style={{ display: 'grid', gap: 8, marginTop: 10 }}>
              <button
                type="button"
                className="btn"
                style={{ width: '100%', justifyContent: 'center' }}
                onClick={() => {
                  downloadPassSummary();
                  setWalletModal(null);
                }}
              >
                <Download size={15} /> Save Offline Pass Summary
              </button>

              <button
                type="button"
                className="btn secondary"
                style={{ width: '100%', justifyContent: 'center' }}
                onClick={() => {
                  copyPassId();
                  setWalletModal(null);
                }}
              >
                <Copy size={15} /> Copy Member Token ID
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

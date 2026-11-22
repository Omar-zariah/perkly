'use client';
import { useState, useEffect, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { translations, type Locale } from '@/lib/i18n';
import { normalizeMoroccoPhone } from '@/lib/phone';
import { Phone, User, ArrowRight, Globe, Loader2, Gift, Coffee, CheckCircle2, Smartphone, X, Download, MessageCircle, Send } from 'lucide-react';

interface BranchInfo {
  id: string;
  name: string;
  slug: string;
}

interface BusinessInfo {
  id: string;
  name: string;
  slug: string;
  logo_url?: string;
  primary_color?: string;
  accent_color?: string;
  stamps_required: number;
  reward_name: string;
  offer_sentence_fr?: string;
  offer_sentence_ar?: string;
}

interface CounterSignupFormProps {
  business: BusinessInfo;
  branch?: BranchInfo;
}

type Step = 'form' | 'otp' | 'success';

export default function CounterSignupForm({ business, branch }: CounterSignupFormProps) {
  const [locale, setLocale] = useState<Locale>('fr');
  const [step, setStep] = useState<Step>('form');
  const [firstName, setFirstName] = useState('');
  const [phone, setPhone] = useState('');
  const [optIn, setOptIn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [otp, setOtp] = useState('');
  const [passToken, setPassToken] = useState('');
  const [isNew, setIsNew] = useState(true);
  const [customerName, setCustomerName] = useState('');
  const [walletOpen, setWalletOpen] = useState(false);
  const [walletTab, setWalletTab] = useState<'scan' | 'pwa' | 'share'>('scan');
  const otpRef = useRef<HTMLInputElement>(null);

  const t = translations[locale];
  const primary = business.primary_color || '#163f2c';
  const accent = business.accent_color || '#d1f36a';
  const offerText = locale === 'ar'
    ? (business.offer_sentence_ar || t.offerSentence(business.stamps_required, business.reward_name))
    : (business.offer_sentence_fr || t.offerSentence(business.stamps_required, business.reward_name));

  const passUrl = passToken
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/pass/${passToken}`
    : '';

  // Detect browser locale on mount
  useEffect(() => {
    const lang = navigator.language || '';
    if (lang.startsWith('ar')) setLocale('ar');
  }, []);

  // Apply RTL to document
  useEffect(() => {
    document.documentElement.setAttribute('dir', t.dir);
    document.documentElement.setAttribute('lang', locale);
    return () => {
      document.documentElement.setAttribute('dir', 'ltr');
      document.documentElement.setAttribute('lang', 'fr');
    };
  }, [locale, t.dir]);

  // Focus OTP input when step changes
  useEffect(() => {
    if (step === 'otp') setTimeout(() => otpRef.current?.focus(), 300);
  }, [step]);

  function validateForm(): string {
    if (!firstName.trim() || firstName.trim().length < 2) {
      return locale === 'ar' ? 'الاسم مطلوب (حرفان على الأقل)' : 'Le prénom est requis (2 caractères minimum)';
    }
    const phoneResult = normalizeMoroccoPhone(phone);
    if (!phoneResult.valid) {
      return phoneResult.error || (locale === 'ar' ? 'رقم الهاتف غير صالح' : 'Numéro invalide');
    }
    return '';
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const validationError = validateForm();
    if (validationError) { setError(validationError); return; }
    setError('');
    setBusy(true);
    try {
      const res = await fetch('/api/counter-join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessSlug: business.slug,
          branchSlug: branch?.slug,
          firstName: firstName.trim(),
          phone,
          optIn,
          lang: locale,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 409 && data.requiresOtp) {
          // Returning customer on new device — need OTP
          setStep('otp');
          setBusy(false);
          return;
        }
        setError(data.error || (locale === 'ar' ? 'حدث خطأ. حاول مجدداً.' : 'Une erreur est survenue. Réessayez.'));
        setBusy(false);
        return;
      }
      setPassToken(data.passToken);
      setIsNew(data.isNew);
      setCustomerName(data.firstName || firstName.trim());
      setStep('success');
    } catch {
      setError(locale === 'ar' ? 'خطأ في الاتصال. تحقق من الإنترنت.' : 'Erreur de connexion. Vérifiez votre réseau.');
    }
    setBusy(false);
  }

  async function handleOtpVerify(e: React.FormEvent) {
    e.preventDefault();
    if (otp.length !== 6) return;
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessSlug: business.slug, phone, code: otp }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(t.invalidOtp);
        setBusy(false);
        return;
      }
      setPassToken(data.passToken);
      setIsNew(false);
      setCustomerName(data.firstName || firstName.trim());
      setStep('success');
    } catch {
      setError(locale === 'ar' ? 'خطأ في الاتصال.' : 'Erreur de connexion.');
    }
    setBusy(false);
  }

  async function handleResendOtp() {
    setBusy(true);
    await fetch('/api/otp/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ businessSlug: business.slug, phone }),
    });
    setBusy(false);
  }

  function openCard() {
    if (passUrl) window.location.href = passUrl;
  }

  // ─── SUCCESS STEP ───────────────────────────────────────────────────────
  if (step === 'success') {
    return (
      <div className="counter-wrap" dir={t.dir} style={{ '--primary': primary, '--accent': accent } as React.CSSProperties}>
        <div className="counter-success">
          <div className="success-icon" style={{ background: `${accent}22`, color: accent }}>
            <CheckCircle2 size={48} />
          </div>
          <h2 style={{ color: '#fff', margin: '16px 0 8px' }}>
            {isNew
              ? (locale === 'ar' ? `مرحباً بك ${customerName}! 🎉` : `Bienvenue ${customerName} ! 🎉`)
              : (locale === 'ar' ? `مرحباً بعودتك ${customerName}!` : `Bon retour ${customerName} !`)
            }
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.8)', margin: '0 0 24px', textAlign: 'center', lineHeight: 1.5 }}>
            {offerText}
          </p>

          {/* QR Code to scan at counter */}
          <div style={{ background: '#fff', borderRadius: 20, padding: 16, marginBottom: 20, boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }}>
            <QRCodeSVG value={`perkly:pass:${passToken}`} size={180} level="M" />
            <p style={{ margin: '10px 0 0', fontSize: 12, color: '#555', textAlign: 'center' }}>
              {t.showToCashier}
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%' }}>
            <button
              className="counter-primary-btn"
              style={{ background: accent, color: primary, fontWeight: 800 }}
              onClick={() => setWalletOpen(true)}
            >
              <Smartphone size={18} />
              {t.addToHomeScreen}
            </button>
            <button
              className="counter-secondary-btn"
              onClick={openCard}
            >
              <ArrowRight size={16} />
              {locale === 'ar' ? 'عرض بطاقتي الكاملة' : 'Voir ma carte complète'}
            </button>
          </div>

          <p style={{ marginTop: 20, fontSize: 11, color: 'rgba(255,255,255,0.45)', textAlign: 'center' }}>
            {t.poweredBy}
          </p>
        </div>

        {/* Wallet modal */}
        {walletOpen && (
          <div className="pass-modal-backdrop" onClick={() => setWalletOpen(false)}>
            <div className="pass-modal" onClick={e => e.stopPropagation()} dir="ltr">
              <button onClick={() => setWalletOpen(false)} style={{ position: 'absolute', top: 14, right: 14, border: 0, background: 'none', cursor: 'pointer', color: '#6b7280' }}>
                <X size={20} />
              </button>
              <div style={{ width: 52, height: 52, borderRadius: 16, background: '#eaf4eb', color: '#1f5b3a', display: 'grid', placeItems: 'center', margin: '0 auto 12px' }}>
                <Smartphone size={26} />
              </div>
              <h3 style={{ margin: '0 0 4px', textAlign: 'center' }}>Ajouter à votre téléphone</h3>
              <p className="small muted" style={{ textAlign: 'center', marginBottom: 14 }}>
                Votre carte <b>{business.name}</b> sur votre écran d'accueil
              </p>
              <div className="wallet-tabs">
                {(['scan','pwa','share'] as const).map(tab => (
                  <button key={tab} type="button" className={`wallet-tab-btn ${walletTab === tab ? 'active' : ''}`} onClick={() => setWalletTab(tab)}>
                    {tab === 'scan' ? <><QRCodeSVG value="" size={0} /><span style={{fontSize:11}}>📷 Scan</span></> : tab === 'pwa' ? <><Smartphone size={12}/> Accueil</> : <><Send size={12}/> Partager</>}
                  </button>
                ))}
              </div>

              {walletTab === 'scan' && (
                <div style={{ textAlign: 'center', padding: '8px 0 16px' }}>
                  <p className="small muted" style={{ marginBottom: 10 }}>Scannez avec l'appareil photo de votre téléphone :</p>
                  <div style={{ background: '#f9faf9', padding: 14, borderRadius: 18, display: 'inline-block', border: '1px solid #e5ede6' }}>
                    <QRCodeSVG value={passUrl} size={150} level="M" />
                  </div>
                  <div style={{ marginTop: 8, fontSize: 11, color: '#52795d', fontWeight: 600 }}>✓ Synchronisé en temps réel</div>
                </div>
              )}

              {walletTab === 'pwa' && (
                <div style={{ padding: '8px 16px 14px', background: '#f8faf8', borderRadius: 16 }}>
                  <b style={{ fontSize: 13, display: 'block', marginBottom: 10 }}>Sauvegarder comme app sur mobile :</b>
                  <div style={{ display: 'grid', gap: 10, fontSize: 12 }}>
                    {[
                      'Sur iPhone Safari, tapez l\'icône Partager (⎋). Sur Android Chrome, tapez le menu (⋮).',
                      'Sélectionnez "Ajouter à l\'écran d\'accueil" ou "Installer l\'app".',
                      'Votre carte de fidélité apparaîtra comme une app native sur votre téléphone !'
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
                  <a href={`https://api.whatsapp.com/send?text=${encodeURIComponent(`Ma carte de fidélité ${business.name} : ${passUrl}`)}`} target="_blank" rel="noopener noreferrer" className="btn" style={{ background: '#25D366', color: '#fff', justifyContent: 'center' }}>
                    <MessageCircle size={16} /> Envoyer via WhatsApp
                  </a>
                  <a href={`sms:?body=${encodeURIComponent(`Ma carte ${business.name} : ${passUrl}`)}`} className="btn secondary" style={{ justifyContent: 'center' }}>
                    <Send size={15} /> Envoyer par SMS
                  </a>
                </div>
              )}

              <button className="btn" style={{ width: '100%', justifyContent: 'center', marginTop: 10 }} onClick={openCard}>
                <ArrowRight size={15} /> Ouvrir ma carte maintenant
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ─── OTP STEP ────────────────────────────────────────────────────────────
  if (step === 'otp') {
    return (
      <div className="counter-wrap" dir={t.dir} style={{ '--primary': primary, '--accent': accent } as React.CSSProperties}>
        <div className="counter-card">
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <div className="counter-logo-wrap">
              {business.logo_url ? <img src={business.logo_url} alt={business.name} style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 16 }} /> : <Coffee size={32} style={{ color: accent }} />}
            </div>
            <h2 style={{ color: '#fff', margin: '12px 0 6px' }}>{t.verifyPhoneTitle}</h2>
            <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 14, margin: 0, lineHeight: 1.5 }}>{t.verifyPhoneDesc}</p>
          </div>
          <form onSubmit={handleOtpVerify} style={{ display: 'grid', gap: 16 }}>
            <label className="counter-field">
              <input
                ref={otpRef}
                type="text"
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                placeholder={t.enterOtpPlaceholder}
                value={otp}
                onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                style={{ textAlign: 'center', letterSpacing: '0.4em', fontSize: 24 }}
                autoComplete="one-time-code"
              />
            </label>
            {error && <div className="counter-error">{error}</div>}
            <button type="submit" className="counter-primary-btn" style={{ background: accent, color: primary }} disabled={busy || otp.length !== 6}>
              {busy ? <Loader2 size={18} className="spin" /> : <ArrowRight size={18} />}
              {busy ? t.submitting : t.verifyBtn}
            </button>
            <button type="button" className="counter-secondary-btn" onClick={handleResendOtp} disabled={busy}>
              {t.resendOtp}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ─── SIGNUP FORM ─────────────────────────────────────────────────────────
  return (
    <div className="counter-wrap" dir={t.dir} style={{ '--primary': primary, '--accent': accent } as React.CSSProperties}>
      {/* Language toggle */}
      <button
        type="button"
        className="lang-toggle"
        onClick={() => setLocale(locale === 'fr' ? 'ar' : 'fr')}
        aria-label="Switch language"
      >
        <Globe size={14} />
        {locale === 'fr' ? 'العربية' : 'Français'}
      </button>

      <div className="counter-card">
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div className="counter-logo-wrap">
            {business.logo_url
              ? <img src={business.logo_url} alt={business.name} style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 20 }} />
              : <Coffee size={34} style={{ color: accent }} />
            }
          </div>
          <h1 style={{ color: '#fff', margin: '14px 0 6px', fontSize: 26, fontWeight: 900, letterSpacing: '-0.5px' }}>
            {business.name}
          </h1>
          <div className="offer-pill" style={{ background: `${accent}22`, borderColor: `${accent}55`, color: accent }}>
            <Gift size={14} />
            {offerText}
          </div>
          {branch && (
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, margin: '8px 0 0' }}>
              📍 {branch.name}
            </p>
          )}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 14 }}>
          <label className="counter-field">
            <span className="counter-label">
              <User size={14} />
              {t.firstNameLabel}
            </span>
            <input
              type="text"
              placeholder={t.firstNamePlaceholder}
              value={firstName}
              onChange={e => setFirstName(e.target.value)}
              autoCapitalize="words"
              autoCorrect="off"
              autoComplete="given-name"
              required
              minLength={2}
            />
          </label>

          <label className="counter-field">
            <span className="counter-label">
              <Phone size={14} />
              {t.phoneLabel}
            </span>
            <div className="phone-input-wrap">
              <span className="phone-prefix">🇲🇦 +212</span>
              <input
                type="tel"
                placeholder={t.phonePlaceholder}
                value={phone}
                onChange={e => setPhone(e.target.value)}
                autoComplete="tel"
                inputMode="tel"
                required
              />
            </div>
          </label>

          <label className="counter-opt-in">
            <input type="checkbox" checked={optIn} onChange={e => setOptIn(e.target.checked)} />
            <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.65)', lineHeight: 1.4 }}>{t.optInLabel}</span>
          </label>

          {error && <div className="counter-error">{error}</div>}

          <button
            type="submit"
            className="counter-primary-btn"
            style={{ background: accent, color: primary, marginTop: 4 }}
            disabled={busy}
          >
            {busy ? <Loader2 size={18} className="spin" /> : <Smartphone size={18} />}
            {busy ? t.submitting : t.joinAndWalletBtn}
          </button>
        </form>

        {/* Stamp preview */}
        <div className="stamp-preview">
          {Array.from({ length: business.stamps_required }).map((_, i) => (
            <div key={i} className={`stamp-dot ${i === business.stamps_required - 1 ? 'stamp-dot-gift' : ''}`} style={{ borderColor: `${accent}44`, color: i === business.stamps_required - 1 ? accent : 'rgba(255,255,255,0.3)' }}>
              {i === business.stamps_required - 1 ? <Gift size={10} /> : <span style={{ fontSize: 9 }}>{i + 1}</span>}
            </div>
          ))}
        </div>

        <p style={{ textAlign: 'center', margin: '16px 0 0', fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>
          {t.poweredBy}
        </p>
      </div>
    </div>
  );
}

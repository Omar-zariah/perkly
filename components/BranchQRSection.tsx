'use client';
import { Copy, Download, Check, Printer, ExternalLink, Wifi, Coffee } from 'lucide-react';
import { useState } from 'react';

interface Branch {
  id: string;
  name: string;
  slug: string;
  city: string;
  address?: string | null;
  businessSlug: string;
  appUrl: string;
}

interface CounterQRHubProps {
  business: {
    id: string;
    name: string;
    slug: string;
    reward_name: string;
    stamps_required: number;
    offer_sentence_fr?: string | null;
    offer_sentence_ar?: string | null;
    primary_color?: string | null;
    accent_color?: string | null;
  };
  branches: Branch[];
  appUrl: string;
}

export default function BranchQRSection({ business, branches, appUrl }: CounterQRHubProps) {
  const [selectedBranchSlug, setSelectedBranchSlug] = useState<string>(
    branches.length > 0 ? branches[0].slug : ''
  );
  const [copied, setCopied] = useState<string | null>(null);

  const activeBranch = branches.find(b => b.slug === selectedBranchSlug);
  const currentSignupUrl = activeBranch
    ? `${appUrl}/${business.slug}/${activeBranch.slug}`
    : `${appUrl}/${business.slug}`;

  const currentQrSrc = activeBranch
    ? `/api/qr/${business.slug}/${activeBranch.slug}`
    : `/api/qr/${business.slug}`;

  const offerText = business.offer_sentence_fr || `Achetez ${business.stamps_required} cafés et obtenez ${business.reward_name.toLowerCase()} offert !`;
  const offerTextAr = business.offer_sentence_ar || `اشتري ${business.stamps_required} قهوات واحصل على ${business.reward_name} مجاناً !`;

  function copyUrl(url: string, key: string) {
    navigator.clipboard.writeText(url);
    setCopied(key);
    setTimeout(() => setCopied(null), 2500);
  }

  function downloadQR(filename: string) {
    const a = document.createElement('a');
    a.href = currentQrSrc;
    a.download = `${filename.toLowerCase().replace(/\s+/g, '-')}-qr.svg`;
    a.click();
  }

  function handlePrint() {
    window.print();
  }

  return (
    <div className="counter-qr-hub">
      {/* Branch selector if multiple */}
      {branches.length > 1 && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 18, flexWrap: 'wrap' }}>
          <span className="small muted" style={{ fontWeight: 700 }}>Succursale active :</span>
          {branches.map(br => (
            <button
              key={br.id}
              type="button"
              className={`btn tiny ${selectedBranchSlug === br.slug ? '' : 'secondary'}`}
              onClick={() => setSelectedBranchSlug(br.slug)}
            >
              📍 {br.name}
            </button>
          ))}
        </div>
      )}

      {/* Main Counter Display Box */}
      <div className="printable-stand-wrapper">
        <div className="counter-stand" id="printable-counter-stand">
          {/* Header */}
          <div className="stand-header" style={{ background: business.primary_color || '#163f2c' }}>
            <div className="stand-badge">
              <Coffee size={15} /> PERKLY LOYALTY
            </div>
            <h2 className="stand-biz-name">{business.name}</h2>
            {activeBranch && <div className="stand-branch-name">📍 {activeBranch.name} • {activeBranch.city}</div>}
            <div className="stand-offer-pill">
              <div><b>{offerText}</b></div>
              <div style={{ fontSize: 13, marginTop: 4, opacity: 0.9 }}>{offerTextAr}</div>
            </div>
          </div>

          {/* QR Code Body */}
          <div className="stand-body">
            <div className="stand-qr-frame">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={currentQrSrc} alt={`QR Code ${business.name}`} className="stand-qr-img" />
            </div>

            <div className="stand-instructions">
              <div className="instruction-step">
                <span className="step-num">1</span>
                <span><b>Scannez</b> le QR code avec l'appareil photo ou <b>approchez</b> votre smartphone (NFC)</span>
              </div>
              <div className="instruction-step">
                <span className="step-num">2</span>
                <span>Entrez votre <b>prénom & téléphone</b> (sans mot de passe)</span>
              </div>
              <div className="instruction-step">
                <span className="step-num">3</span>
                <span>Votre <b>carte s'ajoute directement à votre téléphone</b> & cumulez vos cafés !</span>
              </div>
            </div>

            <div className="stand-footer">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 12, color: '#163f2c', fontWeight: 700 }}>
                <Wifi size={14} style={{ transform: 'rotate(90deg)' }} /> Compatible NFC & Tous Smartphones (Apple & Android)
              </div>
              <div style={{ fontSize: 11, color: '#777', marginTop: 4, wordBreak: 'break-all' }}>
                {currentSignupUrl}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Control Actions */}
      <div className="stand-controls">
        <button type="button" className="btn" onClick={handlePrint}>
          <Printer size={16} /> Imprimer le chevalet comptoir
        </button>

        <button type="button" className="btn secondary" onClick={() => downloadQR(activeBranch?.name || business.name)}>
          <Download size={16} /> Télécharger QR (SVG)
        </button>

        <button type="button" className="btn secondary" onClick={() => copyUrl(currentSignupUrl, 'nfc')}>
          {copied === 'nfc' ? <Check size={16} /> : <Copy size={16} />}
          {copied === 'nfc' ? 'URL NFC copiée !' : 'Copier URL pour Tag NFC'}
        </button>

        <a
          href={currentSignupUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="btn ghost"
        >
          <ExternalLink size={15} /> Tester le scan client
        </a>
      </div>
    </div>
  );
}

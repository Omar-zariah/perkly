'use client';
import { useState, useEffect, useRef } from 'react';
import { ScanLine, Coffee, Gift, Check, AlertCircle, Loader2, User, ChevronUp, ChevronDown, RotateCcw } from 'lucide-react';

interface CustomerInfo {
  firstName: string;
  stamps: number;
  stampsRequired: number;
  rewardsAvailable: number;
  passToken: string;
  membershipId: string;
}

export default function ScanPage() {
  const [input, setInput] = useState('');
  const [scan, setScan] = useState(false);
  const [busy, setBusy] = useState(false);
  const [customer, setCustomer] = useState<CustomerInfo | null>(null);
  const [coffeeCount, setCoffeeCount] = useState(1);
  const [msg, setMsg] = useState('');
  const [msgType, setMsgType] = useState<'ok' | 'err'>('ok');
  const [reverseId, setReverseId] = useState('');
  const [reverseReason, setReverseReason] = useState('');
  const [showReverse, setShowReverse] = useState(false);
  const camera = useRef<unknown>(null);

  function notice(text: string, type: 'ok' | 'err' = 'ok') {
    setMsg(text);
    setMsgType(type);
    setTimeout(() => setMsg(''), 5000);
  }

  function extractToken(raw: string) {
    let t = raw.trim();
    if (t.startsWith('perkly:pass:')) return t.slice('perkly:pass:'.length);
    if (t.startsWith('perkly:member:')) return t.slice('perkly:member:'.length);
    if (t.includes('/pass/')) {
      const parts = t.split('/pass/')[1];
      return parts.split('?')[0].split('#')[0].replace(/\/+$/, '');
    }
    return t;
  }

  async function lookupCustomer(raw: string) {
    const token = extractToken(raw);
    if (!token) return;
    setBusy(true);
    setCustomer(null);
    try {
      const res = await fetch('/api/cashier/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passToken: token }),
      });
      const data = await res.json();
      if (!res.ok) { notice(data.error || 'Carte introuvable', 'err'); setBusy(false); return; }
      setCustomer(data);
      setCoffeeCount(1);
    } catch { notice('Erreur de connexion', 'err'); }
    setBusy(false);
  }

  async function addStamps() {
    if (!customer) return;
    setBusy(true);
    const idempotencyKey = crypto.randomUUID();
    try {
      const res = await fetch('/api/cashier/stamps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passToken: customer.passToken, coffeeCount, idempotencyKey }),
      });
      const data = await res.json();
      if (!res.ok) { notice(data.error || 'Erreur', 'err'); setBusy(false); return; }
      notice(`✓ ${coffeeCount} café(s) ajouté(s). Tampons: ${data.stamps_after}/${customer.stampsRequired}. Récompenses: ${data.rewards_after}`, 'ok');
      setCustomer(c => c ? { ...c, stamps: data.stamps_after, rewardsAvailable: data.rewards_after } : null);
      setReverseId(data.event_id || '');
    } catch { notice('Erreur de connexion', 'err'); }
    setBusy(false);
  }

  async function redeemReward() {
    if (!customer || customer.rewardsAvailable < 1) return;
    setBusy(true);
    const idempotencyKey = crypto.randomUUID();
    try {
      const res = await fetch('/api/cashier/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passToken: customer.passToken, idempotencyKey }),
      });
      const data = await res.json();
      if (!res.ok) { notice(data.error || 'Erreur', 'err'); setBusy(false); return; }
      notice(`🎁 Récompense échangée ! Récompenses restantes : ${data.rewards_after}`, 'ok');
      setCustomer(c => c ? { ...c, rewardsAvailable: data.rewards_after } : null);
      setReverseId(data.event_id || '');
    } catch { notice('Erreur de connexion', 'err'); }
    setBusy(false);
  }

  async function reverseEvent() {
    if (!reverseId || !reverseReason.trim()) return;
    setBusy(true);
    try {
      const res = await fetch('/api/cashier/reverse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId: reverseId, reason: reverseReason.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { notice(data.error || 'Erreur', 'err'); setBusy(false); return; }
      notice('↩ Opération annulée. Le solde a été restauré.', 'ok');
      setReverseId('');
      setReverseReason('');
      setShowReverse(false);
      // Refresh customer balance
      if (customer) await lookupCustomer(customer.passToken);
    } catch { notice('Erreur de connexion', 'err'); }
    setBusy(false);
  }

  // Camera / QR scanner
  useEffect(() => {
    if (!scan) return;
    let closed = false;
    let scanner: any = null;
    (async () => {
      try {
        const { Html5Qrcode } = await import('html5-qrcode');
        scanner = new Html5Qrcode('cashier-reader');
        camera.current = scanner;
        await scanner!.start(
          { facingMode: 'environment' },
          { fps: 8, qrbox: 220 },
          async (text: string) => {
            if (closed) return;
            setInput(text);
            setScan(false);
            await lookupCustomer(text);
          },
          () => {}
        );
      } catch {
        notice('Caméra indisponible. Utilisez HTTPS et autorisez l\'accès.', 'err');
        setScan(false);
      }
    })();
    return () => {
      closed = true;
      if (scanner) scanner.stop().catch(() => {}).finally(() => scanner!.clear().catch(() => {}));
      camera.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scan]);

  return (
    <div className="wrap">
      <div className="pagehead">
        <div>
          <div className="eyebrow">Caisse</div>
          <h1>Scanner une carte client</h1>
          <p className="muted small">Scannez le QR personnel du client ou collez l'identifiant manuellement.</p>
        </div>
      </div>

      <div className="two">
        {/* Scanner panel */}
        <div className="panel">
          <h3><ScanLine size={18} style={{ verticalAlign: 'middle' }} /> Scan carte</h3>
          <div className="form">
            <label className="field">
              Identifiant carte / QR
              <input
                placeholder="perkly:pass:..."
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') lookupCustomer(input); }}
              />
            </label>
            <div className="actions" style={{ marginTop: 0 }}>
              <button className="btn ghost" onClick={() => setScan(!scan)}>
                {scan ? 'Fermer caméra' : 'Ouvrir scanner QR'} <ScanLine size={15} />
              </button>
              <button className="btn secondary" disabled={!input || busy} onClick={() => lookupCustomer(input)}>
                Rechercher {busy && <Loader2 size={14} className="spin" />}
              </button>
            </div>
            {scan && <div className="scanner" id="cashier-reader" />}
          </div>

          {/* Customer info */}
          {customer && (
            <div style={{ marginTop: 20, padding: 16, background: 'var(--surface)', borderRadius: 14, border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <div style={{ width: 42, height: 42, borderRadius: 12, background: '#163f2c22', display: 'grid', placeItems: 'center' }}>
                  <User size={22} style={{ color: '#163f2c' }} />
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 18 }}>{customer.firstName}</div>
                  <div className="small muted">{customer.stamps}/{customer.stampsRequired} tampons · {customer.rewardsAvailable} récompense(s)</div>
                </div>
                {customer.rewardsAvailable > 0 && (
                  <div style={{ marginLeft: 'auto', background: 'linear-gradient(135deg,#ffd700,#ffaa00)', color: '#1a1a1a', padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 5 }}>
                    <Gift size={12} /> {customer.rewardsAvailable} dispo
                  </div>
                )}
              </div>

              {/* Stamp bar */}
              <div style={{ height: 8, background: 'var(--border)', borderRadius: 20, overflow: 'hidden', marginBottom: 16 }}>
                <div style={{ height: '100%', width: `${Math.min(100, Math.round(customer.stamps / customer.stampsRequired * 100))}%`, background: '#163f2c', borderRadius: 20, transition: 'width 0.4s' }} />
              </div>

              {/* Coffee selector */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                <span className="small" style={{ fontWeight: 600 }}>Nombre de cafés :</span>
                <button type="button" className="btn tiny secondary" style={{ padding: '5px 9px', borderRadius: 8 }} onClick={() => setCoffeeCount(Math.max(1, coffeeCount - 1))} disabled={coffeeCount <= 1}>
                  <ChevronDown size={14} />
                </button>
                <span style={{ fontWeight: 800, fontSize: 20, minWidth: 28, textAlign: 'center' }}>{coffeeCount}</span>
                <button type="button" className="btn tiny secondary" style={{ padding: '5px 9px', borderRadius: 8 }} onClick={() => setCoffeeCount(Math.min(20, coffeeCount + 1))} disabled={coffeeCount >= 20}>
                  <ChevronUp size={14} />
                </button>
                <Coffee size={16} style={{ color: '#163f2c', opacity: 0.6 }} />
              </div>

              <div className="actions" style={{ marginTop: 0 }}>
                <button className="btn" disabled={busy} onClick={addStamps}>
                  <Check size={16} /> Ajouter {coffeeCount} tampon(s)
                </button>
                <button className="btn secondary" disabled={busy || customer.rewardsAvailable < 1} onClick={redeemReward}>
                  <Gift size={16} /> Échanger récompense
                </button>
              </div>

              {/* Reversal */}
              {reverseId && (
                <div style={{ marginTop: 12 }}>
                  <button type="button" className="btn tiny ghost" onClick={() => setShowReverse(!showReverse)}>
                    <RotateCcw size={13} /> Annuler la dernière opération
                  </button>
                  {showReverse && (
                    <div style={{ marginTop: 10, display: 'grid', gap: 8 }}>
                      <input className="field" placeholder="Raison de l'annulation (obligatoire)..." value={reverseReason} onChange={e => setReverseReason(e.target.value)} style={{ padding: '8px 12px', borderRadius: 10 }} />
                      <button className="btn secondary" disabled={!reverseReason.trim() || busy} onClick={reverseEvent} style={{ fontSize: 13 }}>
                        <RotateCcw size={14} /> Confirmer l'annulation
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {msg && (
            <div className="notice" style={{ marginTop: 14, background: msgType === 'err' ? '#fef2f2' : '#f0fdf4', color: msgType === 'err' ? '#991b1b' : '#166534', border: `1px solid ${msgType === 'err' ? '#fca5a5' : '#86efac'}` }}>
              {msgType === 'err' ? <AlertCircle size={15} style={{ verticalAlign: 'middle' }} /> : <Check size={15} style={{ verticalAlign: 'middle' }} />}
              {' '}{msg}
            </div>
          )}
        </div>

        {/* Help panel */}
        <div className="panel">
          <h3>Mode d'emploi caisse</h3>
          <div style={{ display: 'grid', gap: 14, marginTop: 8 }}>
            {[
              { icon: <ScanLine size={16} />, title: 'Scanner', text: 'Scannez le QR au dos de la carte du client, ou collez l\'identifiant.' },
              { icon: <Coffee size={16} />, title: 'Tampons', text: 'Sélectionnez le nombre de cafés payés, puis cliquez « Ajouter tampons ».' },
              { icon: <Gift size={16} />, title: 'Récompense', text: 'Si le client a des récompenses disponibles, cliquez « Échanger récompense ».' },
              { icon: <RotateCcw size={16} />, title: 'Annulation', text: 'Annulez la dernière opération avec une raison. Les opérations précédentes sont préservées.' },
            ].map((step, i) => (
              <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <div style={{ width: 32, height: 32, borderRadius: 10, background: '#163f2c11', display: 'grid', placeItems: 'center', flexShrink: 0, color: '#163f2c' }}>{step.icon}</div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{step.title}</div>
                  <div className="small muted" style={{ lineHeight: 1.5 }}>{step.text}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

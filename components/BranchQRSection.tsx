'use client';
import { Copy, Download, Check } from 'lucide-react';
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

export default function BranchQRSection({ branches }: { branches: Branch[] }) {
  const [copied, setCopied] = useState<string | null>(null);

  function copyUrl(url: string, id: string) {
    navigator.clipboard.writeText(url);
    setCopied(id);
    setTimeout(() => setCopied(null), 2500);
  }

  function downloadQR(slug: string, businessSlug: string, branchName: string) {
    const a = document.createElement('a');
    a.href = `/api/qr/${businessSlug}/${slug}`;
    a.download = `${branchName.toLowerCase().replace(/\s+/g, '-')}-qr.svg`;
    a.click();
  }

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      {branches.map(branch => {
        const signupUrl = `${branch.appUrl}/${branch.businessSlug}/${branch.slug}`;
        const qrSrc = `/api/qr/${branch.businessSlug}/${branch.slug}`;
        return (
          <div key={branch.id} className="branch-qr-card">
            <div className="branch-qr-img">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrSrc} alt={`QR ${branch.name}`} />
            </div>
            <div className="branch-qr-info">
              <h4>{branch.name}</h4>
              <p style={{ margin: '2px 0 6px', fontSize: 12, color: 'var(--sub)' }}>
                📍 {branch.city}{branch.address ? ` · ${branch.address}` : ''}
              </p>
              <div className="branch-qr-url">{signupUrl}</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn tiny"
                  onClick={() => copyUrl(signupUrl, branch.id)}
                  style={{ fontSize: 11, padding: '6px 10px' }}
                >
                  {copied === branch.id ? <Check size={12} /> : <Copy size={12} />}
                  {copied === branch.id ? 'Copié !' : 'Copier URL NFC'}
                </button>
                <button
                  type="button"
                  className="btn tiny secondary"
                  onClick={() => downloadQR(branch.slug, branch.businessSlug, branch.name)}
                  style={{ fontSize: 11, padding: '6px 10px' }}
                >
                  <Download size={12} /> Télécharger QR
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

import './style.css';
import Link from 'next/link';
import { getUser } from '@/lib/supabase';
import { Coffee, LayoutDashboard, Wallet, LogIn, ScanLine } from 'lucide-react';
import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: 'Perkly — Loyalty, made delightful',
  description: 'One wallet. Every favorite place.',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Perkly Wallet'
  }
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#163f2c'
};

export default async function Layout({
  children
}: {
  children: React.ReactNode;
}) {
  const user = await getUser();
  return (
    <html lang="en">
      <body>
        <header className="topbar">
          <Link href="/" className="brand">
            <span className="brandmark">
              <Coffee size={19} />
            </span>{' '}
            perkly<span className="branddot">.</span>
          </Link>
          <nav>
            <Link href="/dashboard">
              <LayoutDashboard size={16} /> Dashboard
            </Link>
            <Link href="/wallet">
              <Wallet size={16} /> My wallet
            </Link>
            {user && (
              <Link href="/scan">
                <ScanLine size={16} /> Scan
              </Link>
            )}
            <Link className="nav-cta" href="/login">
              <LogIn size={15} />
              {user ? 'Account' : 'Get started'}
            </Link>
          </nav>
        </header>
        <main>{children}</main>
        <footer>© 2026 Perkly • Built for local favorites</footer>
      </body>
    </html>
  );
}

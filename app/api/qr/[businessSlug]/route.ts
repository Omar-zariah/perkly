import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ businessSlug: string }> }
) {
  const { businessSlug } = await params;
  const admin = supabaseAdmin();

  const { data: business } = await admin
    .from('businesses')
    .select('id, name, slug')
    .eq('slug', businessSlug)
    .single();

  if (!business) return NextResponse.json({ error: 'Business not found' }, { status: 404 });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const signupUrl = `${appUrl}/${businessSlug}`;

  try {
    const QRCode = (await import('qrcode')).default;
    const svg = await QRCode.toString(signupUrl, {
      type: 'svg',
      width: 320,
      margin: 2,
      color: { dark: '#163f2c', light: '#ffffff' },
    });
    return new NextResponse(svg, {
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch {
    return NextResponse.json({ error: 'QR generation failed' }, { status: 500 });
  }
}

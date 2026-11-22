import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ businessSlug: string }> }
) {
  const { businessSlug } = await params;
  if (!businessSlug) {
    return NextResponse.json({ error: 'Missing business slug' }, { status: 400 });
  }

  const host = req.headers.get('host') || 'localhost:3000';
  const protocol = req.headers.get('x-forwarded-proto') || (host.startsWith('localhost') ? 'http' : 'https');
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || `${protocol}://${host}`;
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
        'Content-Type': 'image/svg+xml; charset=utf-8',
        'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'QR generation failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

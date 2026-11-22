import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { normalizeMoroccoPhone } from '@/lib/phone';

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(req: NextRequest) {
  const { businessSlug, phone } = await req.json();
  if (!businessSlug || !phone) {
    return NextResponse.json({ error: 'businessSlug and phone are required' }, { status: 400 });
  }

  const phoneResult = normalizeMoroccoPhone(phone);
  if (!phoneResult.valid) {
    return NextResponse.json({ error: phoneResult.error }, { status: 400 });
  }
  const normalizedPhone = phoneResult.normalized;

  const admin = supabaseAdmin();

  // Look up business
  const { data: business } = await admin.from('businesses').select('id').eq('slug', businessSlug).single();
  if (!business) return NextResponse.json({ error: 'Business not found' }, { status: 404 });

  // Look up membership
  const { data: membership } = await admin
    .from('memberships')
    .select('id')
    .eq('business_id', business.id)
    .eq('phone', normalizedPhone)
    .single();

  if (!membership) {
    return NextResponse.json({ error: 'No membership found for this phone' }, { status: 404 });
  }

  const code = generateOtp();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes

  // Insert OTP (invalidate previous ones)
  await admin
    .from('otp_verifications')
    .delete()
    .eq('membership_id', membership.id)
    .eq('phone', normalizedPhone);

  await admin.from('otp_verifications').insert({
    membership_id: membership.id,
    phone: normalizedPhone,
    code,
    expires_at: expiresAt,
    attempts: 0,
  });

  // Send SMS if Twilio configured
  const twilioSid = process.env.TWILIO_ACCOUNT_SID;
  const twilioToken = process.env.TWILIO_AUTH_TOKEN;
  const twilioFrom = process.env.TWILIO_PHONE_NUMBER;

  if (twilioSid && twilioToken && twilioFrom) {
    try {
      const authHeader = Buffer.from(`${twilioSid}:${twilioToken}`).toString('base64');
      await fetch(`https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${authHeader}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          From: twilioFrom,
          To: normalizedPhone,
          Body: `Votre code Perkly : ${code}. Valide 10 minutes.`,
        }),
      });
      return NextResponse.json({ sent: true, simulated: false });
    } catch (err) {
      console.error('Twilio SMS error:', err);
      // Fall through to simulated
    }
  }

  // No SMS provider — log code to server console only, never expose in response
  console.log(`[OTP SIMULATED] phone=${normalizedPhone} code=${code}`);
  return NextResponse.json({ sent: true, simulated: true });
}

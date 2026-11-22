import {NextRequest,NextResponse} from 'next/server';import Stripe from 'stripe';import {supabaseAdmin} from '@/lib/supabase';
export const runtime='nodejs';
export async function POST(req:NextRequest){const sig=req.headers.get('stripe-signature');if(!sig||!process.env.STRIPE_WEBHOOK_SECRET)return new NextResponse('Missing signature', {status:400});const stripe=new Stripe(process.env.STRIPE_SECRET_KEY!);let event:Stripe.Event;try{event=stripe.webhooks.constructEvent(await req.text(),sig,process.env.STRIPE_WEBHOOK_SECRET);}catch{return new NextResponse('Bad signature',{status:400});}
 const db=supabaseAdmin();const seen=await db.from('stripe_events').select('id').eq('id',event.id).maybeSingle();if(seen.data)return NextResponse.json({ok:true});
 try {
  if(event.type==='checkout.session.completed'){const o=event.data.object as Stripe.Checkout.Session;const id=o.client_reference_id;if(id&&o.subscription&&o.customer){const sub=await stripe.subscriptions.retrieve(String(o.subscription));const {error}=await db.from('businesses').update({stripe_customer_id:String(o.customer),stripe_subscription_id:sub.id,subscription_status:sub.status,plan:sub.status==='active'||sub.status==='trialing'?'growth':'free'}).eq('id',id);if(error)throw error;}}
  if(event.type==='customer.subscription.updated'||event.type==='customer.subscription.deleted'){const sub=event.data.object as Stripe.Subscription;const {error}=await db.from('businesses').update({subscription_status:sub.status,plan:sub.status==='active'||sub.status==='trialing'?'growth':'free'}).eq('stripe_subscription_id',sub.id);if(error)throw error;}
  const {error}=await db.from('stripe_events').insert({id:event.id});if(error&&error.code!=='23505')throw error;
  return NextResponse.json({ok:true});
 }catch{return new NextResponse('Please retry',{status:500});}}

import {NextRequest,NextResponse} from 'next/server';import {session,fail,isUuid} from '@/lib/http';import {supabaseAdmin} from '@/lib/supabase';
export async function POST(req:NextRequest){const s=await session();if(!s)return fail('Sign in required',401);try{const {businessId,subject,message}=await req.json();if(!isUuid(businessId)||typeof subject!=='string'||typeof message!=='string'||subject.length<3||subject.length>100||message.length<3||message.length>1000)return fail('Invalid campaign');
 const {data:b}=await s.db.from('businesses').select('name,owner_id,plan,subscription_status').eq('id',businessId).single();if(!b||b.owner_id!==s.user.id)return fail('Owner only',403);if(b.plan!=='growth'||!['active','trialing'].includes(b.subscription_status))return fail('Growth subscription required',403);
 if(!process.env.RESEND_API_KEY)return fail('Email service not configured',503);
 const {data:recent}=await s.db.from('notification_logs').select('id').eq('business_id',businessId).gte('sent_at',new Date(Date.now()-24*3600*1000).toISOString()).limit(1);if(recent?.length)return fail('One campaign per business per 24 hours in starter',429);
 const {data:members,error}=await s.db.from('memberships').select('id,customer_id').eq('business_id',businessId).eq('marketing_opt_in',true).limit(100);if(error)return fail(error.message,500);
 const admin=supabaseAdmin();let sent=0,failed=0;
 for(const m of members||[]){const {data:user}=await admin.auth.admin.getUserById(m.customer_id);const email=user.user?.email;if(!email)continue;
 const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${process.env.RESEND_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({from:process.env.NOTIFICATION_FROM_EMAIL,to:[email],subject,text:`${message}\n\nSent by ${b.name} via Perkly. To unsubscribe, sign in to your Perkly wallet and update membership preferences.`})});
 const ok=response.ok;await admin.from('notification_logs').insert({business_id:businessId,membership_id:m.id,subject,status:ok?'sent':'failed'});ok?sent++:failed++;
 }
 return NextResponse.json({sent,failed});
 }catch{return fail('Campaign failed',500);}}

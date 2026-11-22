import { NextRequest, NextResponse } from 'next/server';import { supabaseServer } from '@/lib/supabase';
export async function GET(req:NextRequest){const url=new URL(req.url);const code=url.searchParams.get('code');if(code){const db=await supabaseServer();await db.auth.exchangeCodeForSession(code);}return NextResponse.redirect(new URL('/dashboard',url.origin));}

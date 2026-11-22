import { NextResponse } from 'next/server';
import { getUser, supabaseServer } from './supabase';
export const fail = (message:string,status=400)=>NextResponse.json({error:message},{status});
export async function session(){ const user=await getUser(); if(!user)return null; return {user,db:await supabaseServer()}; }
export const isUuid=(v:unknown)=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

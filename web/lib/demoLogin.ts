'use server';
import { timingSafeEqual } from 'crypto';
import { supabaseServer } from '@/lib/supabase/server';

// Demo accounts (demo.*@nasfestivals.com) sign in with one fixed code instead of an emailed code.
// Switched on only while DEMO_LOGIN_CODE and DEMO_LOGIN_PASSWORD are set in the environment;
// remove either variable and the whole path is off.
const DEMO = /^demo\.[a-z0-9]+@nasfestivals\.com$/;
const enabled = (email: string) => !!process.env.DEMO_LOGIN_CODE && !!process.env.DEMO_LOGIN_PASSWORD && DEMO.test(email.trim().toLowerCase());

export async function isDemoLogin(email: string): Promise<boolean> {
  return enabled(email);
}

export async function demoLogin(email: string, code: string): Promise<{ ok: boolean }> {
  const em = email.trim().toLowerCase();
  if (!enabled(em)) return { ok: false };
  const a = Buffer.from(code.trim()), b = Buffer.from(process.env.DEMO_LOGIN_CODE!);
  await new Promise((r) => setTimeout(r, 400)); // slow down guessing
  if (a.length !== b.length || !timingSafeEqual(a, b)) return { ok: false };
  const sb = await supabaseServer();
  const { error } = await sb.auth.signInWithPassword({ email: em, password: process.env.DEMO_LOGIN_PASSWORD! });
  return { ok: !error };
}

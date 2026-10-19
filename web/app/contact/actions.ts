'use server';
import { supabaseAnon } from '@/lib/supabase/server';
import { sendEmail } from '@/lib/email';

const TOPICS = ['demo', 'pricing', 'support', 'partnership'];
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

export async function sendContact(input: { name: string; email: string; org: string; phone: string; topic: string; message: string }): Promise<{ ok: boolean; error?: string }> {
  const name = input.name.trim().slice(0, 120), email = input.email.trim().toLowerCase().slice(0, 190);
  const org = input.org.trim().slice(0, 160), phone = input.phone.trim().slice(0, 30), message = input.message.trim().slice(0, 3000);
  const topic = TOPICS.includes(input.topic) ? input.topic : 'demo';
  if (name.length < 2) return { ok: false, error: 'name' };
  if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(email)) return { ok: false, error: 'email' };
  if (phone && !/^[+\d\s-]{7,20}$/.test(phone)) return { ok: false, error: 'phone' };
  const { error } = await supabaseAnon().from('contact_requests').insert({ name, email, org: org || null, phone: phone || null, topic, message: message || null });
  if (error) return { ok: false, error: 'failed' };
  // optional team notification (set CONTACT_EMAIL on the server)
  const to = process.env.CONTACT_EMAIL;
  if (to) await sendEmail(to, `NAS · ${topic} · ${name}`, `<p><b>${esc(name)}</b> &lt;${esc(email)}&gt;${phone ? ` · ${esc(phone)}` : ''}</p><p>${esc(org)}</p><p>${esc(message).replace(/\n/g, '<br>')}</p>`).catch(() => null);
  return { ok: true };
}

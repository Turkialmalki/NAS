export async function sendEmail(to: string, subject: string, html: string) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return false;
  try {
    const { Resend } = await import('resend');
    await new Resend(key).emails.send({ from: process.env.EMAIL_FROM || 'NAS <onboarding@resend.dev>', to, subject, html });
    return true;
  } catch (e) { console.error('email failed', e); return false; }
}

export const wrapEmail = (body: string) => `<div dir="rtl" style="font-family:Tahoma,Arial,sans-serif;background:#050506;color:#F5F5F7;padding:32px"><div style="max-width:520px;margin:0 auto;background:#111113;border:1px solid #26262A;border-radius:18px;padding:28px">
<div style="font-family:Georgia,serif;font-weight:700;font-size:22px;color:#C9A84C;letter-spacing:4px;margin-bottom:18px">NAS</div>${body}
<p style="color:#8A8A8F;font-size:12px;margin-top:28px">NAS · منصة المهرجانات السينمائية</p></div></div>`;

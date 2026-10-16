import { notFound } from 'next/navigation';
import { supabaseServer } from '@/lib/supabase/server';
import { embedUrl } from '@/lib/embed';
import { MiniHeader } from '@/components/Site';

export const dynamic = 'force-dynamic';

export default async function Watch({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sb = await supabaseServer();
  const { data: s } = await sb.from('submissions').select('title,ref_code,screener_url,screener_path').eq('id', id).maybeSingle();
  if (!s) notFound();
  let src: string | null = null;
  if (s.screener_path) src = (await sb.storage.from('screeners').createSignedUrl(s.screener_path, 60 * 60 * 3)).data?.signedUrl || null;
  const emb = embedUrl(s.screener_url);
  return (
    <>
      <MiniHeader />
      <main className="wrap" style={{ paddingTop: 32, paddingBottom: 60, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div><h1 style={{ fontSize: 26 }}>{s.title}</h1><span className="num" style={{ color: 'var(--faint)', direction: 'ltr', display: 'inline-block' }}>{s.ref_code}</span></div>
        <div style={{ aspectRatio: '16 / 9', borderRadius: 18, overflow: 'hidden', background: '#000', border: '1px solid var(--line)' }}>
          {src ? <video src={src} controls controlsList="nodownload" style={{ width: '100%', height: '100%' }} />
            : emb ? <iframe src={emb} allow="autoplay; fullscreen; picture-in-picture" allowFullScreen style={{ width: '100%', height: '100%', border: 0 }} />
            : s.screener_url ? <div className="empty" style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><a href={s.screener_url} target="_blank" rel="noreferrer" className="btn btn-p">افتح رابط المشاهدة</a></div>
            : <div className="empty">لا توجد نسخة مشاهدة.</div>}
        </div>
        <span className="hint">نسخة محمية — للمشاهدة داخل المنصة فقط.</span>
      </main>
    </>
  );
}

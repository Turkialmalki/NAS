'use client';

import { useT } from '@/components/Lang';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase/client';
import { extractFrames, type Frame } from '@/lib/videoFrames';
import { saveVideoReport } from '@/app/app/films/actions';
import { Icon, Spinner } from '../Icon';

/** Staff: run NAS Vision on a film already uploaded to the festival. */
export function AnalyzeExisting({ id, path, festivalId, ctx, again = false }: { id: string; path: string; festivalId: string; ctx: { title: string; synopsis: string | null; genre: string | null; category_id: string | null }; again?: boolean }) {
  const t = useT();
  const router = useRouter();
  const [state, setState] = useState<'idle' | 'look' | 'think' | 'save'>('idle');
  const [frames, setFrames] = useState<Frame[]>([]);
  const [err, setErr] = useState('');

  async function go() {
    setErr(''); setFrames([]); setState('look');
    try {
      const { data, error } = await supabaseBrowser().storage.from('screeners').createSignedUrl(path, 3600);
      if (error || !data) throw new Error('no_url');
      const ex = await extractFrames(data.signedUrl, (f) => setFrames((p) => [...p, f]));
      setState('think');
      const r = await fetch('/api/analyze-video', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ festival_id: festivalId, frames: ex.frames.map(({ t: ft, image, thumb }) => ({ t: ft, image, thumb })), stats: ex.stats, title: ctx.title, synopsis: ctx.synopsis || '', genre: ctx.genre || '', category_id: ctx.category_id }),
      }).then((x) => x.json());
      if (!r?.report) throw new Error('no_report');
      setState('save');
      const s = await saveVideoReport(id, r.report, r.sig);
      if (!s.ok) throw new Error(s.error);
      setState('idle'); router.refresh();
    } catch (e) {
      setState('idle');
      setErr(String((e as Error).message) === 'no_url' ? t('تعذّر فتح ملف الفيلم.') : t('تعذّر تحليل الفيديو. قد يكون ترميز الملف غير مدعوم في المتصفح.'));
    }
  }

  if (state !== 'idle') {
    return (
      <div className="vision" style={{ padding: 14 }}>
        <div className="strip film-strip">
          {Array.from({ length: 12 }, (_, i) => <span key={i} className="cell" data-on={frames[i] ? 1 : undefined}>{frames[i] && /* eslint-disable-next-line @next/next/no-img-element */ <img src={frames[i].thumb} alt="" />}</span>)}
          <span className="scan" />
        </div>
        <span style={{ display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'center', fontSize: 13, color: 'var(--muted)' }}><Spinner size={13} />
          {state === 'look' ? t('نلتقط المشاهد ({length}/12)…', { length: frames.length }) : state === 'think' ? t('NAS Vision يحلّل اللقطات…') : t('نحفظ التقرير…')}</span>
      </div>
    );
  }
  return (
    <>
      <button type="button" className={again ? 'btn btn-g btn-sm' : 'btn btn-p btn-sm'} style={{ alignSelf: 'flex-start' }} onClick={go}><Icon name="spark" size={14} />{again ? t('أعد تحليل الفيديو') : t('حلّل الفيديو بالذكاء الاصطناعي')}</button>
      {err && <span className="err">{t(err)}</span>}
    </>
  );
}

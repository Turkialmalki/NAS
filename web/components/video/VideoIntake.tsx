'use client';

import { useT } from '@/components/Lang';
import { useEffect, useRef, useState } from 'react';
import { extractFrames, type Frame } from '@/lib/videoFrames';
import { uploadScreener, uploadError } from '@/lib/upload';
import type { VideoAnalysis } from '@/lib/videoAnalysis';
import { Icon, Spinner } from '../Icon';
import { VideoReport } from './VideoReport';

export type Ctx = { title?: string; synopsis?: string; genre?: string; category_id?: string | null };
type Stage = 'idle' | 'read' | 'look' | 'think' | 'done' | 'noread';
const STAGES: [Exclude<Stage, 'idle' | 'noread'>, string][] = [['read', 'فتح الفيلم'], ['look', 'التقاط المشاهد والألوان والإيقاع'], ['think', 'مشاهدة الفيلم بالذكاء الاصطناعي'], ['done', 'التقرير']];
const THINK = ['يقرأ العنوان والنصوص على الشاشة…', 'يحلّل التصوير والإضاءة والتكوين…', 'يتعرّف على الشخصيات والمكان…', 'يكتب ملخصًا ووصفًا لكل مشهد…', 'يقيّم الحرفة ويقترح القسم الأنسب…'];

/** Pick a film → it uploads and NAS Vision analyses it at the same time. */
export function VideoIntake({ folder, festivalId, ctx, onUploaded, onReport, onDuration, onUseSynopsis, compact = false }: {
  folder: string; festivalId: string; ctx: () => Ctx; compact?: boolean;
  onUploaded: (path: string | null) => void; onReport?: (r: VideoAnalysis | null, sig: string | null) => void;
  onDuration?: (mins: number) => void; onUseSynopsis?: (tx: string) => void;
}) {
  const t = useT();
  const [file, setFile] = useState<File | null>(null);
  const [stage, setStage] = useState<Stage>('idle');
  const [frames, setFrames] = useState<Frame[]>([]);
  const [pct, setPct] = useState(0);
  const [uploaded, setUploaded] = useState(false);
  const [report, setReport] = useState<VideoAnalysis | null>(null);
  const [err, setErr] = useState('');
  const [drag, setDrag] = useState(false);
  const [prog, setProg] = useState(0);
  const [tick, setTick] = useState(0);
  const run = useRef(0);
  useEffect(() => { if (stage !== 'think') return; const t = setInterval(() => setTick((x) => x + 1), 2200); return () => clearInterval(t); }, [stage]);

  async function pick(fl: File | null | undefined) {
    if (!fl) return;
    if (!/^video\//.test(fl.type) && !/\.(mp4|mov|m4v|webm|mkv)$/i.test(fl.name)) { setErr(t('اختر ملف فيديو (MP4 أو MOV).')); return; }
    const id = ++run.current;
    setFile(fl); setErr(''); setFrames([]); setProg(0); setTick(0); setReport(null); setPct(0); setUploaded(false); setStage('read');
    onUploaded(null); onReport?.(null, null);

    const up = uploadScreener(fl, folder, (p) => run.current === id && setPct(p))
      .then((path) => { if (run.current !== id) return; setUploaded(true); onUploaded(path); })
      .catch((e) => { if (run.current !== id) return; setErr(uploadError(e)); setPct(0); });

    try {
      const ex = await extractFrames(fl, (f) => { if (run.current !== id) return; setStage('look'); setFrames((p) => [...p, f]); }, (p) => run.current === id && setProg(p));
      if (run.current !== id) return;
      onDuration?.(Math.max(1, Math.round(ex.stats.duration / 60)));
      setStage('think');
      const c = ctx();
      const r = await fetch('/api/analyze-video', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ festival_id: festivalId, frames: ex.frames.map(({ t: ft, image, thumb }) => ({ t: ft, image, thumb })), stats: ex.stats, ...c }),
      }).then((x) => x.json()).catch(() => null);
      if (run.current !== id) return;
      if (r?.report) { setReport(r.report); onReport?.(r.report, r.sig); setStage('done'); }
      else { setStage('noread'); }
    } catch {
      if (run.current === id) setStage('noread');
    }
    await up;
  }

  const working = stage !== 'idle' && stage !== 'done' && stage !== 'noread';
  const si = STAGES.findIndex(([k]) => k === stage);

  if (stage === 'idle') {
    return (
      <>
        <label onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)} onDrop={(e) => { e.preventDefault(); setDrag(false); pick(e.dataTransfer.files?.[0]); }}
          className="drop" data-on={drag || undefined}>
          <input type="file" accept="video/*,.mov,.mkv" style={{ display: 'none' }} onChange={(e) => pick(e.target.files?.[0])} />
          <span className="drop-ic"><Icon name="film" size={24} /></span>
          <b style={{ fontSize: 17, color: 'var(--ink)' }}>{t('اسحب ملف الفيلم هنا أو اختره')}</b>
          <span style={{ fontSize: 13.5 }}>{t('MP4 أو MOV · يُرفع بأمان ويُحلَّل أثناء الرفع')}</span>
          <span className="chip c-acc" style={{ marginTop: 4 }}><Icon name="spark" size={12} />{t('تحليل NAS Vision بالذكاء الاصطناعي')}</span>
        </label>
        {err && <span className="err">{t(err)}</span>}
      </>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <span className="drop-ic" style={{ width: 40, height: 40 }}><Icon name="film" size={18} /></span>
        <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <b style={{ fontSize: 14.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', direction: 'ltr', textAlign: 'right' }}>{file?.name}</b>
          <span style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12.5, color: 'var(--muted)' }}>
            <span className="bar" style={{ flex: 1, height: 5 }}><span style={{ width: `${uploaded ? 100 : pct}%`, transition: 'width .4s' }} /></span>
            <span className="num" style={{ flex: 'none' }}>{uploaded ? t('رُفع ✓') : err ? t('لم يُرفع') : t('{pct}٪', { pct: pct })}</span>
          </span>
        </span>
        <label className="btn btn-g btn-sm" style={{ cursor: 'pointer' }}>
          <input type="file" accept="video/*,.mov,.mkv" style={{ display: 'none' }} onChange={(e) => pick(e.target.files?.[0])} />{t('غيّر الملف')}</label>
      </div>
      {err && <span className="err">{t(err)}</span>}

      {working && (
        <div className="vision" aria-live="polite">
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {STAGES.map(([k, tx], i) => (
              <span key={k} className="stage" data-s={i < si ? 'done' : i === si ? 'on' : 'off'}>
                <b>{i < si ? '✓' : i === si ? <Spinner size={12} /> : '•'}</b>{t(tx)}
              </span>
            ))}
          </div>
          <div className="strip film-strip">
            {Array.from({ length: 12 }, (_, i) => {
              const f = frames[i];
              return <span key={i} className="cell" data-on={f ? 1 : undefined}>{f && /* eslint-disable-next-line @next/next/no-img-element */ <img src={f.thumb} alt="" />}</span>;
            })}
            <span className="scan" />
          </div>
          <span style={{ fontSize: 13.5, color: 'var(--muted)', textAlign: 'center' }}>
            {stage === 'read' ? t('نفتح الفيلم داخل متصفحك…') : stage === 'look' ? t('نمرّ على الفيلم كاملًا… {v0}٪', { v0: Math.round(prog * 100) }) : `NAS Vision ${t(THINK[tick % THINK.length])}`}
          </span>
        </div>
      )}

      {stage === 'noread' && (
        <div style={{ padding: 16, borderRadius: 14, background: 'var(--s2)', fontSize: 14, color: 'var(--ink2)', lineHeight: 1.8 }}>
          {t('لم يتمكن المتصفح من قراءة صورة هذا الملف (قد يكون الترميز غير مدعوم). سيُرفع الفيلم كما هو، وتحلّل اللجنة بياناته بعد الإرسال.')}</div>
      )}
      {report && <VideoReport r={report} compact={compact} onUseSynopsis={onUseSynopsis} />}
    </div>
  );
}

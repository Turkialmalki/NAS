'use client';
import { useState } from 'react';
import type { VideoAnalysis } from '@/lib/videoAnalysis';
import { ar } from '@/lib/fmt';
import { Ring } from '../app/ui';

const clock = (s: number) => {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = Math.floor(s % 60);
  return (h ? `${h}:${String(m).padStart(2, '0')}` : `${m}`) + `:${String(x).padStart(2, '0')}`;
};
const mb = (n: number | null) => (n == null ? null : n > 1e9 ? `${(n / 1e9).toFixed(1)} GB` : `${Math.round(n / 1e6)} MB`);

export function VideoReport({ r, compact = false, onUseSynopsis }: { r: VideoAnalysis; compact?: boolean; onUseSynopsis?: (t: string) => void }) {
  const [scene, setScene] = useState(0);
  const sc = r.scenes[scene];
  const ai = !/builtin/.test(r.model);
  const box: React.CSSProperties = { padding: compact ? 14 : 18, borderRadius: 16, background: 'var(--s2)', display: 'flex', flexDirection: 'column', gap: 10 };
  return (
    <div className="rise" style={{ display: 'flex', flexDirection: 'column', gap: compact ? 14 : 18 }}>
      <div style={{ display: 'flex', gap: compact ? 14 : 20, alignItems: 'center', flexWrap: 'wrap' }}>
        <Ring score={r.score} size={compact ? 72 : 96} />
        <span style={{ flex: 1, minWidth: 200, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <b style={{ fontSize: compact ? 15.5 : 19, lineHeight: 1.55 }}>{r.headline}</b>
          {r.logline && <span style={{ fontSize: compact ? 13.5 : 14.5, color: 'var(--muted)', lineHeight: 1.75 }}>{r.logline}</span>}
        </span>
      </div>

      <span style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {r.genre_guess && <span className="chip c-acc">{r.genre_guess}</span>}
        {r.mood.map((t) => <span key={'m' + t} className="chip c-vio">{t}</span>)}
        {r.style.map((t) => <span key={'s' + t} className="chip c-mute">{t}</span>)}
        {r.themes.map((t) => <span key={'t' + t} className="chip c-info">{t}</span>)}
      </span>

      {r.scenes.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {sc?.thumb && (
            <div style={{ position: 'relative', borderRadius: 14, overflow: 'hidden', background: '#000', aspectRatio: `${r.tech.width} / ${r.tech.height}`, maxHeight: compact ? 200 : 340 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={sc.thumb} alt={sc.caption || `لقطة عند ${clock(sc.t)}`} style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} />
              <span style={{ position: 'absolute', insetInline: 0, bottom: 0, padding: '28px 14px 12px', background: 'linear-gradient(transparent, rgba(0,0,0,.82))', color: '#fff', fontSize: 13.5, lineHeight: 1.6, display: 'flex', gap: 10, alignItems: 'flex-end' }}>
                <b className="num" style={{ direction: 'ltr', color: '#DDBF6E', flex: 'none' }}>{clock(sc.t)}</b>{sc.caption}
              </span>
            </div>
          )}
          <div className="strip" role="list" aria-label="لقطات من الفيلم">
            {r.scenes.map((s, i) => (
              <button key={i} type="button" role="listitem" onClick={() => setScene(i)} aria-pressed={scene === i} aria-label={`لقطة ${i + 1}`}
                style={{ flex: 'none', width: compact ? 64 : 92, aspectRatio: '16/9', borderRadius: 8, overflow: 'hidden', padding: 0, cursor: 'pointer', background: '#000', border: `2px solid ${scene === i ? 'var(--acc)' : 'transparent'}`, opacity: scene === i ? 1 : 0.72 }}>
                {s.thumb && /* eslint-disable-next-line @next/next/no-img-element */ <img src={s.thumb} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="g2" style={{ display: 'grid', gridTemplateColumns: compact ? '1fr' : 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
        <div style={box}>
          <b style={{ fontSize: 14 }}>الحرفة البصرية</b>
          {r.craft.map((c) => <span key={c.label} style={{ fontSize: 13.5, color: 'var(--ink2)', lineHeight: 1.7 }}><b style={{ color: 'var(--ink)' }}>{c.label}: </b>{c.note}</span>)}
        </div>
        <div style={box}>
          <b style={{ fontSize: 14 }}>البيانات التقنية</b>
          <span style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <span className="chip c-mute num" style={{ direction: 'ltr' }}>{clock(r.tech.duration)}</span>
            <span className="chip c-mute">{r.tech.resolution}</span>
            <span className="chip c-mute num" style={{ direction: 'ltr' }}>{r.tech.width}×{r.tech.height}</span>
            <span className="chip c-mute">{r.tech.aspect}</span>
            {mb(r.tech.size) && <span className="chip c-mute num" style={{ direction: 'ltr' }}>{mb(r.tech.size)}</span>}
          </span>
          {r.palette.length > 0 && <>
            <span style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 4 }}>لوحة الألوان</span>
            <span style={{ display: 'flex', borderRadius: 10, overflow: 'hidden', height: 28 }}>{r.palette.map((c) => <span key={c} title={c} style={{ flex: 1, background: c }} />)}</span>
          </>}
          {r.setting && <span style={{ fontSize: 13.5, color: 'var(--ink2)', lineHeight: 1.7 }}><b style={{ color: 'var(--ink)' }}>المكان والزمن: </b>{r.setting}</span>}
        </div>
      </div>

      <div className="g2" style={{ display: 'grid', gridTemplateColumns: compact ? '1fr' : 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
        <div style={box}>
          <b style={{ fontSize: 14 }}>فحص الجاهزية</b>
          {r.checks.map((c) => <span key={c.text} style={{ display: 'flex', gap: 10, fontSize: 13.5, color: 'var(--ink2)', lineHeight: 1.6 }}><b style={{ color: c.ok ? 'var(--ok)' : 'var(--acc)' }}>{c.ok ? '✓' : '!'}</b>{c.text}</span>)}
          {r.flags.map((f) => <span key={f} style={{ display: 'flex', gap: 10, fontSize: 13.5, color: 'var(--ink2)' }}><b style={{ color: 'var(--no)' }}>⚑</b>{f}</span>)}
        </div>
        {r.fit.length > 0 && (
          <div style={box}>
            <b style={{ fontSize: 14 }}>القسم الأنسب</b>
            {r.fit.map((x) => (
              <div key={x.category} style={{ display: 'grid', gridTemplateColumns: '96px minmax(0,1fr) 40px', gap: 8, alignItems: 'center', fontSize: 13 }}>
                <span style={{ color: 'var(--ink2)' }}>{x.category}</span><span className="bar"><span style={{ width: `${x.pct}%` }} /></span><b className="num" style={{ textAlign: 'end' }}>{ar(x.pct)}٪</b>
              </div>
            ))}
          </div>
        )}
      </div>

      {(r.strengths.length > 0 || r.watch.length > 0) && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {r.strengths.map((s) => <span key={s} style={{ fontSize: 14, color: 'var(--ink2)', lineHeight: 1.7 }}><b style={{ color: 'var(--ok)' }}>+ </b>{s}</span>)}
          {r.watch.map((s) => <span key={s} style={{ fontSize: 14, color: 'var(--ink2)', lineHeight: 1.7 }}><b style={{ color: 'var(--acc)' }}>◦ </b>{s}</span>)}
        </div>
      )}

      {r.synopsis_draft && (
        <div style={{ ...box, background: 'var(--accT)' }}>
          <b style={{ fontSize: 14 }}>ملخص مقترح من الصورة</b>
          <span style={{ fontSize: 14, color: 'var(--ink2)', lineHeight: 1.85 }}>{r.synopsis_draft}</span>
          {onUseSynopsis && <button type="button" className="btn btn-q btn-sm" style={{ alignSelf: 'flex-start' }} onClick={() => onUseSynopsis(r.synopsis_draft)}>استخدم هذا الملخص</button>}
        </div>
      )}
      <span style={{ fontSize: 12, color: 'var(--faint)' }}>{ai ? 'تحليل NAS Vision بالذكاء الاصطناعي من لقطات الفيلم.' : 'قراءة NAS Vision للصورة والإضاءة واللون.'} يساعد اللجنة ولا يحل محل المشاهدة.</span>
    </div>
  );
}

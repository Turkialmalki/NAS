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
const n1 = (x: number) => ar(x.toFixed(1)).replace('.', '٫');

function Pulse({ energy, light }: { energy: number[]; light: number[] }) {
  if (energy.length < 3) return null;
  const W = 600, H = 70, max = Math.max(0.25, ...energy);
  const pts = (arr: number[], top: number) => arr.map((e, i) => `${((i / (arr.length - 1)) * W).toFixed(1)},${(H - (e / top) * (H - 6) - 3).toFixed(1)}`).join(' ');
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: '100%', height: 70, display: 'block', transform: 'scaleX(-1)' }} aria-hidden="true">
      <defs><linearGradient id="vg" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="var(--acc)" stopOpacity=".35" /><stop offset="1" stopColor="var(--acc)" stopOpacity="0" /></linearGradient></defs>
      {light.length > 2 && <polyline points={pts(light, 1)} fill="none" stroke="var(--info)" strokeOpacity=".55" strokeWidth="1.5" strokeDasharray="3 4" vectorEffect="non-scaling-stroke" />}
      <polygon points={`0,${H} ${pts(energy, max)} ${W},${H}`} fill="url(#vg)" />
      <polyline points={pts(energy, max)} fill="none" stroke="var(--acc)" strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
    </svg>
  );
}

export function VideoReport({ r, compact = false, onUseSynopsis }: { r: VideoAnalysis; compact?: boolean; onUseSynopsis?: (t: string) => void }) {
  const [scene, setScene] = useState(r.key_scene ?? 0);
  const sc = r.scenes[scene] || r.scenes[0];
  const ai = !/builtin/.test(r.model);
  const box: React.CSSProperties = { padding: compact ? 14 : 18, borderRadius: 16, background: 'var(--s2)', display: 'flex', flexDirection: 'column', gap: 10 };
  const grid = (n: number): React.CSSProperties => ({ display: 'grid', gridTemplateColumns: compact ? '1fr' : `repeat(${n}, minmax(0, 1fr))`, gap: 12 });
  const meta = [r.subgenre || r.genre_guess, r.tech ? `${ar(Math.max(1, Math.round(r.tech.duration / 60)))} دقيقة` : null, r.language_guess, r.age_rating].filter(Boolean).join(' · ');

  return (
    <div className="rise vr" style={{ display: 'flex', flexDirection: 'column', gap: compact ? 14 : 18 }}>
      {/* hero */}
      <div style={{ position: 'relative', borderRadius: 20, overflow: 'hidden', background: '#000', minHeight: compact ? 190 : 300, display: 'flex' }}>
        {sc?.thumb && /* eslint-disable-next-line @next/next/no-img-element */ <img src={sc.thumb} alt={sc.caption || 'لقطة من الفيلم'} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', filter: 'saturate(1.05)' }} />}
        <span style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,.05) 20%, rgba(0,0,0,.88) 100%)' }} />
        <div style={{ position: 'relative', marginTop: 'auto', padding: compact ? 14 : 22, display: 'flex', gap: 16, alignItems: 'flex-end', width: '100%', color: '#fff' }}>
          <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: 12, color: '#DDBF6E', fontWeight: 600, letterSpacing: '.02em' }}>✦ NAS Vision{meta ? ` · ${meta}` : ''}</span>
            {r.title_guess && <b style={{ fontSize: compact ? 19 : 28, lineHeight: 1.3 }}>{r.title_guess}</b>}
            <span style={{ fontSize: compact ? 13.5 : 16, lineHeight: 1.7, color: 'rgba(255,255,255,.9)' }}>{r.logline || r.headline}</span>
          </span>
          <span style={{ flex: 'none', background: 'rgba(0,0,0,.35)', borderRadius: '50%', padding: 3 }}><Ring score={r.score} size={compact ? 64 : 92} /></span>
        </div>
      </div>
      {r.logline && <b style={{ fontSize: compact ? 14.5 : 17, lineHeight: 1.6 }}>{r.headline}</b>}

      <span style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {r.genre_guess && <span className="chip c-acc">{r.genre_guess}</span>}
        {r.mood.map((t) => <span key={'m' + t} className="chip c-vio">{t}</span>)}
        {r.style.map((t) => <span key={'s' + t} className="chip c-mute">{t}</span>)}
        {r.themes.map((t) => <span key={'t' + t} className="chip c-info">{t}</span>)}
      </span>

      {/* colour barcode + pacing */}
      {r.barcode?.length > 0 && (
        <div style={box}>
          <span style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}><b style={{ fontSize: 14 }}>بصمة الفيلم</b><span style={{ fontSize: 12, color: 'var(--faint)' }}>الألوان والإيقاع من البداية إلى النهاية</span></span>
          <div style={{ display: 'flex', height: compact ? 34 : 48, borderRadius: 10, overflow: 'hidden', direction: 'ltr', flexDirection: 'row-reverse' }}>{r.barcode.map((c, i) => <span key={i} style={{ flex: 1, background: c }} />)}</div>
          <Pulse energy={r.energy || []} light={r.light || []} />
          <span style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, color: 'var(--faint)' }}><span>البداية</span><span><b style={{ color: 'var(--acc)' }}>━</b> حركة الصورة · <b style={{ color: 'var(--info)' }}>┅</b> الإضاءة</span><span className="num" style={{ direction: 'ltr' }}>{clock(r.tech.duration)}</span></span>
        </div>
      )}

      {/* scores */}
      {r.breakdown?.length > 0 && (
        <div style={box}>
          <b style={{ fontSize: 14 }}>التقييم بالتفصيل</b>
          {r.breakdown.map((b) => (
            <div key={b.label} style={{ display: 'grid', gridTemplateColumns: '110px minmax(0,1fr) 36px', gap: 10, alignItems: 'center', fontSize: 13.5 }}>
              <span style={{ color: 'var(--ink2)' }}>{b.label}</span><span className="bar" style={{ height: 8 }}><span style={{ width: `${b.score * 10}%` }} /></span><b className="num" style={{ textAlign: 'end' }}>{n1(b.score)}</b>
            </div>
          ))}
        </div>
      )}

      {/* scene by scene */}
      {r.scenes.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <b style={{ fontSize: 14 }}>المشاهد</b>
          <div className="strip" role="list" aria-label="مشاهد من الفيلم" style={{ gap: 10 }}>
            {r.scenes.map((s, i) => (
              <button key={i} type="button" role="listitem" onClick={() => setScene(i)} aria-pressed={scene === i}
                style={{ flex: 'none', width: compact ? 132 : 176, padding: 0, borderRadius: 12, overflow: 'hidden', cursor: 'pointer', background: 'var(--s2)', border: `2px solid ${scene === i ? 'var(--acc)' : 'transparent'}`, textAlign: 'start', color: 'inherit', display: 'flex', flexDirection: 'column' }}>
                <span style={{ position: 'relative', aspectRatio: '16/9', background: '#000', display: 'block' }}>
                  {s.thumb && /* eslint-disable-next-line @next/next/no-img-element */ <img src={s.thumb} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />}
                  <span className="num" style={{ position: 'absolute', bottom: 4, insetInlineStart: 6, fontSize: 11, background: 'rgba(0,0,0,.65)', color: '#DDBF6E', padding: '1px 6px', borderRadius: 6, direction: 'ltr' }}>{clock(s.t)}</span>
                  {i === r.key_scene && <span style={{ position: 'absolute', top: 4, insetInlineEnd: 6, fontSize: 10.5, background: 'var(--acc)', color: '#0A0A0A', padding: '1px 6px', borderRadius: 6, fontWeight: 700 }}>الأقوى</span>}
                </span>
                {s.caption && <span style={{ padding: '8px 10px', fontSize: 12.5, lineHeight: 1.6, color: 'var(--ink2)', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{s.caption}</span>}
              </button>
            ))}
          </div>
        </div>
      )}

      {r.programmer_note && (
        <div style={{ ...box, background: 'var(--accT)', borderInlineStart: '3px solid var(--acc)' }}>
          <b style={{ fontSize: 14 }}>ملاحظة المبرمج</b>
          <span style={{ fontSize: 14.5, color: 'var(--ink)', lineHeight: 1.9 }}>«{r.programmer_note}»</span>
        </div>
      )}

      <div className="g2" style={grid(2)}>
        <div style={box}>
          <b style={{ fontSize: 14 }}>الحرفة السينمائية</b>
          {r.craft.map((c) => (
            <span key={c.label} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <span style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13.5 }}><b>{c.label}</b>{c.score != null && <b className="num" style={{ color: 'var(--accHi)' }}>{n1(c.score)}</b>}</span>
              <span style={{ fontSize: 13, color: 'var(--ink2)', lineHeight: 1.7 }}>{c.note}</span>
            </span>
          ))}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {r.characters?.length > 0 && (
            <div style={box}>
              <b style={{ fontSize: 14 }}>الشخصيات الظاهرة</b>
              {r.characters.map((c) => <span key={c.who} style={{ fontSize: 13.5, color: 'var(--ink2)', lineHeight: 1.7 }}><b style={{ color: 'var(--ink)' }}>{c.who}: </b>{c.note}</span>)}
            </div>
          )}
          <div style={box}>
            <b style={{ fontSize: 14 }}>الجمهور والسياق</b>
            {r.setting && <span style={{ fontSize: 13.5, color: 'var(--ink2)', lineHeight: 1.7 }}><b style={{ color: 'var(--ink)' }}>المكان والزمن: </b>{r.setting}</span>}
            {r.audience && <span style={{ fontSize: 13.5, color: 'var(--ink2)', lineHeight: 1.7 }}><b style={{ color: 'var(--ink)' }}>الجمهور: </b>{r.audience}{r.age_rating ? ` · ${r.age_rating}` : ''}</span>}
            {r.comparables?.length > 0 && <span style={{ fontSize: 13.5, color: 'var(--ink2)', lineHeight: 1.7 }}><b style={{ color: 'var(--ink)' }}>أسلوب قريب من: </b>{r.comparables.join('، ')}</span>}
            <span style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <span className="chip c-mute num" style={{ direction: 'ltr' }}>{clock(r.tech.duration)}</span>
              <span className="chip c-mute">{r.tech.resolution}</span>
              <span className="chip c-mute num" style={{ direction: 'ltr' }}>{r.tech.width}×{r.tech.height}</span>
              <span className="chip c-mute">{r.tech.aspect}</span>
              {r.tech.pace && <span className="chip c-mute">إيقاع {r.tech.pace}</span>}
              {r.tech.audio != null && <span className={`chip ${r.tech.audio ? 'c-mute' : 'c-no'}`}>{r.tech.audio ? 'صوت ✓' : 'بلا صوت'}</span>}
              {mb(r.tech.size) && <span className="chip c-mute num" style={{ direction: 'ltr' }}>{mb(r.tech.size)}</span>}
            </span>
            {r.palette.length > 0 && <span style={{ display: 'flex', borderRadius: 10, overflow: 'hidden', height: 22, marginTop: 2 }}>{r.palette.map((c) => <span key={c} title={c} style={{ flex: 1, background: c }} />)}</span>}
          </div>
        </div>
      </div>

      <div className="g2" style={grid(2)}>
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
      {r.tags?.length > 0 && <span style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>{r.tags.map((t) => <span key={t} className="chip c-mute">#{t}</span>)}</span>}

      {r.synopsis_draft && (
        <div style={{ ...box, background: 'var(--accT)' }}>
          <b style={{ fontSize: 14 }}>ملخص مقترح من الفيلم</b>
          <span style={{ fontSize: 14, color: 'var(--ink2)', lineHeight: 1.85 }}>{r.synopsis_draft}</span>
          {onUseSynopsis && <button type="button" className="btn btn-q btn-sm" style={{ alignSelf: 'flex-start' }} onClick={() => onUseSynopsis(r.synopsis_draft)}>استخدم هذا الملخص</button>}
        </div>
      )}
      <span style={{ fontSize: 12, color: 'var(--faint)' }}>{ai ? 'تقرير NAS Vision بالذكاء الاصطناعي من مشاهد الفيلم.' : 'قراءة NAS Vision للصورة والضوء واللون والإيقاع. يكتمل التقرير بوصف المشاهد عند تفعيل الذكاء الاصطناعي.'} يساعد اللجنة ولا يحل محل المشاهدة.</span>
    </div>
  );
}

'use client';
import { useState } from 'react';
import Link from 'next/link';
import type { MyFilm, MySub } from '@/lib/me';
import type { Rec, RecFestival } from '@/lib/recommend';
import { useT } from '../Lang';
import { Icon } from '../Icon';
import { SubmitDialog } from './SubmitDialog';

export function Poster({ film, h = 150 }: { film: MyFilm; h?: number }) {
  return (
    <span className="poster" style={{ height: h }}>
      {film.poster ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={film.poster} alt="" /> : <span className="poster-ph display">{film.title.slice(0, 1)}</span>}
      {film.score != null && <span className="poster-score num">✦ {film.score.toFixed(1)}</span>}
    </span>
  );
}

export function Readiness({ pct, size = 34 }: { pct: number; size?: number }) {
  return (
    <span className="ring" style={{ width: size, height: size, background: `conic-gradient(${pct === 100 ? 'var(--ok)' : 'var(--acc)'} 0 ${pct}%, var(--s3) ${pct}% 100%)` }}>
      <span style={{ width: size - 7, height: size - 7, fontSize: size * 0.3, fontWeight: 700 }} className="num">{pct}</span>
    </span>
  );
}

export function Stages({ s }: { s: MySub }) {
  const t = useT();
  const steps = ['أُرسلت', 'قيد المراجعة', s.result === 'selected' ? 'اختير ✦' : s.result === 'not_selected' ? 'لم يُختر' : 'النتيجة'];
  const at = s.stage === 'decided' ? 2 : s.stage === 'review' ? 1 : 0;
  return (
    <span className="stages" aria-label={t(steps[at])}>
      {steps.map((x, i) => (
        <span key={x} className="st" data-s={i < at ? 'done' : i === at ? (i === 2 ? s.result || 'on' : 'on') : 'off'}>
          <span className="dot" /><span className="lb">{t(x)}</span>
        </span>
      ))}
    </span>
  );
}

export function MeHome({ name, films, subs, festivals, recs }: { name: string; films: MyFilm[]; subs: MySub[]; festivals: RecFestival[]; recs: Rec[] }) {
  const t = useT();
  const [submit, setSubmit] = useState<{ film?: string; fest?: string } | null>(null);
  const hour = new Date().getHours();
  const selected = subs.filter((s) => s.result === 'selected').length;
  const inReview = subs.filter((s) => s.stage !== 'decided').length;

  return (
    <>
      <section className="hero-me rise">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1, minWidth: 260 }}>
          <span className="eyebrow">{t(hour < 12 ? 'صباح الخير' : 'مساء الخير')}</span>
          <h1 style={{ fontSize: 40, lineHeight: 1.2 }}>{name.split(' ')[0]}</h1>
          <span style={{ color: 'var(--muted)', fontSize: 16, lineHeight: 1.8 }}>
            {films.length === 0 ? t('ارفع فيلمك الأول، ويجهّز NAS Vision ملفه كاملًا في دقائق.')
              : t('{f} أفلام · {s} مشاركات · {r} قيد المراجعة', { f: films.length, s: subs.length, r: inReview })}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Link href="/app/me/films/new" className="btn btn-p btn-lg"><Icon name="up" size={17} />{t('أضف فيلمًا')}</Link>
          {films.length > 0 && festivals.length > 0 && <button type="button" className="btn btn-s btn-lg" onClick={() => setSubmit({})}>{t('قدّم لمهرجان')}</button>}
        </div>
        {selected > 0 && <span className="win-badge"><Icon name="spark" size={14} />{t('اختير لك {n} فيلم', { n: selected })}</span>}
      </section>

      {films.length === 0 ? (
        <Link href="/app/me/films/new" className="drop" style={{ minHeight: 240 }}>
          <span className="drop-ic" style={{ width: 64, height: 64, borderRadius: 20 }}><Icon name="film" size={28} /></span>
          <b style={{ fontSize: 20, color: 'var(--ink)' }}>{t('ارفع فيلمك الأول')}</b>
          <span style={{ fontSize: 15, maxWidth: 460, lineHeight: 1.8 }}>{t('نشاهده بالذكاء الاصطناعي، ونكتب ملخصه، ونقترح نوعه والقسم المناسب له، ثم تقدّم به لأي مهرجان بضغطة.')}</span>
        </Link>
      ) : (
        <section className="sec">
          <div className="sec-h"><h2>{t('أفلامي')}</h2><Link href="/app/me/films" className="link">{t('عرض الكل')}</Link></div>
          <div className="film-row">
            {films.slice(0, 8).map((f) => (
              <Link key={f.id} href={`/app/me/films/${f.id}`} className="film-card">
                <Poster film={f} />
                <span style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px' }}>
                  <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <b style={{ fontSize: 15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.title}</b>
                    <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>{[f.genre && t(f.genre), f.duration_min ? t('{n} د', { n: f.duration_min }) : null].filter(Boolean).join(' · ') || t('أكمل البيانات')}</span>
                  </span>
                  <Readiness pct={f.pct} />
                </span>
              </Link>
            ))}
            <Link href="/app/me/films/new" className="film-card add"><Icon name="plus" size={26} /><span>{t('فيلم جديد')}</span></Link>
          </div>
        </section>
      )}

      {recs.length > 0 && (
        <section className="sec">
          <div className="sec-h"><h2><span style={{ color: 'var(--acc)' }}>✦</span> {t('مهرجانات تناسب أفلامك')}</h2><Link href="/app/me/festivals" className="link">{t('كل المهرجانات')}</Link></div>
          <div className="g3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 14 }}>
            {recs.slice(0, 6).map((r) => {
              const days = r.festival.submissions_close ? Math.ceil((new Date(r.festival.submissions_close).getTime() - Date.now()) / 86400000) : null;
              return (
                <div key={r.festival.id + r.film.id} className="card rec">
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                    <span style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
                      <b style={{ fontSize: 16 }}>{r.festival.name}</b>
                      <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>{[r.festival.city, days != null ? t('يغلق بعد {n} يومًا', { n: Math.max(0, days) }) : t('التقديم مفتوح')].filter(Boolean).join(' · ')}</span>
                    </span>
                    <span className="match num">{t('{n}% تطابق', { n: r.pct })}</span>
                  </div>
                  <span style={{ fontSize: 13.5, color: 'var(--ink2)' }}>{t('لفيلم «{f}»', { f: r.film.title })}{r.categoryName ? ` · ${r.categoryName}` : ''}</span>
                  <span style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>{r.reasons.map((x) => <span key={x.k} style={{ fontSize: 12.5, color: 'var(--muted)' }}>• {t(x.k, x.v)}</span>)}</span>
                  <button type="button" className="btn btn-q btn-sm" style={{ marginTop: 'auto' }} onClick={() => setSubmit({ film: r.film.id, fest: r.festival.id })}>{t('قدّم الآن')}</button>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <section className="sec">
        <div className="sec-h"><h2>{t('مشاركاتي')}</h2></div>
        {subs.length === 0 ? (
          <div className="card empty">{films.length ? t('لم تقدّم لأي مهرجان بعد. اختر مهرجانًا من المقترحات أعلاه.') : t('مشاركاتك تظهر هنا بعد أن تقدّم لأول مهرجان.')}</div>
        ) : (
          <div className="card" style={{ padding: '6px 18px' }}>
            {subs.map((s) => (
              <div key={s.id} className="sub-row">
                <span style={{ flex: 1, minWidth: 180, display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <b style={{ fontSize: 15 }}>{s.title}</b>
                  <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>{[s.festival, s.category].filter(Boolean).join(' · ')} · <span className="num" style={{ direction: 'ltr', display: 'inline-block' }}>{s.ref_code}</span></span>
                </span>
                <Stages s={s} />
                <span style={{ fontSize: 12.5, color: 'var(--faint)', minWidth: 110, textAlign: 'end' }}>{s.stage !== 'decided' && s.results_on ? t('النتائج {d}', { d: t.date(s.results_on) }) : t.ago(s.created_at)}</span>
              </div>
            ))}
          </div>
        )}
      </section>
      {submit && <SubmitDialog films={films} festivals={festivals} filmId={submit.film} festivalId={submit.fest} onClose={() => setSubmit(null)} />}
    </>
  );
}

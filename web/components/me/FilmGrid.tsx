'use client';
import Link from 'next/link';
import type { MyFilm } from '@/lib/me';
import { useT } from '../Lang';
import { Icon } from '../Icon';
import { Poster, Readiness } from './MeHome';

export function FilmGrid({ films }: { films: MyFilm[] }) {
  const t = useT();
  if (!films.length) return (
    <Link href="/app/me/films/new" className="drop" style={{ minHeight: 240 }}>
      <span className="drop-ic" style={{ width: 64, height: 64, borderRadius: 20 }}><Icon name="film" size={28} /></span>
      <b style={{ fontSize: 20, color: 'var(--ink)' }}>{t('ارفع فيلمك الأول')}</b>
    </Link>
  );
  return (
    <div className="film-row">
      {films.map((f) => (
        <Link key={f.id} href={`/app/me/films/${f.id}`} className="film-card">
          <Poster film={f} h={170} />
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
  );
}

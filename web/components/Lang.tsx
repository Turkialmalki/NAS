'use client';
import { createContext, useContext, useMemo } from 'react';
import { makeT, LANG_COOKIE, type Lang, type T } from '@/lib/i18n/core';

const Ctx = createContext<T>(makeT('ar'));
export function LangProvider({ lang, children }: { lang: Lang; children: React.ReactNode }) {
  const t = useMemo(() => makeT(lang), [lang]);
  return <Ctx.Provider value={t}>{children}</Ctx.Provider>;
}
export const useT = () => useContext(Ctx);

export function setLang(l: Lang) {
  document.cookie = `${LANG_COOKIE}=${l}; path=/; max-age=31536000; samesite=lax`;
  window.location.reload();
}

/** Compact AR/EN switch. */
export function LangToggle({ compact = false }: { compact?: boolean }) {
  const t = useT();
  const other: Lang = t.lang === 'ar' ? 'en' : 'ar';
  return (
    <button type="button" className="ibtn lang-btn" onClick={() => setLang(other)} aria-label={other === 'en' ? 'Switch to English' : 'التبديل إلى العربية'} title={other === 'en' ? 'English' : 'العربية'}>
      <span style={{ fontSize: compact ? 12 : 13, fontWeight: 700, fontFamily: other === 'en' ? 'var(--font-sans)' : 'var(--font-sans)' }}>{other === 'en' ? 'EN' : 'ع'}</span>
    </button>
  );
}

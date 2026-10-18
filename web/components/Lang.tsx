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

/** Language switch: globe + the other language's name. */
export function LangToggle({ compact = false }: { compact?: boolean }) {
  const t = useT();
  const other: Lang = t.lang === 'ar' ? 'en' : 'ar';
  const name = other === 'en' ? 'English' : 'العربية';
  return (
    <button type="button" className="sn-lang" onClick={() => setLang(other)} aria-label={name} title={name}>
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" /></svg>
      {!compact && name}
    </button>
  );
}

'use client';
import { useEffect, useState } from 'react';

export function ThemeToggle() {
  const [dark, setDark] = useState(true);
  useEffect(() => { setDark(!document.documentElement.classList.contains('th-light')); }, []);
  const flip = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle('th-light', !next);
    document.documentElement.classList.toggle('th-dark', next);
    try { localStorage.setItem('nas-theme', next ? 'dark' : 'light'); } catch {}
  };
  return (
    <button type="button" className="ibtn" onClick={flip} aria-label="تبديل المظهر">
      {dark ? (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>
      ) : (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden="true"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" /></svg>
      )}
    </button>
  );
}

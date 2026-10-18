import { cache } from 'react';
import { cookies, headers } from 'next/headers';
import { makeT, LANG_COOKIE, type Lang } from './core';

/** Language for this request: saved choice, else the browser's preference, else Arabic. */
export const getLang = cache(async (): Promise<Lang> => {
  const c = (await cookies()).get(LANG_COOKIE)?.value;
  if (c === 'ar' || c === 'en') return c;
  const al = (await headers()).get('accept-language') || '';
  return /^en\b/i.test(al.trim()) && !/\bar\b/i.test(al) ? 'en' : 'ar';
});
export const getT = cache(async () => makeT(await getLang()));

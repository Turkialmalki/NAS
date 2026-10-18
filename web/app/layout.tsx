import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import { LangProvider } from '@/components/Lang';
import { getLang } from '@/lib/i18n/server';
import './globals.css';

// Thmanyah: Sans for the interface, Serif Display for headlines and brand moments.
const sans = localFont({
  variable: '--font-sans',
  display: 'swap',
  src: [
    { path: './fonts/sans-light.woff2', weight: '300' },
    { path: './fonts/sans-regular.woff2', weight: '400' },
    { path: './fonts/sans-medium.woff2', weight: '500' },
    { path: './fonts/sans-bold.woff2', weight: '700' },
    { path: './fonts/sans-black.woff2', weight: '900' },
  ],
});
const serif = localFont({
  variable: '--font-serif',
  display: 'swap',
  src: [
    { path: './fonts/serif-regular.woff2', weight: '400' },
    { path: './fonts/serif-medium.woff2', weight: '500' },
    { path: './fonts/serif-bold.woff2', weight: '700' },
    { path: './fonts/serif-black.woff2', weight: '900' },
  ],
});

export async function generateMetadata(): Promise<Metadata> {
  const en = (await getLang()) === 'en';
  return {
    title: { default: en ? 'NAS — The film festival platform' : 'NAS — منصة المهرجانات السينمائية', template: '%s · NAS' },
    description: en ? 'Receive films, analyse them with AI, run your jury and decide with clarity.' : 'استقبل الأفلام، وحلّلها بالذكاء الاصطناعي، وأدِر لجنة التحكيم، واتخذ قرارك بوضوح.',
    metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
    icons: { icon: '/icon.svg' },
  };
}
export const viewport: Viewport = { themeColor: '#050506', width: 'device-width', initialScale: 1 };

const themeScript = `try{var t=localStorage.getItem('nas-theme');if(t==='light'){document.documentElement.classList.remove('th-dark');document.documentElement.classList.add('th-light')}}catch(e){}`;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const lang = await getLang();
  return (
    <html lang={lang} dir={lang === 'ar' ? 'rtl' : 'ltr'} className={`th-dark ${sans.variable} ${serif.variable}`} suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: themeScript }} /></head>
      <body><LangProvider lang={lang}>{children}</LangProvider></body>
    </html>
  );
}

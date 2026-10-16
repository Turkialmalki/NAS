import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import './globals.css';

const plex = localFont({
  variable: '--font-ar',
  display: 'swap',
  src: [
    { path: './fonts/ibm-plex-sans-arabic-arabic-400-normal.woff2', weight: '400' },
    { path: './fonts/ibm-plex-sans-arabic-arabic-500-normal.woff2', weight: '500' },
    { path: './fonts/ibm-plex-sans-arabic-arabic-600-normal.woff2', weight: '600' },
    { path: './fonts/ibm-plex-sans-arabic-arabic-700-normal.woff2', weight: '700' },
  ],
});
const geist = localFont({ variable: '--font-num', display: 'swap', src: [{ path: './fonts/geist-latin-wght-normal.woff2', weight: '100 900' }] });

export const metadata: Metadata = {
  title: { default: 'NAS — منصة المهرجانات السينمائية', template: '%s · NAS' },
  description: 'استقبل الأفلام، ووزّعها على لجنة التحكيم، واتخذ قرارك وأمامك تحليل واضح لكل فيلم.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
  icons: { icon: '/icon.svg' },
};
export const viewport: Viewport = { themeColor: '#050506', width: 'device-width', initialScale: 1 };

const themeScript = `try{var t=localStorage.getItem('nas-theme');if(t==='light'){document.documentElement.classList.remove('th-dark');document.documentElement.classList.add('th-light')}}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" className={`th-dark ${plex.variable} ${geist.variable}`} suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: themeScript }} /></head>
      <body>{children}</body>
    </html>
  );
}

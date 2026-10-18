import Link from 'next/link';

export function LogoMark({ height = 30, tagline = false, id = 'lg' }: { height?: number; tagline?: boolean; id?: string }) {
  return (
    <svg viewBox={tagline ? '140 20 410 160' : '140 20 400 160'} height={height} direction="ltr" aria-hidden="true" style={{ display: 'block', overflow: 'visible' }}>
      <defs>
        <linearGradient id={`${id}a`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#D4A843" /><stop offset=".5" stopColor="#C9A84C" /><stop offset="1" stopColor="#A8841A" /></linearGradient>
        <linearGradient id={`${id}b`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#D4A843" /><stop offset="1" stopColor="#B8901E" /></linearGradient>
      </defs>
      <rect x="140" y="20" width="130" height="160" rx="14" fill={`url(#${id}a)`} />
      <text x="205" y="138" fontFamily="Georgia, 'Times New Roman', serif" fontSize="108" fontWeight="700" fill="#0A0A0A" textAnchor="middle">N</text>
      <text x="300" y={tagline ? 128 : 138} fontFamily="Georgia, 'Times New Roman', serif" fontSize="92" fontWeight="700" fill={`url(#${id}b)`} letterSpacing="6">NAS</text>
      {tagline && <>
        <line x1="300" y1="146" x2="516" y2="146" stroke="#C9A84C" strokeWidth="1" opacity=".55" />
        <text x="300" y="166" fontFamily="Arial, sans-serif" fontSize="13" fill="#C9A84C" letterSpacing="3.5" opacity=".85">FILM FESTIVAL PLATFORM</text>
      </>}
    </svg>
  );
}

export function Logo({ height = 30, href = '/', id = 'lgh' }: { height?: number; href?: string; id?: string }) {
  return <Link href={href} className="logo" aria-label="NAS"><LogoMark height={height} id={id} /></Link>;
}

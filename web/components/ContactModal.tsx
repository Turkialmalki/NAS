import Link from 'next/link';

/** Links to the contact page (kept as a component so existing call sites stay unchanged). */
export function ContactButton({ children, className, style, topic }: { children: React.ReactNode; className?: string; style?: React.CSSProperties; topic?: string }) {
  return <Link href={topic ? `/contact?topic=${topic}` : '/contact'} className={className} style={style}>{children}</Link>;
}

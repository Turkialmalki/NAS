import { PATHS } from './icon-paths';

export function Icon({ name, size = 18, stroke = 1.8, className, style }: { name: string; size?: number; stroke?: number; className?: string; style?: React.CSSProperties }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className} style={style}>
      <path d={PATHS[name] || name} />
    </svg>
  );
}

export function Spinner({ size = 18 }: { size?: number }) {
  return <span className="spin" style={{ display: 'inline-flex', color: 'var(--acc)' }}><Icon name="spin" size={size} stroke={2.2} /></span>;
}

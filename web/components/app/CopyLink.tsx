'use client';
import { useState } from 'react';
import { useT } from '../Lang';
import { Icon } from '../Icon';

export function CopyLink({ url }: { url: string }) {
  const t = useT();
  const [ok, setOk] = useState(false);
  return (
    <button type="button" className="btn btn-p btn-sm" onClick={() => { navigator.clipboard?.writeText(url).then(() => { setOk(true); setTimeout(() => setOk(false), 1800); }); }}>
      <Icon name={ok ? 'check' : 'link'} size={15} />{ok ? t('نُسخ الرابط') : t('انسخ رابط التقديم')}
    </button>
  );
}

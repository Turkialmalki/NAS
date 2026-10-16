'use client';
import { Icon } from '../Icon';

export function ExportButton({ rows, name }: { rows: Record<string, unknown>[]; name: string }) {
  const go = () => {
    if (!rows.length) return;
    const keys = Object.keys(rows[0]);
    const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const csv = '﻿' + [keys.join(','), ...rows.map((r) => keys.map((k) => esc(r[k])).join(','))].join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    a.download = `${name}-submissions.csv`; a.click();
  };
  return <button type="button" className="btn btn-s btn-sm" onClick={go} disabled={!rows.length}><Icon name="up" size={15} />تصدير CSV</button>;
}

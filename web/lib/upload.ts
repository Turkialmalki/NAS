'use client';
// Uploads a film to the private "screeners" bucket. Large files go through Supabase's
// resumable (TUS) endpoint so they survive flaky connections and report progress.
import { supabaseBrowser } from './supabase/client';

export async function uploadScreener(file: File, folder: string, onProgress?: (pct: number) => void): Promise<string> {
  const sb = supabaseBrowser();
  const path = `${folder}/${crypto.randomUUID()}-${file.name.replace(/[^\w.\-]+/g, '_').slice(-80)}`;
  const contentType = file.type || 'video/mp4';
  const simple = async () => {
    const { error } = await sb.storage.from('screeners').upload(path, file, { upsert: false, contentType });
    if (error) throw error;
    onProgress?.(100);
    return path;
  };
  if (file.size < 6 * 1024 * 1024) return simple();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const { data: { session } } = await sb.auth.getSession();
  const ref = new URL(url).hostname.split('.')[0];
  const endpoint = /\.supabase\.co$/.test(new URL(url).hostname) ? `https://${ref}.storage.supabase.co/storage/v1/upload/resumable` : `${url}/storage/v1/upload/resumable`;
  const tus = await import('tus-js-client');
  try {
    await new Promise<void>((resolve, reject) => {
      const up = new tus.Upload(file, {
        endpoint,
        retryDelays: [0, 1500, 4000, 10000, 20000],
        headers: { authorization: `Bearer ${session?.access_token || key}`, apikey: key, 'x-upsert': 'false' },
        uploadDataDuringCreation: true,
        removeFingerprintOnSuccess: true,
        chunkSize: 6 * 1024 * 1024,
        metadata: { bucketName: 'screeners', objectName: path, contentType, cacheControl: '3600' },
        onError: reject,
        onProgress: (sent, total) => onProgress?.(Math.min(99, Math.round((sent / total) * 100))),
        onSuccess: () => { onProgress?.(100); resolve(); },
      });
      up.findPreviousUploads().then((prev) => { if (prev.length) up.resumeFromPreviousUpload(prev[0]); up.start(); });
    });
    return path;
  } catch (e) {
    console.warn('resumable upload failed, trying direct upload', e);
    return simple();
  }
}

export function uploadError(e: unknown) {
  const m = String((e as { message?: string })?.message || e);
  if (/size|too large|413|exceeded/i.test(m)) return 'الملف أكبر من الحد المسموح للرفع. جرّب رابط مشاهدة بدلًا منه.';
  return 'تعذّر رفع الملف. تحقق من الاتصال وحاول مرة أخرى، أو استخدم رابطًا.';
}

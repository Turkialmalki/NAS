// Browser-side film reader. Pulls frames from a video file (or URL) with canvas and measures
// light, colour, palette, a colour "barcode" across the whole film, and a pacing curve.
// Nothing leaves the device here; the chosen frames go to /api/analyze-video afterwards.

export type Frame = { t: number; image: string; thumb: string; brightness: number; saturation: number; warmth: number };
export type VideoStats = {
  duration: number; width: number; height: number; size: number | null; name: string | null; type: string | null;
  brightness: number; saturation: number; warmth: number; contrast: number; variety: number;
  palette: string[]; fadeIn: boolean; fadeOut: boolean; darkShare: number;
  barcode: string[]; energy: number[]; light: number[]; cuts: number; hasAudio: boolean | null;
};
export type Extracted = { frames: Frame[]; stats: VideoStats };

const SAMPLES = 48;   // light/colour samples across the film (barcode + pacing)
const AI_FRAMES = 12; // of those, frames sent to the vision model

function loadVideo(src: File | string): Promise<{ v: HTMLVideoElement; revoke: () => void }> {
  return new Promise((resolve, reject) => {
    const v = document.createElement('video');
    const url = typeof src === 'string' ? src : URL.createObjectURL(src);
    v.preload = 'auto'; v.muted = true; v.playsInline = true;
    if (typeof src === 'string') v.crossOrigin = 'anonymous';
    let done = false;
    const fail = () => { if (done) return; done = true; reject(new Error('unreadable')); };
    v.onerror = fail;
    v.onloadedmetadata = () => {
      if (done) return;
      if (!isFinite(v.duration) || v.duration <= 0 || !v.videoWidth) { fail(); return; }
      done = true;
      resolve({ v, revoke: () => { if (typeof src !== 'string') URL.revokeObjectURL(url); v.removeAttribute('src'); v.load(); } });
    };
    v.src = url;
    setTimeout(fail, 30000);
  });
}

function seek(v: HTMLVideoElement, t: number): Promise<void> {
  return new Promise((resolve) => {
    let done = false;
    const finish = () => { if (done) return; done = true; v.removeEventListener('seeked', finish); resolve(); };
    v.addEventListener('seeked', finish);
    v.currentTime = Math.min(Math.max(t, 0), Math.max(0, v.duration - 0.05));
    setTimeout(finish, 8000);
  });
}

const hex = (r: number, g: number, b: number) => '#' + [r, g, b].map((x) => Math.round(Math.max(0, Math.min(255, x))).toString(16).padStart(2, '0')).join('');

function audioOf(v: HTMLVideoElement): boolean | null {
  const a = v as HTMLVideoElement & { mozHasAudio?: boolean; webkitAudioDecodedByteCount?: number; audioTracks?: { length: number } };
  if (typeof a.mozHasAudio === 'boolean') return a.mozHasAudio;
  if (a.audioTracks && typeof a.audioTracks.length === 'number') return a.audioTracks.length > 0;
  if (typeof a.webkitAudioDecodedByteCount === 'number' && a.webkitAudioDecodedByteCount > 0) return true;
  return null;
}

/** Reads the film. `onFrame` fires as each AI frame is captured so the UI can animate. */
export async function extractFrames(src: File | string, onFrame?: (f: Frame, i: number, total: number) => void, onProgress?: (p: number) => void): Promise<Extracted> {
  const { v, revoke } = await loadVideo(src);
  try {
    const W = v.videoWidth, H = v.videoHeight, D = v.duration;
    const big = document.createElement('canvas');
    const scale = Math.min(1, 768 / W);
    big.width = Math.round(W * scale); big.height = Math.round(H * scale);
    const thumbC = document.createElement('canvas');
    const ts = Math.min(1, 480 / W);
    thumbC.width = Math.round(W * ts); thumbC.height = Math.round(H * ts);
    const tiny = document.createElement('canvas'); tiny.width = 48; tiny.height = 27;
    const bctx = big.getContext('2d')!, tctx = thumbC.getContext('2d')!, sctx = tiny.getContext('2d', { willReadFrequently: true })!;

    const pick = new Set(Array.from({ length: AI_FRAMES }, (_, i) => Math.round(1 + (i * (SAMPLES - 3)) / (AI_FRAMES - 1))));
    const frames: Frame[] = [];
    const sigs: Uint8ClampedArray[] = [];
    const buckets = new Map<string, { n: number; r: number; g: number; b: number }>();
    const lum: number[] = [];
    const barcode: string[] = [], light: number[] = [];
    let firstB = 1, lastB = 1, sat = 0, warm = 0;

    // try to learn whether there is a sound track (a short muted play gives browsers a chance to report it)
    let hasAudio = audioOf(v);
    if (hasAudio === null) { try { await v.play(); await new Promise((r) => setTimeout(r, 250)); v.pause(); hasAudio = audioOf(v); } catch { /* autoplay blocked */ } }

    for (let i = 0; i < SAMPLES; i++) {
      const t = i === 0 ? Math.min(0.4, D * 0.01) : i === SAMPLES - 1 ? Math.max(0, D - 0.5) : (D * i) / (SAMPLES - 1);
      await seek(v, t);
      sctx.drawImage(v, 0, 0, 48, 27);
      const px = sctx.getImageData(0, 0, 48, 27).data;
      sigs.push(px);
      let sumL = 0, sumS = 0, sumW = 0, R = 0, G = 0, B = 0;
      for (let p = 0; p < px.length; p += 4) {
        const r = px[p], g = px[p + 1], b = px[p + 2];
        const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
        const l = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        sumL += l; sumS += mx === 0 ? 0 : (mx - mn) / mx; sumW += (r - b) / 255; R += r; G += g; B += b;
        lum.push(l);
        if (l > 18 && l < 240) {
          const key = `${r >> 5}-${g >> 5}-${b >> 5}`;
          const k = buckets.get(key) || { n: 0, r: 0, g: 0, b: 0 };
          k.n++; k.r += r; k.g += g; k.b += b; buckets.set(key, k);
        }
      }
      const n = px.length / 4;
      barcode.push(hex(R / n, G / n, B / n));
      light.push(Math.round((sumL / n / 255) * 100) / 100);
      sat += sumS / n; warm += sumW / n;
      const fr: Frame = { t, image: '', thumb: '', brightness: sumL / n / 255, saturation: sumS / n, warmth: sumW / n };
      if (i === 0) firstB = fr.brightness;
      if (i === SAMPLES - 1) lastB = fr.brightness;
      if (pick.has(i)) {
        bctx.drawImage(v, 0, 0, big.width, big.height);
        tctx.drawImage(v, 0, 0, thumbC.width, thumbC.height);
        fr.image = big.toDataURL('image/jpeg', 0.74);
        fr.thumb = thumbC.toDataURL('image/jpeg', 0.6);
        frames.push(fr);
        onFrame?.(fr, frames.length - 1, AI_FRAMES);
      }
      onProgress?.((i + 1) / SAMPLES);
    }

    // pacing: how much the picture changes between neighbouring samples; big jumps ≈ scene changes
    const energy: number[] = [0];
    for (let i = 1; i < sigs.length; i++) {
      let d = 0; const a = sigs[i - 1], b = sigs[i];
      for (let p = 0; p < a.length; p += 4) d += Math.abs(a[p] - b[p]) + Math.abs(a[p + 1] - b[p + 1]) + Math.abs(a[p + 2] - b[p + 2]);
      energy.push(Math.round((d / (a.length / 4) / 765) * 1000) / 1000);
    }
    const variety = energy.slice(1).reduce((s, x) => s + x, 0) / Math.max(1, energy.length - 1);
    const cuts = energy.filter((e) => e > 0.18).length;
    const mean = lum.reduce((s, x) => s + x, 0) / lum.length;
    const contrast = Math.sqrt(lum.reduce((s, x) => s + (x - mean) ** 2, 0) / lum.length) / 128;
    const palette = [...buckets.values()].sort((a, b) => b.n - a.n)
      .filter((c, i, arr) => arr.findIndex((o) => Math.abs(o.r / o.n - c.r / c.n) + Math.abs(o.g / o.n - c.g / c.n) + Math.abs(o.b / o.n - c.b / c.n) < 60) === i)
      .slice(0, 6).map((c) => hex(c.r / c.n, c.g / c.n, c.b / c.n));
    const file = typeof src === 'string' ? null : src;
    return {
      frames,
      stats: {
        duration: D, width: W, height: H, size: file?.size ?? null, name: file?.name ?? null, type: file?.type ?? null,
        brightness: mean / 255, saturation: sat / SAMPLES, warmth: warm / SAMPLES, contrast, variety, palette,
        fadeIn: firstB < 0.06, fadeOut: lastB < 0.06, darkShare: lum.filter((l) => l < 40).length / lum.length,
        barcode, energy, light, cuts, hasAudio,
      },
    };
  } finally { revoke(); }
}

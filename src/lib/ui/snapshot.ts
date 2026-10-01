import type { Viewer } from '../scene/viewer';

/**
 * Frame capture: render, then read the canvas in the same tick so the drawing buffer is still intact
 * (no preserveDrawingBuffer). A small caption is composited onto a copy.
 */
export function captureFrame(viewer: Viewer, caption?: string): Promise<Blob> {
  viewer.render();
  const src = viewer.canvas;
  const out = document.createElement('canvas');
  out.width = src.width;
  out.height = src.height;
  const ctx = out.getContext('2d');
  if (!ctx) return Promise.reject(new Error('no 2d context'));
  ctx.drawImage(src, 0, 0);
  if (caption) {
    const pad = Math.round(out.width * 0.012);
    const size = Math.max(12, Math.round(out.width * 0.013));
    ctx.font = `600 ${size}px ui-sans-serif, system-ui, sans-serif`;
    ctx.textBaseline = 'bottom';
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = size * 0.6;
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.fillText(caption, pad, out.height - pad);
  }
  return new Promise((resolve, reject) => out.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/png'));
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/** True when the Web Share API can share a PNG file (mostly phones). */
export function canShareImage(): boolean {
  if (typeof navigator.canShare !== 'function') return false;
  try {
    return navigator.canShare({ files: [new File([new Blob()], 'x.png', { type: 'image/png' })] });
  } catch {
    return false;
  }
}

export async function shareImage(blob: Blob, filename: string, title: string): Promise<boolean> {
  const file = new File([blob], filename, { type: 'image/png' });
  if (!canShareImage()) return false;
  try {
    await navigator.share({ files: [file], title });
    return true;
  } catch (err) {
    if ((err as DOMException).name === 'AbortError') return true;
    return false;
  }
}

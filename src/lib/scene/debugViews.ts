import * as THREE from 'three';
import type { Viewer } from './viewer';

/**
 * Dev-only camera helpers driven by the URL:
 *   ?cam=front|side|rear|top|34|34r  — fixed viewpoint
 *   ?quad                             — four viewpoints in one frame (for screenshots)
 */
const VIEWS: Record<string, [number, number, number]> = {
  '34': [6.2, 2.1, 7.8],
  '34r': [-6.6, 2.3, -7.4],
  front: [0.01, 1.6, 10.5],
  side: [10.5, 1.3, 0.01],
  rear: [0.01, 1.8, -10.5],
  top: [0, 10.5, 1.6],
  low: [7.5, 0.6, 5.5],
};

/** A named view or "x,y,z". */
function parseView(v: string | null): [number, number, number] | null {
  if (!v) return null;
  if (VIEWS[v]) return VIEWS[v];
  const nums = v.split(',').map(Number);
  if (nums.length === 3 && nums.every((n) => Number.isFinite(n))) return nums as [number, number, number];
  return null;
}

export function applyDebugViews(viewer: Viewer): void {
  const params = new URLSearchParams(location.search);
  const cam = params.get('cam');
  const parsed = parseView(cam);
  if (parsed) {
    viewer.camera.position.set(...parsed);
    const target = parseView(params.get('target'));
    if (target) viewer.controls.target.set(...target);
    viewer.controls.update();
  }
  if (!params.has('quad')) return;

  const names = (params.get('quad') || '34,side,front,34r').split(',').filter((n) => VIEWS[n]);
  const cams = names.map((n) => {
    const c = viewer.camera.clone();
    c.position.set(...VIEWS[n]!);
    c.lookAt(viewer.controls.target);
    return c;
  });
  const r = viewer.renderer;
  viewer.render = (): void => {
    const w = viewer.canvas.width;
    const h = viewer.canvas.height;
    const cols = cams.length > 1 ? 2 : 1;
    const rows = Math.ceil(cams.length / cols);
    const cw = Math.floor(w / cols);
    const ch = Math.floor(h / rows);
    r.setScissorTest(true);
    cams.forEach((c, i) => {
      const x = (i % cols) * cw;
      const y = h - (Math.floor(i / cols) + 1) * ch;
      r.setViewport(x, y, cw, ch);
      r.setScissor(x, y, cw, ch);
      c.aspect = cw / ch;
      c.updateProjectionMatrix();
      r.render(viewer.scene, c);
    });
    r.setScissorTest(false);
    r.setViewport(0, 0, w, h);
  };
  void THREE;
}

import { Viewer } from './scene/viewer';
import { buildStudio } from './scene/studio';
import { applyDebugViews } from './scene/debugViews';
import { Materials } from './car/materials';
import { Car } from './car/car';
import { DEFAULT_PARTS } from './catalog';

declare global {
  interface Window {
    /** Set once the first frames have rendered. The screenshot helper waits for it. */
    __f1ready?: boolean;
    __f1?: { car: Car; viewer: Viewer };
  }
}

export function boot(): void {
  const canvas = document.getElementById('view') as HTMLCanvasElement | null;
  const stage = document.getElementById('stage');
  if (!canvas || !stage) throw new Error('Missing #view canvas or #stage host');

  const viewer = new Viewer(canvas, stage);
  buildStudio(viewer.scene, viewer.renderer);

  const materials = new Materials();
  const car = new Car(materials, DEFAULT_PARTS);
  viewer.scene.add(car.group);

  applyDebugViews(viewer);
  window.__f1 = { car, viewer };

  let frames = 0;
  const off = viewer.onFrame(() => {
    if (++frames >= 3) {
      window.__f1ready = true;
      off();
    }
  });

  viewer.start();
}

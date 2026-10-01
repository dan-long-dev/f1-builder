import { Viewer } from './scene/viewer';
import { buildStudio } from './scene/studio';
import { buildPlaceholderCar } from './car/placeholder';

declare global {
  interface Window {
    /** Set once the first frames have rendered. The screenshot helper waits for it. */
    __f1ready?: boolean;
  }
}

export function boot(): void {
  const canvas = document.getElementById('view') as HTMLCanvasElement | null;
  const stage = document.getElementById('stage');
  if (!canvas || !stage) throw new Error('Missing #view canvas or #stage host');

  const viewer = new Viewer(canvas, stage);
  buildStudio(viewer.scene);
  viewer.scene.add(buildPlaceholderCar());

  let frames = 0;
  const off = viewer.onFrame(() => {
    if (++frames >= 3) {
      window.__f1ready = true;
      off();
    }
  });

  viewer.start();
}

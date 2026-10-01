import * as THREE from 'three';
import GUI from 'lil-gui';
import type { Viewer } from '../scene/viewer';
import type { Car } from '../car/car';
import { config } from '../config';

/** lil-gui panel for tunables. Mounted only with `?debug` in the URL. */
export function mountDebug(viewer: Viewer, car: Car): GUI {
  const gui = new GUI({ title: 'Debug', width: 280 });

  const render = gui.addFolder('Render');
  render.add(viewer.renderer, 'toneMappingExposure', 0.2, 2.5, 0.01).name('exposure');
  render.add(viewer.scene, 'environmentIntensity', 0, 2, 0.01).name('env intensity');
  render.add({ pixelRatio: viewer.renderer.getPixelRatio() }, 'pixelRatio', 0.5, 3, 0.25).onChange((v: number) => {
    viewer.renderer.setPixelRatio(v);
    viewer.resize();
  });

  const lights = gui.addFolder('Lights');
  const refreshLights = (): void => {
    lights.controllers.slice().forEach((c) => c.destroy());
    viewer.scene.traverse((o) => {
      if (o instanceof THREE.DirectionalLight) lights.add(o, 'intensity', 0, 8, 0.05).name(o.castShadow ? 'sun' : 'fill');
      if (o instanceof THREE.HemisphereLight) lights.add(o, 'intensity', 0, 3, 0.05).name('hemi');
    });
  };
  refreshLights();
  lights.add({ refresh: refreshLights }, 'refresh').name('refresh (after env change)');

  const camera = gui.addFolder('Camera');
  camera.add(viewer.camera, 'fov', 15, 60, 1).onChange(() => viewer.camera.updateProjectionMatrix());
  camera.add(viewer.controls, 'autoRotateSpeed', 0, 6, 0.1).name('turntable speed');
  camera.add(config.anim, 'damping', 1, 20, 0.5).name('anim damping');

  const info = gui.addFolder('Info');
  const stats = { calls: 0, triangles: 0, fps: 0 };
  const calls = info.add(stats, 'calls').disable();
  const tris = info.add(stats, 'triangles').disable();
  const fps = info.add(stats, 'fps').disable();
  let frames = 0;
  let last = performance.now();
  viewer.onFrame(() => {
    frames++;
    const now = performance.now();
    if (now - last > 500) {
      stats.fps = Math.round((frames * 1000) / (now - last));
      frames = 0;
      last = now;
      stats.calls = viewer.renderer.info.render.calls;
      stats.triangles = viewer.renderer.info.render.triangles;
      calls.updateDisplay();
      tris.updateDisplay();
      fps.updateDisplay();
    }
  });
  info.add({ log: () => console.log(car.group) }, 'log').name('log car graph');
  return gui;
}

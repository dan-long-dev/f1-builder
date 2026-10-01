import { Viewer } from './scene/viewer';
import { Environments } from './scene/environments';
import { applyDebugViews } from './scene/debugViews';
import { Picker } from './scene/picking';
import { Materials } from './car/materials';
import { Car } from './car/car';
import { SLOTS, SLOT_LABELS } from './catalog';
import { Store, decodeState, encodeState, writeStateToUrl } from './state';
import { Panel } from './ui/panel';
import { randomBuild } from './random';
import { captureFrame, canShareImage, downloadBlob, shareImage } from './ui/snapshot';
import { copyLink } from './ui/share';
import { Toast } from './ui/toast';
import { mountDebug } from './ui/debug';
import { config } from './config';

declare global {
  interface Window {
    /** Set once the first frames have rendered. The screenshot helper waits for it. */
    __f1ready?: boolean;
    __f1?: { car: Car; viewer: Viewer; store: Store; picker: Picker };
  }
}

export function boot(): void {
  const canvas = document.getElementById('view') as HTMLCanvasElement | null;
  const stage = document.getElementById('stage');
  const panelBody = document.getElementById('panel-body');
  const hint = document.getElementById('hint');
  if (!canvas || !stage || !panelBody) throw new Error('Missing page scaffold');

  const store = new Store(decodeState(location.hash));
  const viewer = new Viewer(canvas, stage);
  const envs = new Environments(viewer.scene, viewer.renderer);
  envs.set(store.state.env);

  const materials = new Materials();
  const car = new Car(materials, store.state.parts, store.state.livery);
  viewer.scene.add(car.group);

  const coarse = window.matchMedia('(pointer: coarse)').matches;
  if (hint && coarse) hint.textContent = 'Drag to orbit · Pinch to zoom · Tap a part';
  const defaultHint = hint?.textContent ?? '';
  const picker = new Picker(viewer, car, {
    onHover: (slot) => {
      if (hint) hint.textContent = slot ? `${SLOT_LABELS[slot]} · ${coarse ? 'tap' : 'click'} to select` : defaultHint;
    },
    onSelect: (slot) => panel.setSelected(slot),
  });
  const panel = new Panel(panelBody, store, { onSelectSlot: (slot) => picker.select(slot) });

  car.onChanged = () => picker.refresh();
  store.subscribe((state, patch) => {
    if (patch.parts) {
      for (const slot of SLOTS) car.setPart(slot, state.parts[slot] as never);
      picker.refresh();
    }
    if (patch.livery) car.setLivery(state.livery);
    if (patch.env) envs.set(state.env);
    writeStateToUrl(state);
  });
  window.addEventListener('hashchange', () => {
    if (encodeState(store.state) !== location.hash.replace(/^#/, '')) store.replace(decodeState(location.hash));
  });

  // view options: DRS, turntable, exploded view
  viewer.onFrame((dt) => car.update(dt));
  viewer.controls.autoRotateSpeed = config.anim.turntableSpeed;
  const setDrs = (on: boolean): void => {
    car.setDrs(on);
    panel.setToggle('drs', on);
  };
  const setTurntable = (on: boolean): void => {
    viewer.controls.autoRotate = on;
    panel.setToggle('turntable', on);
  };
  const setExploded = (on: boolean): void => {
    car.setExploded(on);
    panel.setToggle('exploded', on);
  };
  panel.addToggles('View', [
    { id: 'drs', label: 'DRS open', hint: 'Shortcut: D', on: false, onChange: setDrs },
    { id: 'turntable', label: 'Turntable', hint: 'Shortcut: T', on: false, onChange: setTurntable },
    { id: 'exploded', label: 'Exploded view', hint: 'Shortcut: E', on: false, onChange: setExploded },
  ]);
  window.addEventListener('keydown', (e) => {
    const t = e.target as HTMLElement | null;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
    const k = e.key.toLowerCase();
    if (k === 'd') setDrs(!car.drs);
    else if (k === 't') setTurntable(!viewer.controls.autoRotate);
    else if (k === 'e') setExploded(!car.isExploded);
    else if (k === 'r') store.set(randomBuild());
  });

  // snapshot + share
  const toast = new Toast(document.getElementById('toast') as HTMLElement);
  const filename = (): string => `f1-builder-${store.state.livery.number}.png`;
  document.getElementById('btn-snapshot')?.addEventListener('click', async () => {
    try {
      const blob = await captureFrame(viewer, `F1 Builder · #${store.state.livery.number}`);
      downloadBlob(blob, filename());
      toast.show('Snapshot saved');
    } catch (err) {
      console.error(err);
      toast.show('Snapshot failed');
    }
  });
  const shareImageBtn = document.getElementById('btn-share-image') as HTMLButtonElement | null;
  if (shareImageBtn && canShareImage()) {
    shareImageBtn.hidden = false;
    shareImageBtn.addEventListener('click', async () => {
      const blob = await captureFrame(viewer, `F1 Builder · #${store.state.livery.number}`);
      if (!(await shareImage(blob, filename(), 'My F1 Builder car'))) downloadBlob(blob, filename());
    });
  }
  document.getElementById('btn-share')?.addEventListener('click', async () => {
    const url = location.href;
    const result = await copyLink(url);
    if (result === 'copied') toast.show('Link copied. It reproduces this exact build.');
    else if (result === 'failed') toast.show('Copy this link:', { input: url });
  });

  applyDebugViews(viewer);
  if (new URLSearchParams(location.search).has('debug')) mountDebug(viewer, car);
  window.__f1 = { car, viewer, store, picker };

  let frames = 0;
  const off = viewer.onFrame(() => {
    if (++frames >= 3) {
      window.__f1ready = true;
      off();
    }
  });

  viewer.start();
}

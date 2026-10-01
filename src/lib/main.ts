import { Viewer } from './scene/viewer';
import { buildStudio } from './scene/studio';
import { applyDebugViews } from './scene/debugViews';
import { Picker } from './scene/picking';
import { Materials } from './car/materials';
import { Car } from './car/car';
import { SLOTS, SLOT_LABELS } from './catalog';
import { Store, decodeState, encodeState, writeStateToUrl } from './state';
import { Panel } from './ui/panel';

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
  buildStudio(viewer.scene, viewer.renderer);

  const materials = new Materials();
  const car = new Car(materials, store.state.parts, store.state.livery);
  viewer.scene.add(car.group);

  const defaultHint = hint?.textContent ?? '';
  const picker = new Picker(viewer, car, {
    onHover: (slot) => {
      if (hint) hint.textContent = slot ? `${SLOT_LABELS[slot]} · click to select` : defaultHint;
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
    writeStateToUrl(state);
  });
  window.addEventListener('hashchange', () => {
    if (encodeState(store.state) !== location.hash.replace(/^#/, '')) store.replace(decodeState(location.hash));
  });

  applyDebugViews(viewer);
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

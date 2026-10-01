import * as THREE from 'three';
import { tyreProfile } from '../../geometry/profiles';
import { mesh } from '../../geometry/helpers';
import type { PartContext } from './types';
import type { VariantId } from '../../catalog';

export const COMPOUND_COLORS: Record<VariantId<'tyres'>, string> = {
  soft: '#d1222e',
  medium: '#f2c230',
  hard: '#f0f0f0',
  inter: '#2e9e4f',
  wet: '#2a63d4',
};

export interface WheelChoice {
  tyres: VariantId<'tyres'>;
  rims: VariantId<'rims'>;
}

/** All four wheels. Tyre meshes carry slot 'tyres', rim meshes slot 'rims'. */
export function buildWheels(ctx: PartContext, choice: WheelChoice): THREE.Group {
  const { materials: m, car } = ctx;
  const g = new THREE.Group();
  g.name = 'wheels';
  m.compound.color.set(COMPOUND_COLORS[choice.tyres]);
  const rearZ = car.frontAxleZ - car.wheelbase;
  const t = car.tyre;
  const place = (x: number, z: number, width: number, dia: number, outerSign: 1 | -1): void => {
    const w = buildWheel(ctx, choice, width, dia / 2);
    w.position.set(x, dia / 2, z);
    w.scale.x = outerSign;
    g.add(w);
  };
  place(car.trackFront / 2, car.frontAxleZ, t.frontWidth, t.frontDia, 1);
  place(-car.trackFront / 2, car.frontAxleZ, t.frontWidth, t.frontDia, -1);
  place(car.trackRear / 2, rearZ, t.rearWidth, t.rearDia, 1);
  place(-car.trackRear / 2, rearZ, t.rearWidth, t.rearDia, -1);
  return g;
}

/** One wheel, axle along X, outer face at +X. */
function buildWheel(ctx: PartContext, choice: WheelChoice, width: number, radius: number): THREE.Group {
  const { materials: m, car } = ctx;
  const rimR = car.tyre.rimDia / 2;
  const g = new THREE.Group();

  const tyre = mesh(new THREE.LatheGeometry(tyreProfile(radius, rimR, width), 56), m.rubber, { name: 'tyre' });
  tyre.rotation.z = -Math.PI / 2;
  tyre.userData.slot = 'tyres';
  g.add(tyre);

  // compound band on the outer sidewall
  const band = mesh(new THREE.RingGeometry(rimR + 0.035, rimR + 0.075, 48), m.compound, { castShadow: false });
  band.rotation.y = Math.PI / 2;
  band.position.x = width / 2 - 0.011;
  band.userData.slot = 'tyres';
  g.add(band);

  const rim = new THREE.Group();
  rim.name = 'rim';
  const barrel = mesh(new THREE.CylinderGeometry(rimR, rimR, width - 0.03, 40, 1, true), m.rim);
  barrel.rotation.z = Math.PI / 2;
  rim.add(barrel);
  const faceX = width / 2 - 0.035;
  const lip = mesh(new THREE.TorusGeometry(rimR - 0.012, 0.013, 10, 48), m.rim);
  lip.rotation.y = Math.PI / 2;
  lip.position.x = faceX;
  rim.add(lip);
  const hub = mesh(new THREE.CylinderGeometry(0.07, 0.075, 0.07, 24), m.rim);
  hub.rotation.z = Math.PI / 2;
  hub.position.x = faceX - 0.02;
  rim.add(hub);
  const nut = mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.03, 6), m.steel);
  nut.rotation.z = Math.PI / 2;
  nut.position.x = faceX + 0.02;
  rim.add(nut);

  if (choice.rims === 'disc') {
    const disc = mesh(new THREE.CircleGeometry(rimR - 0.012, 48), m.rim, { castShadow: false });
    disc.rotation.y = Math.PI / 2;
    disc.position.x = faceX - 0.01;
    rim.add(disc);
  } else {
    const count = choice.rims === 'spoke10' ? 10 : 5;
    const spokeW = choice.rims === 'spoke10' ? 0.028 : 0.05;
    for (let i = 0; i < count; i++) {
      const spoke = mesh(new THREE.BoxGeometry(0.03, rimR - 0.07, spokeW), m.rim);
      spoke.position.set(faceX - 0.03, (rimR - 0.07) / 2 + 0.05, 0);
      const holder = new THREE.Group();
      holder.add(spoke);
      holder.rotation.x = (i / count) * Math.PI * 2;
      rim.add(holder);
    }
  }
  // brake drum on the inner side
  const drum = mesh(new THREE.CylinderGeometry(rimR - 0.03, rimR - 0.03, width * 0.6, 32), m.matteBlack, { castShadow: false });
  drum.rotation.z = Math.PI / 2;
  drum.position.x = -width * 0.12;
  rim.add(drum);

  rim.traverse((o) => {
    o.userData.slot = 'rims';
  });
  g.add(rim);
  return g;
}

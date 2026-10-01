import * as THREE from 'three';
import { config } from '../config';

/**
 * Blocked-out car for phase 1: boxes and cylinders at the real dimensions,
 * so the camera framing, floor and lights can be judged before the proper geometry lands.
 */
export function buildPlaceholderCar(): THREE.Group {
  const c = config.car;
  const car = new THREE.Group();
  car.name = 'car';

  const body = new THREE.MeshStandardMaterial({ color: '#e8322a', roughness: 0.35, metalness: 0.1 });
  const dark = new THREE.MeshStandardMaterial({ color: '#1a1a1a', roughness: 0.6, metalness: 0.2 });
  const rubber = new THREE.MeshStandardMaterial({ color: '#141414', roughness: 0.95 });

  const add = (geom: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number): THREE.Mesh => {
    const m = new THREE.Mesh(geom, mat);
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = true;
    car.add(m);
    return m;
  };

  const rearAxleZ = c.frontAxleZ - c.wheelbase;
  const groundToAxle = c.tyre.frontDia / 2;

  // monocoque + nose
  add(new THREE.BoxGeometry(0.6, 0.5, 2.6), body, 0, 0.35 + c.rideHeight, 0.2);
  add(new THREE.BoxGeometry(0.3, 0.22, 1.6), body, 0, 0.32, 2.2);
  // sidepods
  add(new THREE.BoxGeometry(1.5, 0.42, 1.6), body, 0, 0.3 + c.rideHeight, -0.5);
  // engine cover
  add(new THREE.BoxGeometry(0.34, 0.5, 1.9), body, 0, 0.75, -0.7);
  // floor
  add(new THREE.BoxGeometry(1.6, 0.03, 3.4), dark, 0, 0.03 + c.rideHeight, -0.2);
  // front wing
  add(new THREE.BoxGeometry(c.width - 0.1, 0.04, 0.5), dark, 0, 0.1, 2.85);
  // rear wing
  add(new THREE.BoxGeometry(1.0, 0.04, 0.35), dark, 0, 0.95, -2.3);
  add(new THREE.BoxGeometry(0.03, 0.4, 0.5), dark, 0.5, 0.78, -2.3);
  add(new THREE.BoxGeometry(0.03, 0.4, 0.5), dark, -0.5, 0.78, -2.3);
  // halo
  add(new THREE.TorusGeometry(0.33, 0.03, 10, 32, Math.PI), dark, 0, 0.85, 0.4).rotation.set(-Math.PI / 2, 0, 0);

  // wheels
  const wheel = (dia: number, width: number, x: number, z: number): void => {
    const g = new THREE.CylinderGeometry(dia / 2, dia / 2, width, 32);
    const m = add(g, rubber, x, groundToAxle, z);
    m.rotation.z = Math.PI / 2;
  };
  wheel(c.tyre.frontDia, c.tyre.frontWidth, c.trackFront / 2, c.frontAxleZ);
  wheel(c.tyre.frontDia, c.tyre.frontWidth, -c.trackFront / 2, c.frontAxleZ);
  wheel(c.tyre.rearDia, c.tyre.rearWidth, c.trackRear / 2, rearAxleZ);
  wheel(c.tyre.rearDia, c.tyre.rearWidth, -c.trackRear / 2, rearAxleZ);

  return car;
}

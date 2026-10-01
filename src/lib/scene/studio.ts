import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { config } from '../config';

/**
 * Phase-1 studio: a floor that catches shadows, a light rig and a procedural environment map
 * so clearcoat and metals have something to reflect. Replaced by the environment presets in phase 5.
 */
export function buildStudio(scene: THREE.Scene, renderer: THREE.WebGLRenderer): THREE.Group {
  const s = config.studio;
  const group = new THREE.Group();
  group.name = 'studio';

  scene.background = new THREE.Color(s.background);
  scene.fog = new THREE.Fog(s.background, 9, 28);

  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.55;
  pmrem.dispose();

  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(30, 64),
    new THREE.MeshStandardMaterial({ color: s.floor, roughness: 0.92, metalness: 0 }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  group.add(floor);

  const key = new THREE.DirectionalLight(s.keyLight.color, s.keyLight.intensity);
  key.position.set(...s.keyLight.position);
  key.castShadow = true;
  key.shadow.mapSize.set(config.render.shadowMapSize, config.render.shadowMapSize);
  key.shadow.camera.near = 1;
  key.shadow.camera.far = 30;
  const ext = 4.5;
  key.shadow.camera.left = -ext;
  key.shadow.camera.right = ext;
  key.shadow.camera.top = ext;
  key.shadow.camera.bottom = -ext;
  key.shadow.bias = -0.0004;
  key.shadow.normalBias = 0.02;
  group.add(key, key.target);

  const fill = new THREE.DirectionalLight(s.fillLight.color, s.fillLight.intensity);
  fill.position.set(...s.fillLight.position);
  group.add(fill);

  const hemi = new THREE.HemisphereLight(s.hemi.sky, s.hemi.ground, s.hemi.intensity);
  group.add(hemi);

  scene.add(group);
  return group;
}

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { config } from '../config';

export type FrameCallback = (dt: number, elapsed: number) => void;

/**
 * Owns the renderer, camera, controls and the render loop.
 * Everything else adds objects to `scene` and subscribes to frames.
 */
export class Viewer {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;
  readonly controls: OrbitControls;
  readonly canvas: HTMLCanvasElement;
  readonly host: HTMLElement;

  private timer = new THREE.Timer();
  private frameCallbacks = new Set<FrameCallback>();
  private running = false;
  private resizeObserver: ResizeObserver;

  constructor(canvas: HTMLCanvasElement, host: HTMLElement) {
    this.canvas = canvas;
    this.host = host;

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, config.render.maxPixelRatio));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = config.render.exposure;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;

    const c = config.camera;
    this.camera = new THREE.PerspectiveCamera(c.fov, 1, 0.05, 200);
    this.camera.position.set(...c.position);

    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.target.set(...c.target);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = c.damping;
    this.controls.rotateSpeed = c.rotateSpeed;
    this.controls.minDistance = c.minDistance;
    this.controls.maxDistance = c.maxDistance;
    this.controls.maxPolarAngle = THREE.MathUtils.degToRad(c.maxPolarDeg);
    this.controls.enablePan = false;
    this.controls.update();

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(host);
    this.resize();
  }

  resize(): void {
    const w = Math.max(1, this.host.clientWidth);
    const h = Math.max(1, this.host.clientHeight);
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  onFrame(cb: FrameCallback): () => void {
    this.frameCallbacks.add(cb);
    return () => this.frameCallbacks.delete(cb);
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.renderer.setAnimationLoop(() => this.tick());
  }

  stop(): void {
    this.running = false;
    this.renderer.setAnimationLoop(null);
  }

  /** Render a single frame now (used by snapshot so the read-back sees fresh pixels). */
  render(): void {
    this.renderer.render(this.scene, this.camera);
  }

  private tick(): void {
    this.timer.update();
    const dt = Math.min(this.timer.getDelta(), 0.1);
    const t = this.timer.getElapsed();
    this.controls.update();
    for (const cb of this.frameCallbacks) cb(dt, t);
    this.render();
  }
}

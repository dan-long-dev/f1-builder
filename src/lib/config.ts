/**
 * Tunables. Anything someone might want to nudge lives here.
 * Units are metres unless stated. +Z is the car's front, +Y up, +X the driver's left.
 */
export const config = {
  render: {
    exposure: 1.0,
    maxPixelRatio: 2,
    shadowMapSize: 2048,
  },
  camera: {
    fov: 30,
    position: [6.2, 2.1, 7.8] as [number, number, number],
    target: [0, 0.45, 0] as [number, number, number],
    minDistance: 3.2,
    maxDistance: 16,
    /** keep the camera above the floor */
    maxPolarDeg: 88,
    rotateSpeed: 0.8,
    damping: 0.08,
  },
  car: {
    length: 5.5,
    width: 2.0,
    wheelbase: 3.6,
    /** front axle z position; rear axle is at front - wheelbase */
    frontAxleZ: 1.75,
    trackFront: 1.62,
    trackRear: 1.56,
    tyre: { frontDia: 0.72, rearDia: 0.72, frontWidth: 0.305, rearWidth: 0.405, rimDia: 0.457 },
    rideHeight: 0.04,
  },
  studio: {
    background: '#0f1012',
    floor: '#17181b',
    keyLight: { color: '#ffffff', intensity: 3.0, position: [4, 7, 5] as [number, number, number] },
    fillLight: { color: '#cfd8ff', intensity: 0.9, position: [-6, 3, -2] as [number, number, number] },
    hemi: { sky: '#e8ecff', ground: '#2a2a2a', intensity: 0.8 },
  },
} as const;

export type Config = typeof config;

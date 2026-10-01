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
    /** where the nose meets the monocoque, and the nose tip */
    noseJoinZ: 1.95,
    noseTipZ: 2.95,
    /** driver helmet centre */
    helmet: { x: 0, y: 0.7, z: 0.42, radius: 0.135 },
    frontWing: { leadingZ: 3.0, y: 0.11, halfSpan: 0.95 },
    rearWing: { leadingZ: -2.1, y: 0.8, halfSpan: 0.47 },
    floorY: 0.05,
    sidepod: { inletZ: 0.65, endZ: -1.75 },
    engineCover: { startZ: 0.25, endZ: -2.05 },
  },
  colors: {
    body: '#d9232e',
    pattern: '#f4f4f2',
    wings: '#141416',
    rims: '#2b2d31',
    helmet: '#f2c230',
  },
  envs: {
    studio: {
      background: '#0f1012',
      floor: '#17181b',
      sun: { color: '#ffffff', intensity: 3.0, position: [4, 7, 5] as [number, number, number] },
      fill: { color: '#cfd8ff', intensity: 0.9, position: [-6, 3, -2] as [number, number, number] },
      hemi: { sky: '#e8ecff', ground: '#2a2a2a', intensity: 0.8 },
      envIntensity: 0.55,
      exposure: 1.0,
      fog: [9, 28] as [number, number],
    },
    garage: {
      background: '#101114',
      floor: '#43464b',
      lineColor: '#e5b400',
      sun: { color: '#f3f6ff', intensity: 2.4, position: [1.5, 8, 2] as [number, number, number] },
      fill: { color: '#9fb4ff', intensity: 0.5, position: [-5, 3, -4] as [number, number, number] },
      hemi: { sky: '#dfe6ff', ground: '#202226', intensity: 0.9 },
      envIntensity: 0.8,
      exposure: 1.0,
      fog: [12, 30] as [number, number],
    },
    track: {
      sky: { top: '#2a63b8', horizon: '#c9dcf2', bottom: '#c9dcf2' },
      asphalt: '#3c3c3f',
      grass: '#4f7a3a',
      sun: { color: '#fff4e0', intensity: 3.4, position: [5, 8, 4] as [number, number, number], size: 2.5 },
      hemi: { sky: '#bcd4f5', ground: '#5a6a4a', intensity: 1.0 },
      envIntensity: 0.6,
      exposure: 1.0,
      fog: ['#c9dcf2', 30, 150] as [string, number, number],
    },
    sunset: {
      sky: { top: '#2a2d5c', horizon: '#ff9f62', bottom: '#eaa070' },
      asphalt: '#3a3537',
      grass: '#5a5c36',
      sun: { color: '#ffb46a', intensity: 2.8, position: [-7, 1.6, -4] as [number, number, number], size: 4 },
      hemi: { sky: '#8a7cc8', ground: '#4a3a2e', intensity: 0.9 },
      envIntensity: 0.7,
      exposure: 1.05,
      fog: ['#eaa070', 25, 150] as [string, number, number],
    },
  },
} as const;

export type Config = typeof config;

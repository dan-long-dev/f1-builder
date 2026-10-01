import type * as THREE from 'three';
import type { config } from '../../config';
import type { Materials } from '../materials';

export interface PartContext {
  materials: Materials;
  car: typeof config.car;
}

export interface PartVariant {
  label: string;
  build(ctx: PartContext): THREE.Group;
}

export type PartVariants<Id extends string> = Record<Id, PartVariant>;

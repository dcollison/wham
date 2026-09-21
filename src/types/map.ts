import { Boulder, Attempt } from './index';

export interface WallSegment {
  areaId: string;
  areaName: string;
  // SVG path definition along the wall perimeter from clockwise start to end
  pathD: string;
  // Optional polygon representing the mat / sector area for background fill
  polygonD?: string;
  // Centroid/coordinate for the sector name label
  labelPos: { x: number; y: number };
  // Visual orientation or description
  description?: string;
}

export interface GymMapConfig {
  gymId: string;
  gymName: string;
  viewBox: string;
  width: number;
  height: number;
  imagePath: string;
  walls: WallSegment[];
}

export interface MapPin {
  boulder: Boulder;
  x: number;
  y: number;
  order: number;
  userAttempt?: Attempt;
}

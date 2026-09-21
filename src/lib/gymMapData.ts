import { GymMapConfig, WallSegment, MapPin } from '../types/map';
import { Boulder, Attempt } from '../types';

export const GYM_MAP_CONFIGS: Record<string, GymMapConfig> = {
  // Big Rock Hub (Milton Keynes)
  'b0000000-0000-0000-0000-000000000002': {
    gymId: 'b0000000-0000-0000-0000-000000000002',
    gymName: 'Hub',
    viewBox: '0 0 1000 907',
    width: 1000,
    height: 907,
    imagePath: './maps/hub_map.png',
    walls: [
      {
        areaId: 'c0000000-0000-0000-0000-000000000008',
        areaName: 'Legacy Wall',
        pathD: 'M 150 240 L 110 390 L 75 520 L 75 660 L 85 800',
        polygonD: 'M 150 240 L 110 390 L 75 520 L 75 660 L 85 800 L 180 800 L 180 340 Z',
        labelPos: { x: 125, y: 530 },
        description: 'Left vertical wall running from Classic Comp down to Slab'
      },
      {
        areaId: 'c0000000-0000-0000-0000-000000000009',
        areaName: 'Classic Comp Wall',
        pathD: 'M 150 240 L 220 100 L 330 90 L 440 90 L 470 170 L 400 270',
        polygonD: 'M 150 240 L 220 100 L 330 90 L 440 90 L 470 170 L 400 270 L 300 350 L 180 340 Z',
        labelPos: { x: 335, y: 165 },
        description: 'Top competition wall'
      },
      {
        areaId: 'c0000000-0000-0000-0000-000000000010',
        areaName: 'Right-Hand Wall',
        pathD: 'M 400 270 L 415 380 L 445 540 L 465 690 L 485 880',
        polygonD: 'M 400 270 L 415 380 L 445 540 L 465 690 L 485 880 L 400 880 L 330 500 Z',
        labelPos: { x: 395, y: 460 },
        description: 'Right corridor wall facing the Island'
      },
      {
        areaId: 'c0000000-0000-0000-0000-000000000007',
        areaName: 'Slab Wall',
        pathD: 'M 485 880 L 350 880 L 220 880 L 85 800',
        polygonD: 'M 485 880 L 350 880 L 220 880 L 85 800 L 85 750 L 485 750 Z',
        labelPos: { x: 285, y: 840 },
        description: 'Bottom slab corridor connecting Right-Hand and Legacy'
      },
      {
        areaId: 'c0000000-0000-0000-0000-000000000011',
        areaName: 'Island',
        pathD: 'M 270 760 L 290 640 L 340 580 L 380 630 L 420 740 L 350 780 Z',
        polygonD: 'M 270 760 L 290 640 L 340 580 L 380 630 L 420 740 L 350 780 Z',
        labelPos: { x: 345, y: 690 },
        description: 'Central freestanding boulder island'
      },
      {
        areaId: 'c0000000-0000-0000-0000-000000000012',
        areaName: 'New Comp Wall',
        pathD: 'M 670 75 L 730 65 L 880 260 L 870 530 L 935 760 L 870 890',
        polygonD: 'M 670 75 L 730 65 L 880 260 L 870 530 L 935 760 L 870 890 L 670 890 Z',
        labelPos: { x: 770, y: 220 },
        description: 'Separate large competition arena wall'
      }
    ]
  },

  // Big Rock Bond (Bletchley)
  'b0000000-0000-0000-0000-000000000001': {
    gymId: 'b0000000-0000-0000-0000-000000000001',
    gymName: 'Bond',
    viewBox: '0 0 1000 1121',
    width: 1000,
    height: 1121,
    imagePath: './maps/bond_map.png',
    walls: [
      {
        areaId: 'c0000000-0000-0000-0000-000000000001',
        areaName: 'Slab Wall',
        pathD: 'M 230 550 L 190 380 L 160 250 L 170 120 L 240 100',
        polygonD: 'M 230 550 L 190 380 L 160 250 L 170 120 L 240 100 L 300 250 Z',
        labelPos: { x: 130, y: 320 },
        description: 'Left vertical slab wall'
      },
      {
        areaId: 'c0000000-0000-0000-0000-000000000002',
        areaName: 'Gecko Prow',
        pathD: 'M 230 550 L 260 630 L 340 660 L 420 630 L 450 550',
        polygonD: 'M 230 550 L 260 630 L 340 660 L 420 630 L 450 550 L 320 530 Z',
        labelPos: { x: 190, y: 680 },
        description: 'Protruding bottom-left prow'
      },
      {
        areaId: 'c0000000-0000-0000-0000-000000000003',
        areaName: 'Back Corner',
        pathD: 'M 320 340 L 345 220 L 375 130 L 435 85',
        polygonD: 'M 320 340 L 345 220 L 375 130 L 435 85 L 435 340 Z',
        labelPos: { x: 440, y: 220 },
        description: 'Top-left corner section'
      },
      {
        areaId: 'c0000000-0000-0000-0000-000000000004',
        areaName: 'Cave',
        pathD: 'M 435 85 L 530 65 L 660 65 L 720 145 L 790 260',
        polygonD: 'M 435 85 L 530 65 L 660 65 L 720 145 L 790 260 L 660 300 L 480 260 Z',
        labelPos: { x: 590, y: 160 },
        description: 'Top steep cave & roof'
      },
      {
        areaId: 'c0000000-0000-0000-0000-000000000006',
        areaName: 'Top-Out',
        pathD: 'M 570 380 L 650 320 L 690 440 L 630 560 L 540 460 Z',
        polygonD: 'M 570 380 L 650 320 L 690 440 L 630 560 L 540 460 Z',
        labelPos: { x: 690, y: 550 },
        description: 'Central top-out island boulder'
      },
      {
        areaId: 'c0000000-0000-0000-0000-000000000005',
        areaName: 'Comp Wall',
        pathD: 'M 790 260 L 825 430 L 870 580 L 880 720 L 940 820 L 800 960',
        polygonD: 'M 790 260 L 825 430 L 870 580 L 880 720 L 940 820 L 800 960 L 700 850 L 700 400 Z',
        labelPos: { x: 720, y: 720 },
        description: 'Outer right-hand comp wall'
      }
    ]
  }
};

/**
 * Parses simple SVG path definitions (M, L) into numeric coordinate vertices
 */
function parsePathVertices(pathD: string): Array<{ x: number; y: number }> {
  const matches = pathD.match(/([MLZ])\s*([0-9.]+)[,\s]+([0-9.]+)/gi) || [];
  const points: Array<{ x: number; y: number }> = [];
  for (const item of matches) {
    const parts = item.trim().split(/[\s,]+/);
    const x = parseFloat(parts[1]);
    const y = parseFloat(parts[2]);
    if (!isNaN(x) && !isNaN(y)) {
      points.push({ x, y });
    }
  }
  // If path ends with Z, connect back to first point
  if (pathD.trim().toUpperCase().endsWith('Z') && points.length > 2) {
    points.push({ ...points[0] });
  }
  return points;
}

/**
 * Calculates equidistant points along a polyline
 */
export function calculateEquidistantPoints(
  pathD: string,
  count: number
): Array<{ x: number; y: number }> {
  if (count <= 0) return [];

  // Browser-native SVGPathElement evaluation if available
  if (typeof document !== 'undefined') {
    try {
      const pathEl = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      pathEl.setAttribute('d', pathD);
      const totalLen = pathEl.getTotalLength();
      if (totalLen > 0) {
        const points: Array<{ x: number; y: number }> = [];
        for (let i = 0; i < count; i++) {
          const fraction = (i + 0.5) / count;
          const pt = pathEl.getPointAtLength(fraction * totalLen);
          points.push({ x: Math.round(pt.x * 10) / 10, y: Math.round(pt.y * 10) / 10 });
        }
        return points;
      }
    } catch {
      // Fall through to geometric parser
    }
  }

  // Geometric fallback (identical results without requiring DOM)
  const vertices = parsePathVertices(pathD);
  if (vertices.length < 2) return [];

  const segLengths: number[] = [];
  let totalLength = 0;
  for (let i = 0; i < vertices.length - 1; i++) {
    const dx = vertices[i + 1].x - vertices[i].x;
    const dy = vertices[i + 1].y - vertices[i].y;
    const len = Math.sqrt(dx * dx + dy * dy);
    segLengths.push(len);
    totalLength += len;
  }

  if (totalLength === 0) return [];

  const result: Array<{ x: number; y: number }> = [];
  for (let i = 0; i < count; i++) {
    const targetDist = ((i + 0.5) / count) * totalLength;
    let accumulated = 0;
    for (let j = 0; j < segLengths.length; j++) {
      if (accumulated + segLengths[j] >= targetDist || j === segLengths.length - 1) {
        const segDist = targetDist - accumulated;
        const ratio = segLengths[j] > 0 ? Math.min(1, Math.max(0, segDist / segLengths[j])) : 0;
        result.push({
          x: Math.round((vertices[j].x + ratio * (vertices[j + 1].x - vertices[j].x)) * 10) / 10,
          y: Math.round((vertices[j].y + ratio * (vertices[j + 1].y - vertices[j].y)) * 10) / 10
        });
        break;
      }
      accumulated += segLengths[j];
    }
  }

  return result;
}

/**
 * Calculates pins for active boulders along a wall segment
 */
export function calculateWallPins(
  wall: WallSegment,
  boulders: Boulder[],
  attempts: Attempt[],
  currentUserId?: string
): MapPin[] {
  // Filter boulders belonging to this area and sort clockwise by position_order
  const areaBoulders = boulders
    .filter((b) => !b.is_archived && (b.area_id === wall.areaId || b.area_id === wall.areaName))
    .sort((a, b) => a.position_order - b.position_order);

  if (areaBoulders.length === 0) return [];

  const points = calculateEquidistantPoints(wall.pathD, areaBoulders.length);

  return areaBoulders.map((boulder, idx) => {
    const pt = points[idx] || { x: wall.labelPos.x, y: wall.labelPos.y };
    const userAttempt = currentUserId
      ? attempts.find((a) => a.boulder_id === boulder.id && a.user_id === currentUserId)
      : undefined;

    return {
      boulder,
      x: pt.x,
      y: pt.y,
      order: Math.round(boulder.position_order),
      userAttempt
    };
  });
}

/**
 * Returns the map config for a given gym ID or gym name
 */
export function getGymMapConfig(gymIdOrName?: string | null): GymMapConfig | null {
  if (!gymIdOrName) return GYM_MAP_CONFIGS['b0000000-0000-0000-0000-000000000002'] || null;

  // Search by ID
  if (GYM_MAP_CONFIGS[gymIdOrName]) {
    return GYM_MAP_CONFIGS[gymIdOrName];
  }

  // Search by name (case-insensitive and substring match)
  const query = gymIdOrName.toLowerCase();
  for (const config of Object.values(GYM_MAP_CONFIGS)) {
    const configName = config.gymName.toLowerCase();
    if (
      config.gymId === gymIdOrName ||
      configName === query ||
      query.includes(configName) ||
      configName.includes(query)
    ) {
      return config;
    }
  }

  // Fallback to Hub
  return GYM_MAP_CONFIGS['b0000000-0000-0000-0000-000000000002'] || null;
}

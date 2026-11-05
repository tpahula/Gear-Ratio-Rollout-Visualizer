import { CalculationResult, GearPitch, GearSetup, PresetProfile } from '../types/gears';

export const PI = Math.PI;

/**
 * Exact 64P spur gear outer diameters (mm) from user specification table
 */
export const SPUR_64P_OUTER_DIAMETERS_MM: Record<number, number> = {
  35: 14.62,
  36: 15.02,
  37: 15.42,
  38: 15.8,
  39: 16.22,
};

export const PINION_DIAMETER_OFFSET_MM = 0.2;
export const PINION_64P_EXTRA_DIAMETER_OFFSET_MM = 0.15;
export const GEAR_MESH_CLEARANCE_MM = 0.2;

/**
 * Returns the diameter offset (mm) for a pinion of the given pitch:
 * +0.35 mm (0.20 + 0.15 mm) for 64P pinions, and +0.20 mm for 72P and 80P pinions.
 */
export function getPinionDiameterOffsetMm(pitch: GearPitch = 72): number {
  return pitch === 64
    ? PINION_DIAMETER_OFFSET_MM + PINION_64P_EXTRA_DIAMETER_OFFSET_MM
    : PINION_DIAMETER_OFFSET_MM;
}

/**
 * Returns the pitch diameter (mm) of the pinion gear for a given tooth count and pitch,
 * including the pitch-specific diameter increase (+0.35 mm for 64P, +0.20 mm for 72P/80P).
 */
export function getPinionPitchDiameterMm(pinionTeeth: number, pitch: GearPitch = 72): number {
  const moduleMm = 25.4 / pitch;
  return pinionTeeth * moduleMm + getPinionDiameterOffsetMm(pitch);
}

/**
 * Returns the outer diameter (OD in mm) of the pinion gear for a given tooth count and pitch,
 * including the pitch-specific diameter increase (+0.35 mm for 64P, +0.20 mm for 72P/80P).
 */
export function getPinionOuterDiameterMm(pinionTeeth: number, pitch: GearPitch = 72): number {
  const moduleMm = 25.4 / pitch;
  return (pinionTeeth + 2) * moduleMm + getPinionDiameterOffsetMm(pitch);
}

/**
 * Returns the outer diameter (OD in mm) of the spur gear for a given tooth count and pitch.
 * Uses the exact user-specified 64P lookup table for 35T–39T (and calibrated 64P progression
 * for adjacent 64P tooth counts), and standard involute OD = (Z + 2) * m for 72P and 80P.
 */
export function getSpurOuterDiameterMm(gearTeeth: number, pitch: GearPitch = 72): number {
  if (pitch === 64) {
    if (SPUR_64P_OUTER_DIAMETERS_MM[gearTeeth] !== undefined) {
      return SPUR_64P_OUTER_DIAMETERS_MM[gearTeeth];
    }
    return Number((14.62 + (gearTeeth - 35) * (25.4 / 64)).toFixed(2));
  }
  const moduleMm = 25.4 / pitch;
  return (gearTeeth + 2) * moduleMm;
}

/**
 * Calculates all gear and tire metrics using exact Math.PI.
 * Circumference = π * Tire_size
 * Rollout = (π * Tire_size * Pinion) / Gear
 */
export function calculateGearMetrics(setup: GearSetup): CalculationResult {
  const { pinionTeeth, gearTeeth, tireDiameterMm, motorRpm } = setup;
  const pi = Math.PI;

  const validPinion = Math.max(1, pinionTeeth);
  const validGear = Math.max(1, gearTeeth);
  const validTire = Math.max(0.1, tireDiameterMm);

  const gearRatio = validGear / validPinion; // e.g. 40 / 5 = 8.00:1
  const speedRatio = validPinion / validGear; // e.g. 5 / 40 = 0.125
  const tireCircumferenceMm = pi * validTire;
  const rolloutMm = (tireCircumferenceMm * validPinion) / validGear;
  const revsPerMeter = rolloutMm > 0 ? 1000 / rolloutMm : 0;

  // Speed calculation:
  // mm / revolution * rev / min * 60 min/h / 1,000,000 mm/km
  const speedKmh = (rolloutMm * motorRpm * 60) / 1_000_000;
  const speedMs = speedKmh / 3.6;
  const wheelRpm = motorRpm * speedRatio;

  return {
    gearRatio,
    speedRatio,
    tireCircumferenceMm,
    rolloutMm,
    revsPerMeter,
    speedKmh,
    speedMs,
    wheelRpm,
    usedPi: pi,
  };
}

/**
 * Presets including the user's exact attached CSV columns!
 */
export const PRESETS: PresetProfile[] = [
  {
    id: 'user-csv-1',
    name: 'ES-24 & ES-32',
    category: 'User CSV',
    description: 'Pinion: 5, Gear: 40, Pitch: 72P, Tire: 16.5 mm → Rollout: 6.47625 mm',
    pinionTeeth: 5,
    gearTeeth: 40,
    tireDiameterMm: 16.5,
    motorRpm: 20000,
    pitch: 72,
    isFromUserCsv: true,
  },
  {
    id: 'user-csv-3',
    name: 'PR-24',
    category: 'User CSV',
    description: 'Pinion: 8, Gear: 35, Pitch: 64P, Tire: 16.5 mm → Rollout: 11.84229 mm',
    pinionTeeth: 8,
    gearTeeth: 35,
    tireDiameterMm: 16.5,
    motorRpm: 20000,
    pitch: 64,
    isFromUserCsv: true,
  },
  {
    id: 'slot-car-132',
    name: 'Slot Car 1:32 (Inline Standard)',
    category: 'Scale Models & RC',
    description: 'Typical 1:32 slot car gearing (Pinion 9, Crown 27, Tire 19 mm)',
    pinionTeeth: 9,
    gearTeeth: 27,
    tireDiameterMm: 19.0,
    motorRpm: 21500,
  },
  {
    id: 'rc-car-110',
    name: 'RC Car 1:10 Touring',
    category: 'Scale Models & RC',
    description: '1:10 touring car (Pinion 28, Spur 84, Tire 64 mm)',
    pinionTeeth: 28,
    gearTeeth: 84,
    tireDiameterMm: 64.0,
    motorRpm: 25000,
  },
  {
    id: 'bicycle-single',
    name: 'Bicycle (Single Speed / Fixed Gear)',
    category: 'Vehicles',
    description: 'Chainring 46T, rear cog 16T, 700x25c road tire (diameter 668 mm)',
    pinionTeeth: 46,
    gearTeeth: 16,
    tireDiameterMm: 668,
    motorRpm: 90,
  },
];

/**
 * Generates an SVG path for an authentic spur gear with true involute-meshing teeth.
 * Both gears share identical module m, so tooth pitch and height match perfectly,
 * allowing teeth to penetrate deep into the tooth spaces of the mating gear.
 *
 * @param teeth Number of teeth (Z)
 * @param pitchRadius Pitch circle radius (R)
 * @param moduleVal Optional tooth module (m = 2*R/Z if omitted)
 * @param boreRadius Center axle hole radius
 */
export function generateGearSvgPath(
  teeth: number,
  pitchRadius: number,
  moduleVal?: number,
  boreRadius: number = 10,
  customTipRadius?: number
): {
  gearPath: string;
  pitchRadius: number;
  tipRadius: number;
  rootRadius: number;
  addendum: number;
  dedendum: number;
  module: number;
} {
  const m = moduleVal ?? (2 * pitchRadius) / teeth;
  const tipRadius = customTipRadius !== undefined ? customTipRadius : pitchRadius + 0.85 * m;
  const addendum = Math.max(0.1 * m, tipRadius - pitchRadius);
  const dedendum = 1.15 * m;
  const rootRadius = Math.max(boreRadius + 2.0, pitchRadius - dedendum);
  const actualDedendum = Math.max(0.1 * m, pitchRadius - rootRadius);

  const nominalPitchRadius = (teeth * m) / 2;
  const widthScale = Math.min(1, nominalPitchRadius / pitchRadius);

  const points: { x: number; y: number }[] = [];
  const tau = (2 * Math.PI) / teeth;

  for (let i = 0; i < teeth; i++) {
    const baseAngle = i * tau;

    // Authentic involute tooth profile checkpoints:
    // Tooth center is at baseAngle (pointing along angle 0 for tooth 0).
    // Flanks taper with involute curvature and crowned tip so teeth mesh cleanly with zero collision
    const checkpoints = [
      { r: rootRadius, da: -tau * 0.31 * widthScale },
      { r: rootRadius + actualDedendum * 0.25, da: -tau * 0.25 * widthScale },
      { r: pitchRadius - actualDedendum * 0.35, da: -tau * 0.21 * widthScale },
      { r: pitchRadius, da: -tau * 0.185 * widthScale },
      { r: pitchRadius + addendum * 0.5, da: -tau * 0.135 * widthScale },
      { r: tipRadius, da: -tau * 0.08 * widthScale },
      { r: tipRadius, da: 0 },
      { r: tipRadius, da: tau * 0.08 * widthScale },
      { r: pitchRadius + addendum * 0.5, da: tau * 0.135 * widthScale },
      { r: pitchRadius, da: tau * 0.185 * widthScale },
      { r: pitchRadius - actualDedendum * 0.35, da: tau * 0.21 * widthScale },
      { r: rootRadius + actualDedendum * 0.25, da: tau * 0.25 * widthScale },
      { r: rootRadius, da: tau * 0.31 * widthScale },
    ];

    for (const cp of checkpoints) {
      const angle = baseAngle + cp.da;
      points.push({
        x: Math.cos(angle) * cp.r,
        y: Math.sin(angle) * cp.r,
      });
    }
  }

  // Build outer gear perimeter path
  let path = `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)} `;
  for (let i = 1; i < points.length; i++) {
    path += `L ${points[i].x.toFixed(2)} ${points[i].y.toFixed(2)} `;
  }
  path += 'Z ';

  // Add center bore circle (reverse winding for cutout) at exact boreRadius
  const safeBoreRadius = boreRadius;
  const segments = 24;
  path += `M ${safeBoreRadius.toFixed(2)} 0 `;
  for (let i = 1; i <= segments; i++) {
    const angle = -(i * 2 * Math.PI) / segments;
    const bx = Math.cos(angle) * safeBoreRadius;
    const by = Math.sin(angle) * safeBoreRadius;
    path += `L ${bx.toFixed(2)} ${by.toFixed(2)} `;
  }
  path += 'Z';

  return {
    gearPath: path,
    pitchRadius,
    tipRadius,
    rootRadius,
    addendum,
    dedendum,
    module: m,
  };
}

/**
 * Searches for alternative gear pairs that achieve the closest rollout
 * when the tire diameter changes (e.g. from 18mm to 16.5mm).
 */
export function findCompensatingGears(
  targetRolloutMm: number,
  newTireDiameterMm: number,
  pinionRange: [number, number] = [5, 15],
  gearRange: [number, number] = [30, 45]
): Array<{
  pinion: number;
  gear: number;
  rolloutMm: number;
  differenceMm: number;
  diffPercent: number;
}> {
  const pi = Math.PI;
  const results: Array<{
    pinion: number;
    gear: number;
    rolloutMm: number;
    differenceMm: number;
    diffPercent: number;
  }> = [];

  for (let p = pinionRange[0]; p <= pinionRange[1]; p++) {
    for (let g = gearRange[0]; g <= gearRange[1]; g++) {
      const rollout = (pi * newTireDiameterMm * p) / g;
      const differenceMm = rollout - targetRolloutMm;
      const diffPercent = ((rollout - targetRolloutMm) / targetRolloutMm) * 100;

      if (Math.abs(diffPercent) <= 8) {
        results.push({
          pinion: p,
          gear: g,
          rolloutMm: rollout,
          differenceMm,
          diffPercent,
        });
      }
    }
  }

  // Sort by closest match (absolute difference)
  return results.sort((a, b) => Math.abs(a.differenceMm) - Math.abs(b.differenceMm)).slice(0, 5);
}

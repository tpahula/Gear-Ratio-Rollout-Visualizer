/**
 * Gear and rollout calculation types
 */

export type GearPitch = 64 | 72 | 80;
export type AxleSize = '3/32' | '2mm';
export type AxleHeightLockRef = 'top' | 'center';

export interface GearSetup {
  pinionTeeth: number;       // Z1, moottoriratas / pikkuratas
  gearTeeth: number;         // Z2, pääratas / toinen hammaspyörä
  tireDiameterMm: number;    // D, renkaan halkaisija millimetreinä
  motorRpm: number;          // Moottorin kierrosluku (rpm)
  pitch?: GearPitch;         // Hammasjako (Diametral Pitch: 64P, 72P, 80P)
  axleSize?: AxleSize;       // Spurrin akselin paksuus: '3/32' (2.381 mm) tai '2mm' (2.000 mm)
  pinionShaftDiaMm?: number; // Pinjonin akselin halkaisija (mm, 1.5 mm tai 2.0 mm; tukee 72p 2mm pinjoneita)
  motorDiameterMm?: number;  // Moottorin halkaisija millimetreinä (13.5 mm – 14.5 mm, oletus 14.0 mm)
  motorOffsetMm?: number;    // Moottorin pystysuuntainen offset spurin akselin alapuolelle (mm, oletus 0.0 mm)
  gearMeshClearanceMm?: number; // Ratasvälys / Gear mesh clearance millimetreinä (oletus 0.10 mm)
  lockAxleHeight86?: boolean; // Lukitse rungon alapinta (oletus true = 8.60 mm akselin yläpinnasta)
  lockedChassisMm?: number;   // Lukittu mitta millimetreinä (oletus 8.60 mm)
  axleHeightLockRef?: AxleHeightLockRef; // 'top' (Akselin yläpinnasta) tai 'center' (Akselin keskilinjasta)
}

export interface CalculationResult {
  gearRatio: number;         // Z2 / Z1, esim. 40 / 5 = 8.00:1 (välityssuhde)
  speedRatio: number;        // Z1 / Z2, esim. 5 / 40 = 0.125 (nopeussuhde)
  tireCircumferenceMm: number; // pi * D
  rolloutMm: number;         // (pi * D * Z1) / Z2, etenemä millimetreinä per moottorin kierros
  revsPerMeter: number;      // 1000 / rolloutMm (moottorin kierroksia metriä kohti)
  speedKmh: number;          // Nopeus km/h tietyllä moottorin RPM:llä
  speedMs: number;           // Nopeus m/s
  wheelRpm: number;          // Renkaan / taka-akselin kierrosluku (rpm)
  usedPi: number;            // Käytetty piin arvo (3.14 tai 3.14159265...)
}

export interface PresetProfile {
  id: string;
  name: string;
  category: string;
  description: string;
  pinionTeeth: number;
  gearTeeth: number;
  tireDiameterMm: number;
  motorRpm: number;
  pitch?: GearPitch;
  isFromUserCsv?: boolean;
}

export interface ComparisonItem {
  id: string;
  name: string;
  pinionTeeth: number;
  gearTeeth: number;
  tireDiameterMm: number;
  color: string;
}

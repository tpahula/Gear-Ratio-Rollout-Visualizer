import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Play, Pause, RotateCcw, StepForward, Compass, Lock, Unlock } from 'lucide-react';
import { AxleSize, CalculationResult, GearPitch, GearSetup } from '../types/gears';
import {
  GEAR_MESH_CLEARANCE_MM,
  generateGearSvgPath,
  getPinionOuterDiameterMm,
  getPinionPitchDiameterMm,
  getSpurOuterDiameterMm,
} from '../utils/gearMath';
import { Language, translations } from '../i18n/translations';

interface GearVisualizerProps {
  setup: GearSetup;
  metrics: CalculationResult;
  lang: Language;
  onChangePitch?: (pitch: GearPitch) => void;
  onChangeAxleSize?: (axleSize: AxleSize) => void;
  onChangeMotorOffset?: (motorOffsetMm: number) => void;
  onChangeMeshClearance?: (gearMeshClearanceMm: number) => void;
  onToggleLockAxleHeight?: (locked: boolean) => void;
}

export const GearVisualizer: React.FC<GearVisualizerProps> = ({
  setup,
  metrics,
  lang,
  onChangePitch,
  onChangeAxleSize,
  onChangeMotorOffset,
  onChangeMeshClearance,
  onToggleLockAxleHeight,
}) => {
  const t = translations[lang];
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [speedMultiplier, setSpeedMultiplier] = useState<number>(1);
  const [pinionAngle, setPinionAngle] = useState<number>(0);
  const [totalMotorRevs, setTotalMotorRevs] = useState<number>(0);
  const [viewMode, setViewMode] = useState<'combined' | 'gears' | 'mesh' | 'axle' | 'wheel'>('combined');

  const animationFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(performance.now());
  const isDraggingRef = useRef<boolean>(false);
  const dragStartAngleRef = useRef<number>(0);

  const { pinionTeeth, gearTeeth, tireDiameterMm } = setup;
  const pitch: GearPitch = setup.pitch ?? 72;
  const axleSize: AxleSize = setup.axleSize ?? '3/32';
  const motorDiameterMm: number = setup.motorDiameterMm ?? 14.0;
  const motorOffsetMm: number = setup.motorOffsetMm ?? 0.0;
  const gearMeshClearanceMm: number = setup.gearMeshClearanceMm ?? GEAR_MESH_CLEARANCE_MM;
  const lockAxleHeight86: boolean = setup.lockAxleHeight86 ?? true;
  const lockedChassisMm: number = setup.lockedChassisMm ?? 8.6;
  const { gearRatio, speedRatio, rolloutMm, tireCircumferenceMm } = metrics;

  // Geometry calculations for gears factoring in Diametral Pitch (64P, 72P, 80P), Spur Axle Thickness (3/32" vs 2mm), and Motor Diameter (13.5-14.5mm)
  // Metric module m_mm = 25.4 / pitch:
  //   64P -> 0.3969 mm
  //   72P -> 0.3528 mm
  //   80P -> 0.3175 mm
  // Both gears share the exact same module m so teeth interlock 100% accurately,
  // and gear diameters scale physically with both tooth count (Z) and pitch (64P / 72P / 80P).
  const geometry = useMemo(() => {
    const moduleMm = 25.4 / pitch;
    const pinionPitchDiaMm = getPinionPitchDiameterMm(pinionTeeth, pitch);
    const spurPitchDiaMm = gearTeeth * moduleMm;
    // Pinion outer diameter (+0.2 mm across all pinions) and Spur outer diameter (uses exact 64P table: 35T=14.62, 36T=15.02, 37T=15.42, 38T=15.8, 39T=16.22)
    const pinionOuterDiaMm = getPinionOuterDiameterMm(pinionTeeth, pitch);
    const pinionOuterRadiusMm = pinionOuterDiaMm / 2;
    const spurOuterDiaMm = getSpurOuterDiameterMm(gearTeeth, pitch);
    const spurOuterRadiusMm = spurOuterDiaMm / 2;
    const meshClearanceMm = gearMeshClearanceMm;
    const centerDistanceMm = (pinionPitchDiaMm + spurPitchDiaMm) / 2 + meshClearanceMm;

    // Pinion Motor Shaft: strictly 2.0 mm for 64P, 1.5 mm for 72P and 80P
    const pinionShaftDiaMm = pitch === 64 ? 2.0 : 1.5;
    const pinionShaftRadiusMm = pinionShaftDiaMm / 2;
    const ref2mmPinionShaftRadiusMm = 1.0;

    // Spur Axle diameter & radius in mm:
    // 3/32" = 2.38125 mm (r = 1.190625 mm), 2mm = 2.000 mm (r = 1.000 mm)
    const axleDiaMm = axleSize === '3/32' ? (3 / 32) * 25.4 : 2.0;
    const axleRadiusMm = axleDiaMm / 2;
    const ref332RadiusMm = ((3 / 32) * 25.4) / 2;

    // Road surface is always at the bottom of the tire (tireDiameterMm / 2 below axle center)
    const axleCenterHeightMm = tireDiameterMm / 2;
    const effectiveTireRadiusMm = tireDiameterMm / 2;
    const spurGroundClearanceMm = axleCenterHeightMm - spurOuterRadiusMm;

    // Chassis bottom surface (rungon alapinta):
    // - When lockAxleHeight86 is ON: locked at lockedChassisMm (default 8.60 mm) below the spur axle's top surface (-axleRadiusMm).
    // - When lockAxleHeight86 is OFF: moves according to the spur gear's radius (spurOuterRadiusMm).
    const chassisBottomFromCenterMm = lockAxleHeight86
      ? lockedChassisMm - axleRadiusMm
      : spurOuterRadiusMm;
    const axleTopToChassisBottomMm = chassisBottomFromCenterMm + axleRadiusMm;
    const chassisGroundClearanceMm = axleCenterHeightMm - chassisBottomFromCenterMm;

    // Motor diameter, downward vertical offset (below spur axle), & ground clearance
    const motorRadiusMm = motorDiameterMm / 2;
    const clampedOffsetMm = Math.min(centerDistanceMm, Math.max(0, motorOffsetMm));
    const offsetAngleRad =
      centerDistanceMm > 0 ? Math.asin(Math.min(1, clampedOffsetMm / centerDistanceMm)) : 0;
    const offsetAngleDeg = (offsetAngleRad * 180) / Math.PI;
    const motorGroundClearanceMm = axleCenterHeightMm - motorRadiusMm - clampedOffsetMm;
    // Distance from Motor outer radius (R_m) to Spur Axle centerline (C - R_m)
    const motorToAxleCenterMm = centerDistanceMm - motorRadiusMm;
    // Surface-to-surface gap between Motor outer radius (R_m) and Spur Axle outer surface (r_a): C - R_m - r_a
    const motorToAxleGapMm = centerDistanceMm - motorRadiusMm - axleRadiusMm;

    // Monitored dimension: distance between axle top surface and spur gear outer diameter
    // Caliper span (top of axle to bottom outer edge of spur gear): R_outer + r_axle
    const axleTopToSpurOuterMm = spurOuterRadiusMm + axleRadiusMm;
    // Same-side radial wall (top of axle to top outer edge of spur gear): R_outer - r_axle
    const axleRadialWallMm = spurOuterRadiusMm - axleRadiusMm;
    // Show threshold breach (< 8.59 mm) in simulation ONLY when 3/32" axle is used
    const isUnder86Mm = axleSize === '3/32' && axleTopToSpurOuterMm < 8.59;

    const totalTeeth = pinionTeeth + gearTeeth;
    // Unified physical scale: 1 mm = 20.5 SVG pixels (at 64P, m = 8.14 px; at 72P, m = 7.23 px; at 80P, m = 6.51 px)
    const pxPerMm = totalTeeth <= 65 ? 20.5 : (480 / totalTeeth) / moduleMm;
    const m = moduleMm * pxPerMm;

    // Pitch radii for both Pinion (r1) and Spur (r2), plus 0.10 mm gear mesh clearance (meshClearancePx)
    // so that r1 + r2 + meshClearancePx === centerDistanceMm * pxPerMm
    const pinionPitchRadiusMm = pinionPitchDiaMm / 2;
    const spurPitchRadiusMm = spurPitchDiaMm / 2;
    const r1 = pinionPitchRadiusMm * pxPerMm;
    const r2 = spurPitchRadiusMm * pxPerMm;
    const meshClearancePx = meshClearanceMm * pxPerMm;
    const centerDistancePx = r1 + r2 + meshClearancePx;

    const pinionShaftVisualRadius = pinionShaftRadiusMm * pxPerMm;
    const effectivePinionBoreVisualRadius = Math.min(
      pinionShaftVisualRadius,
      Math.max(2.5, r1 - 1.15 * m - 1.2)
    );
    const ref2mmPinionShaftVisualRadius = ref2mmPinionShaftRadiusMm * pxPerMm;
    const axleVisualRadius = axleRadiusMm * pxPerMm;
    const ref332VisualRadius = ref332RadiusMm * pxPerMm;
    const motorVisualRadius = motorRadiusMm * pxPerMm;
    const offsetPx = clampedOffsetMm * pxPerMm;

    // Spur gear & wheel axle is anchored at (gearX, gearY);
    // Pinion shifts along the pitch circle arc by offsetAngleRad at centerDistancePx (r1 + r2 + meshClearancePx)
    // with 0.10 mm mesh clearance centered at (meshX, meshY) while placing the motor below the spur axle.
    const gearX = 500;
    const gearY = 205;
    const meshX = gearX - (r2 + meshClearancePx / 2) * Math.cos(offsetAngleRad);
    const meshY = gearY + (r2 + meshClearancePx / 2) * Math.sin(offsetAngleRad);
    const pinionX = gearX - centerDistancePx * Math.cos(offsetAngleRad);
    const pinionY = gearY + centerDistancePx * Math.sin(offsetAngleRad);

    // Generate accurate involute SVG paths with shared module m, exact pinion shaft bore, and exact outer radii
    const pinionPathData = generateGearSvgPath(
      pinionTeeth,
      r1,
      m,
      effectivePinionBoreVisualRadius,
      pinionOuterRadiusMm * pxPerMm
    );
    const gearPathData = generateGearSvgPath(
      gearTeeth,
      r2,
      m,
      axleVisualRadius,
      spurOuterRadiusMm * pxPerMm
    );

    // Dynamic wheel radius, chassis bottom surface, and ground distance on the same physical scale (1 mm = pxPerMm)
    const wheelVisualRadius = effectiveTireRadiusMm * pxPerMm;
    const groundDistancePx = axleCenterHeightMm * pxPerMm;
    const roadY = gearY + groundDistancePx;
    const chassisBottomPx = chassisBottomFromCenterMm * pxPerMm;
    const chassisBottomY = gearY + chassisBottomPx;
    const spurToChassisBottomMm = axleTopToChassisBottomMm - axleTopToSpurOuterMm;

    return {
      meshX,
      meshY,
      pinionX,
      pinionY,
      gearX,
      gearY,
      r1,
      r2,
      m,
      pxPerMm,
      moduleMm,
      pinionPitchDiaMm,
      spurPitchDiaMm,
      pinionOuterDiaMm,
      pinionOuterRadiusMm,
      spurOuterDiaMm,
      spurOuterRadiusMm,
      pinionShaftDiaMm,
      pinionShaftRadiusMm,
      pinionShaftVisualRadius,
      ref2mmPinionShaftVisualRadius,
      meshClearanceMm,
      meshClearancePx,
      centerDistancePx,
      centerDistanceMm,
      axleCenterHeightMm,
      spurGroundClearanceMm,
      chassisBottomFromCenterMm,
      axleTopToChassisBottomMm,
      chassisGroundClearanceMm,
      spurToChassisBottomMm,
      chassisBottomPx,
      chassisBottomY,
      motorRadiusMm,
      motorVisualRadius,
      motorGroundClearanceMm,
      motorToAxleCenterMm,
      motorToAxleGapMm,
      effectivePinionBoreVisualRadius,
      clampedOffsetMm,
      offsetPx,
      offsetAngleRad,
      offsetAngleDeg,
      axleDiaMm,
      axleRadiusMm,
      axleVisualRadius,
      ref332VisualRadius,
      axleTopToSpurOuterMm,
      axleRadialWallMm,
      isUnder86Mm,
      pinionPath: pinionPathData.gearPath,
      gearPath: gearPathData.gearPath,
      pinionTipRadius: pinionPathData.tipRadius,
      pinionRootRadius: pinionPathData.rootRadius,
      gearTipRadius: gearPathData.tipRadius,
      gearRootRadius: gearPathData.rootRadius,
      wheelVisualRadius,
      groundDistancePx,
      roadY,
    };
  }, [
    pinionTeeth,
    gearTeeth,
    tireDiameterMm,
    pitch,
    axleSize,
    setup.pinionShaftDiaMm,
    motorDiameterMm,
    motorOffsetMm,
    gearMeshClearanceMm,
    lockAxleHeight86,
    lockedChassisMm,
  ]);

  // Animation loop
  useEffect(() => {
    const updateAnimation = (time: number) => {
      const delta = (time - lastTimeRef.current) / 1000;
      lastTimeRef.current = time;

      if (isPlaying && !isDraggingRef.current) {
        // Base rotational speed in degrees/second
        // Scaled to a comfortable visual speed
        const baseSpeedDeg = 90 * speedMultiplier;
        const deltaAngle = baseSpeedDeg * delta;

        setPinionAngle((prev) => {
          const next = (prev + deltaAngle) % 360000;
          return next;
        });

        setTotalMotorRevs((prev) => prev + deltaAngle / 360);
      }

      animationFrameRef.current = requestAnimationFrame(updateAnimation);
    };

    lastTimeRef.current = performance.now();
    animationFrameRef.current = requestAnimationFrame(updateAnimation);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying, speedMultiplier]);

  // Authentic meshing phase factoring in motor downward offset angle (offsetAngleDeg):
  // The line of centers from Pinion to Spur is at angle -offsetAngleDeg, and from Spur to Pinion at 180 - offsetAngleDeg.
  const pinionRenderAngle = pinionAngle - geometry.offsetAngleDeg;
  const gearAngle = -(pinionAngle * speedRatio) + 180 - geometry.offsetAngleDeg + (180 / gearTeeth);
  const totalWheelRevs = totalMotorRevs * speedRatio;
  const totalDistanceMm = totalMotorRevs * rolloutMm;

  // Step 1 exact motor revolution
  const handleStepOneMotorRev = () => {
    setIsPlaying(false);
    setPinionAngle((prev) => prev + 360);
    setTotalMotorRevs((prev) => prev + 1);
  };

  // Reset counters
  const handleResetCounters = () => {
    setPinionAngle(0);
    setTotalMotorRevs(0);
  };

  // Drag interaction on gears
  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    isDraggingRef.current = true;
    dragStartAngleRef.current = e.clientX;
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!isDraggingRef.current) return;
    const deltaX = e.clientX - dragStartAngleRef.current;
    dragStartAngleRef.current = e.clientX;
    const deltaDeg = deltaX * 1.5;
    setPinionAngle((prev) => prev + deltaDeg);
    setTotalMotorRevs((prev) => prev + deltaDeg / 360);
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  return (
    <div className="w-full bg-slate-900/90 dark:bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl text-slate-100 flex flex-col">
      {/* Top Visualizer Control Bar */}
      <div className="px-5 py-3.5 bg-slate-950/70 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
            <Compass className="w-4 h-4" />
            {t.visHeading}
          </span>
          <span className="text-slate-600 dark:text-slate-600">·</span>
          <span className="text-xs text-slate-400">
            {t.visDriving.replace('{pinion}', pinionTeeth.toString()).replace('{gear}', gearTeeth.toString()).replace('{ratio}', gearRatio.toFixed(2))}
          </span>
        </div>

        {/* Playback, Pitch (64P/72P/80P), Axle (3/32" / 2mm) & View Mode Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Pitch selector buttons directly in simulation bar */}
          <div className="flex items-center gap-1 p-0.5 bg-slate-800/90 border border-slate-700/80 rounded-lg text-xs font-mono">
            <span className="px-2 text-[10px] font-sans font-semibold text-slate-400 hidden sm:inline">
              {t.visPitchLabel}
            </span>
            {([64, 72, 80] as const).map((p) => (
              <button
                key={p}
                onClick={() => onChangePitch?.(p)}
                className={`px-2 py-1 rounded-md font-bold transition-colors ${
                  pitch === p
                    ? 'bg-sky-500 text-slate-950 shadow-xs'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
                }`}
              >
                <span className="flex items-center gap-1">
                  <span>{p}P</span>
                  <span className="text-[9px] font-normal opacity-75">({p === 64 ? '2.0' : '1.5'}mm)</span>
                </span>
              </button>
            ))}
          </div>

          {/* Spur Axle thickness selector buttons (3/32" vs 2mm) */}
          <div className="flex items-center gap-1 p-0.5 bg-slate-800/90 border border-slate-700/80 rounded-lg text-xs font-mono">
            <span className="px-2 text-[10px] font-sans font-semibold text-slate-400 hidden sm:inline">
              {t.visAxleLabel}
            </span>
            {([
              { id: '3/32' as AxleSize, label: '3/32"' },
              { id: '2mm' as AxleSize, label: '2mm' },
            ]).map((ax) => (
              <button
                key={ax.id}
                onClick={() => onChangeAxleSize?.(ax.id)}
                className={`px-2 py-1 rounded-md font-bold transition-colors ${
                  axleSize === ax.id
                    ? geometry.isUnder86Mm
                      ? 'bg-rose-500 text-white shadow-xs'
                      : 'bg-emerald-500 text-slate-950 shadow-xs'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
                }`}
              >
                {ax.label}
              </button>
            ))}
          </div>

          {/* Chassis Bottom Lock Mode Selector (Locked vs Free / Spur Radius) */}
          <div className="flex items-center gap-1 p-0.5 bg-slate-800/90 border border-slate-700/80 rounded-lg text-xs font-mono">
            <span className="px-2 text-[10px] font-sans font-semibold text-slate-400 hidden sm:inline">
              {t.visLockLabel}
            </span>
            <button
              onClick={() => onToggleLockAxleHeight?.(true)}
              className={`px-2 py-1 rounded-md font-bold transition-colors flex items-center gap-1 ${
                lockAxleHeight86
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
              }`}
              title={t.visLock86Button}
            >
              <Lock className="w-3 h-3" />
              <span>{t.visLockModeLocked.replace('{val}', lockedChassisMm.toFixed(1))}</span>
            </button>
            <button
              onClick={() => onToggleLockAxleHeight?.(false)}
              className={`px-2 py-1 rounded-md font-bold transition-colors flex items-center gap-1 ${
                !lockAxleHeight86
                  ? 'bg-sky-500 text-slate-950 shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
              }`}
              title={t.visLockModeFree}
            >
              <Unlock className="w-3 h-3" />
              <span>{t.visLockModeFree}</span>
            </button>
          </div>

          {/* Motor Offset below Spur Axle selector buttons */}
          <div className="flex items-center gap-1 p-0.5 bg-slate-800/90 border border-slate-700/80 rounded-lg text-xs font-mono">
            <span className="px-2 text-[10px] font-sans font-semibold text-slate-400 hidden sm:inline">
              {t.visMotorOffsetLabel}
            </span>
            {[0.0, 0.5, 1.0].map((off) => (
              <button
                key={off}
                onClick={() => onChangeMotorOffset?.(off)}
                className={`px-2 py-1 rounded-md font-bold transition-colors ${
                  Math.abs(motorOffsetMm - off) < 0.001
                    ? 'bg-fuchsia-500 text-white shadow-xs'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
                }`}
              >
                {off === 0 ? '0mm' : `-${off.toFixed(1)}mm`}
              </button>
            ))}
          </div>

          {/* Gear Mesh Clearance quick selector buttons */}
          <div className="flex items-center gap-1 p-0.5 bg-slate-800/90 border border-slate-700/80 rounded-lg text-xs font-mono">
            <span className="px-2 text-[10px] font-sans font-semibold text-slate-400 hidden sm:inline">
              {t.visMeshClearanceLabel}
            </span>
            {[0.0, 0.05, 0.1, 0.15, 0.2, 0.25].map((meshVal) => (
              <button
                key={meshVal}
                onClick={() => onChangeMeshClearance?.(meshVal)}
                className={`px-2 py-1 rounded-md font-bold transition-colors ${
                  Math.abs(gearMeshClearanceMm - meshVal) < 0.001
                    ? 'bg-rose-500 text-white shadow-xs'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
                }`}
              >
                {meshVal.toFixed(2)}mm
              </button>
            ))}
          </div>

          {/* View toggle */}
          <div className="flex items-center p-0.5 bg-slate-800/80 rounded-lg text-xs font-medium mr-2">
            <button
              onClick={() => setViewMode('combined')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                viewMode === 'combined'
                  ? 'bg-amber-500 text-slate-950 font-semibold shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {t.visModeAll}
            </button>
            <button
              onClick={() => setViewMode('gears')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                viewMode === 'gears'
                  ? 'bg-amber-500 text-slate-950 font-semibold shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {t.visModeGears}
            </button>
            <button
              onClick={() => setViewMode('mesh')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                viewMode === 'mesh'
                  ? 'bg-amber-500 text-slate-950 font-semibold shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {t.visModeMesh}
            </button>
            <button
              onClick={() => setViewMode('axle')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                viewMode === 'axle'
                  ? 'bg-amber-500 text-slate-950 font-semibold shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {t.visModeAxle}
            </button>
            <button
              onClick={() => setViewMode('wheel')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                viewMode === 'wheel'
                  ? 'bg-amber-500 text-slate-950 font-semibold shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {t.visModeWheel}
            </button>
          </div>

          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-lg transition-colors shadow-xs"
            title={isPlaying ? t.visPause : t.visPlay}
          >
            {isPlaying ? (
              <>
                <Pause className="w-3.5 h-3.5" />
                <span>{t.visPause}</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5" />
                <span>{t.visPlay}</span>
              </>
            )}
          </button>

          <button
            onClick={handleStepOneMotorRev}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg transition-colors border border-slate-700"
            title={t.visStepMotor}
          >
            <StepForward className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">{t.visStepMotor}</span>
          </button>

          <button
            onClick={handleResetCounters}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white text-xs rounded-lg transition-colors"
            title={t.visResetCounters}
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* SVG Canvas Stage */}
      <div className="relative w-full aspect-[16/9] min-h-[380px] max-h-[540px] bg-slate-950 flex items-center justify-center select-none overflow-hidden cursor-grab active:cursor-grabbing">
        {/* Engineering Grid Backdrop */}
        <div
          className="absolute inset-0 opacity-15 pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, #94a3b8 1px, transparent 0)`,
            backgroundSize: '24px 24px',
          }}
        />

        {/* Floating Pitch & Axle Distance Telemetry Banner */}
        <div className="absolute top-3 left-4 right-4 z-10 flex flex-wrap items-center justify-end gap-2 pointer-events-none">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-slate-900/90 border border-sky-500/30 text-[11px] font-mono text-sky-300 backdrop-blur-xs shadow-md">
              {t.visPitchInfo
                .replace('{pitch}', pitch.toString())
                .replace('{mod}', geometry.moduleMm.toFixed(3))
                .replace('{center}', geometry.centerDistanceMm.toFixed(2))
                .replace('{mesh}', geometry.meshClearanceMm.toFixed(2))}
            </span>

            {/* Pinion OD & Spur OD Diameter Telemetry Badge */}
            <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-slate-900/90 border border-amber-500/40 text-[11px] font-mono text-amber-300 font-semibold backdrop-blur-xs shadow-md">
              {t.visDiametersBadge
                .replace('{pinionOd}', geometry.pinionOuterDiaMm.toFixed(2))
                .replace('{spurOd}', geometry.spurOuterDiaMm.toFixed(2))}
            </span>

            {/* Axle top surface -> Spur outer diameter badge (shows < 8.59mm breach only for 3/32" axle) */}
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-mono backdrop-blur-xs shadow-md border ${
                geometry.isUnder86Mm
                  ? 'bg-rose-950/95 border-rose-500 text-rose-200 font-extrabold'
                  : 'bg-slate-900/90 border-emerald-500/30 text-emerald-300 font-semibold'
              }`}
            >
              {geometry.isUnder86Mm
                ? t.visAxleTopToOuterWarn.replace('{dist}', geometry.axleTopToSpurOuterMm.toFixed(2))
                : t.visAxleTopToOuterOk
                    .replace('{dist}', geometry.axleTopToSpurOuterMm.toFixed(2))
                    .replace('{radial}', geometry.axleRadialWallMm.toFixed(2))}
            </span>

            <span
              className={`inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-mono backdrop-blur-xs shadow-md border ${
                geometry.spurGroundClearanceMm > 0.2
                  ? 'bg-slate-900/90 border-emerald-500/30 text-emerald-300'
                  : 'bg-rose-950/90 border-rose-500/50 text-rose-300 font-bold'
              }`}
            >
              {geometry.spurGroundClearanceMm >= 0
                ? t.visClearanceOk.replace('{clearance}', geometry.spurGroundClearanceMm.toFixed(2))
                : t.visClearanceWarn.replace('{clearance}', Math.abs(geometry.spurGroundClearanceMm).toFixed(2))}
            </span>

            {/* Motor-to-Axle gap telemetry badge */}
            <span
              className={`inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-mono backdrop-blur-xs shadow-md border ${
                geometry.motorToAxleGapMm > 0.1
                  ? 'bg-slate-900/90 border-violet-500/40 text-violet-300 font-semibold'
                  : 'bg-rose-950/95 border-rose-500 text-rose-200 font-extrabold'
              }`}
            >
              {t.visMotorToAxleGap.replace(
                '{gap}',
                `${geometry.motorToAxleGapMm >= 0 ? '+' : ''}${geometry.motorToAxleGapMm.toFixed(2)}`
              )}
            </span>

            {geometry.clampedOffsetMm > 0.001 && (
              <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-slate-900/90 border border-fuchsia-500/40 text-[11px] font-mono text-fuchsia-300 font-semibold backdrop-blur-xs shadow-md">
                {t.visMotorOffsetTopBadge.replace('{offset}', geometry.clampedOffsetMm.toFixed(2))}
              </span>
            )}

            {lockAxleHeight86 && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-amber-950/90 border border-amber-500/60 text-[11px] font-mono text-amber-300 font-bold backdrop-blur-xs shadow-md">
                <Lock className="w-3 h-3" />
                {t.visAxleLocked86Badge
                  .replace('{val}', lockedChassisMm.toFixed(2))
                  .replace('{ref}', t.visAxleLocked86TopShort)}
              </span>
            )}
          </div>
        </div>

        <svg
          viewBox={
            viewMode === 'mesh'
              ? `${geometry.meshX - 75} ${geometry.meshY - 60} 150 120`
              : viewMode === 'axle'
              ? `${geometry.gearX - 165} ${geometry.gearY - 155} 395 360`
              : '0 0 860 490'
          }
          className="w-full h-full max-w-full transition-all duration-300"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <defs>
            {/* Metallic Gold Gradient for Pinion */}
            <linearGradient id="pinionGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fef08a" />
              <stop offset="50%" stopColor="#eab308" />
              <stop offset="100%" stopColor="#854d0e" />
            </linearGradient>

            {/* Steel Gradient for Spur Gear */}
            <linearGradient id="gearGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#cbd5e1" />
              <stop offset="45%" stopColor="#64748b" />
              <stop offset="100%" stopColor="#1e293b" />
            </linearGradient>

            {/* Rubber Tire Texture Gradient */}
            <radialGradient id="tireGrad" cx="50%" cy="50%" r="50%">
              <stop offset="68%" stopColor="#1e293b" />
              <stop offset="78%" stopColor="#0f172a" />
              <stop offset="92%" stopColor="#020617" />
              <stop offset="100%" stopColor="#1e293b" />
            </radialGradient>

            {/* Wheel Rim Metallic Gradient */}
            <radialGradient id="rimGrad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#e2e8f0" />
              <stop offset="60%" stopColor="#94a3b8" />
              <stop offset="100%" stopColor="#475569" />
            </radialGradient>
          </defs>

          {/* Road / Track surface below the wheels (visible in combined and wheel modes) */}
          {(viewMode === 'combined' || viewMode === 'wheel') && (
            <g className="track-group">
              {/* Ground road bar */}
              <rect
                x="20"
                y={geometry.roadY}
                width="820"
                height="18"
                fill="#1e293b"
                stroke="#334155"
                strokeWidth="1.5"
                rx="4"
              />
              <line
                x1="20"
                y1={geometry.roadY}
                x2="840"
                y2={geometry.roadY}
                stroke="#f59e0b"
                strokeWidth="2"
                strokeDasharray="8 6"
              />

              {/* Moving millimeter ticks on the road surface */}
              {Array.from({ length: 42 }).map((_, idx) => {
                const tickSpacing = 20;
                // Move ticks in sync with wheel rotation
                const offset = (-(totalDistanceMm * 2) % tickSpacing);
                const x = 30 + idx * tickSpacing + offset;
                if (x < 25 || x > 835) return null;
                const isMajor = idx % 5 === 0;
                return (
                  <g key={idx} opacity={0.6}>
                    <line
                      x1={x}
                      y1={geometry.roadY}
                      x2={x}
                      y2={isMajor ? geometry.roadY + 14 : geometry.roadY + 7}
                      stroke="#94a3b8"
                      strokeWidth={isMajor ? 1.5 : 1}
                    />
                    {isMajor && (
                      <text
                        x={x}
                        y={geometry.roadY + 26}
                        fill="#64748b"
                        fontSize="9"
                        textAnchor="middle"
                        fontFamily="monospace"
                      >
                        {idx * 5}mm
                      </text>
                    )}
                  </g>
                );
              })}

              {/* Rollout measurement bracket under wheel contact */}
              <g transform={`translate(${geometry.gearX}, ${geometry.roadY + 10})`}>
                <circle cx="0" cy="-10" r="3.5" fill="#f59e0b" />
                <path
                  d={`M 0,0 L 0,8 L ${Math.min(180, Math.max(30, rolloutMm * 6))},8 L ${Math.min(180, Math.max(30, rolloutMm * 6))},0`}
                  fill="none"
                  stroke="#f59e0b"
                  strokeWidth="1.5"
                />
                <text
                  x={Math.min(90, Math.max(15, (rolloutMm * 6) / 2))}
                  y="22"
                  fill="#f59e0b"
                  fontSize="11"
                  fontWeight="bold"
                  textAnchor="middle"
                  fontFamily="sans-serif"
                >
                  {t.visRolloutBracket.replace('{rollout}', rolloutMm.toFixed(3))}
                </text>
              </g>
            </g>
          )}

          {/* Background Layer: CO-AXIAL TIRE & WHEEL RIM (behind both Pinion and Spur gears) */}
          {(viewMode === 'combined' || viewMode === 'wheel') && (
            <g transform={`translate(${geometry.gearX}, ${geometry.gearY})`}>
              <g transform={`rotate(${gearAngle})`} opacity={viewMode === 'combined' ? 0.85 : 1}>
                {/* TIRE OUTER BODY */}
                <circle
                  r={geometry.wheelVisualRadius}
                  fill="url(#tireGrad)"
                  stroke="#334155"
                  strokeWidth="3"
                />

                {/* Tire Tread Pattern Grooves */}
                {Array.from({ length: 24 }).map((_, i) => {
                  const deg = (i * 360) / 24;
                  const rad = (deg * Math.PI) / 180;
                  const x1 = Math.cos(rad) * (geometry.wheelVisualRadius - 10);
                  const y1 = Math.sin(rad) * (geometry.wheelVisualRadius - 10);
                  const x2 = Math.cos(rad) * geometry.wheelVisualRadius;
                  const y2 = Math.sin(rad) * geometry.wheelVisualRadius;
                  return (
                    <line
                      key={i}
                      x1={x1}
                      y1={y1}
                      x2={x2}
                      y2={y2}
                      stroke="#0f172a"
                      strokeWidth="2.5"
                      opacity="0.8"
                    />
                  );
                })}

                {/* Wheel Rim */}
                <circle
                  r={geometry.wheelVisualRadius * 0.65}
                  fill="url(#rimGrad)"
                  stroke="#475569"
                  strokeWidth="2"
                />

                {/* Wheel Spokes */}
                {Array.from({ length: 5 }).map((_, i) => {
                  const deg = (i * 360) / 5;
                  const rad = (deg * Math.PI) / 180;
                  const x2 = Math.cos(rad) * (geometry.wheelVisualRadius * 0.62);
                  const y2 = Math.sin(rad) * (geometry.wheelVisualRadius * 0.62);
                  return (
                    <line
                      key={i}
                      x1={0}
                      y1={0}
                      x2={x2}
                      y2={y2}
                      stroke="#334155"
                      strokeWidth="4"
                    />
                  );
                })}

                {/* Valve stem / rotation marker */}
                <circle
                  cx={geometry.wheelVisualRadius * 0.5}
                  cy="0"
                  r="4"
                  fill="#f59e0b"
                />
              </g>
            </g>
          )}

          {/* Background Layer 1B: CHASSIS (RUNKO) Side-Profile & Rear Axle Upright (Bottom surface 8.60 mm from Spur Axle Top Surface) */}
          {(viewMode === 'combined' || viewMode === 'gears' || viewMode === 'wheel' || viewMode === 'axle') &&
            (() => {
              const plateThicknessPx = 1.4 * geometry.pxPerMm;
              const plateTopY = geometry.chassisBottomY - plateThicknessPx;
              const chassisLeftX = Math.max(45, geometry.pinionX - geometry.motorVisualRadius - 26);
              const spurSlotLeftX = geometry.gearX - geometry.gearTipRadius - 5;
              const spurSlotRightX = geometry.gearX + geometry.gearTipRadius + 5;
              const chassisRightX = spurSlotRightX + 26;
              const uprightHalfWidth = Math.max(geometry.axleVisualRadius + 14, 34);
              const uprightTopY = geometry.gearY - geometry.axleVisualRadius - 18;

              return (
                <g className="chassis-runko-layer">
                  {/* Rear Axle Upright / Bearing Holder (Akselipukki) rising from chassis baseplate around the spur axle */}
                  <path
                    d={`M ${geometry.gearX - uprightHalfWidth} ${geometry.chassisBottomY}
                        L ${geometry.gearX - uprightHalfWidth * 0.72} ${uprightTopY + 12}
                        Q ${geometry.gearX} ${uprightTopY - 6} ${geometry.gearX + uprightHalfWidth * 0.72} ${uprightTopY + 12}
                        L ${geometry.gearX + uprightHalfWidth} ${geometry.chassisBottomY}
                        Z`}
                    fill="#334155"
                    fillOpacity="0.42"
                    stroke="#94a3b8"
                    strokeWidth="1.4"
                    strokeDasharray="4 2"
                  />

                  {/* Left Chassis Baseplate Segment (under motor & ahead of spur gear slot) */}
                  <rect
                    x={chassisLeftX}
                    y={plateTopY}
                    width={Math.max(20, spurSlotLeftX - chassisLeftX)}
                    height={plateThicknessPx}
                    rx="3"
                    fill="#334155"
                    fillOpacity="0.65"
                    stroke="#94a3b8"
                    strokeWidth="1.4"
                  />

                  {/* Right Chassis Baseplate Segment (behind spur gear slot) */}
                  <rect
                    x={spurSlotRightX}
                    y={plateTopY}
                    width={chassisRightX - spurSlotRightX}
                    height={plateThicknessPx}
                    rx="3"
                    fill="#334155"
                    fillOpacity="0.65"
                    stroke="#94a3b8"
                    strokeWidth="1.4"
                  />

                  {/* Highlighted Chassis Bottom Surface Line (Rungon alapinta, 8.60 mm from Spur Axle Top Surface) */}
                  <line
                    x1={chassisLeftX}
                    y1={geometry.chassisBottomY}
                    x2={geometry.gearX + geometry.gearTipRadius + 32}
                    y2={geometry.chassisBottomY}
                    stroke="#f59e0b"
                    strokeWidth="2.2"
                    strokeDasharray="6 3"
                  />

                  {/* Chassis Label Badge on the chassis plate */}
                  {viewMode !== 'axle' && (
                    <g transform={`translate(${(chassisLeftX + spurSlotLeftX) / 2}, ${plateTopY + plateThicknessPx / 2})`}>
                      <rect
                        x="-92"
                        y="-9"
                        width="184"
                        height="18"
                        rx="4"
                        fill="#0f172a"
                        fillOpacity="0.92"
                        stroke="#f59e0b"
                        strokeWidth="1"
                      />
                      <text
                        x="0"
                        y="3.5"
                        textAnchor="middle"
                        fill="#fde68a"
                        fontSize="8.5"
                        fontWeight="bold"
                        fontFamily="monospace"
                      >
                        {t.visChassisLabel.replace('{dist}', geometry.axleTopToChassisBottomMm.toFixed(2))}
                      </text>
                    </g>
                  )}
                </g>
              );
            })()}

          {/* Background Layer 2: CO-AXIAL MOTOR HOUSING / CAN (Ø 13.5 – 14.5 mm, behind Pinion) */}
          {(viewMode === 'combined' || viewMode === 'gears') && (
            <g transform={`translate(${geometry.pinionX}, ${geometry.pinionY})`}>
              {/* Motor Outer Can Body */}
              <circle
                r={geometry.motorVisualRadius}
                fill="#0f172a"
                fillOpacity="0.72"
                stroke="#8b5cf6"
                strokeWidth="2"
                strokeDasharray="6 3"
              />
              {/* Inner endbell ring */}
              <circle
                r={geometry.motorVisualRadius * 0.88}
                fill="none"
                stroke="#475569"
                strokeWidth="1"
                opacity="0.6"
              />
              {/* Motor cooling vents (2 curved slots on endbell) */}
              <path
                d={`M ${-geometry.motorVisualRadius * 0.55} ${-geometry.motorVisualRadius * 0.35} A ${geometry.motorVisualRadius * 0.65} ${geometry.motorVisualRadius * 0.65} 0 0 1 ${-geometry.motorVisualRadius * 0.55} ${geometry.motorVisualRadius * 0.35}`}
                fill="none"
                stroke="#1e293b"
                strokeWidth="8"
                strokeLinecap="round"
                opacity="0.85"
              />
              {/* Motor shaft bearing housing boss (behind pinion) */}
              <circle
                r={geometry.motorVisualRadius * 0.25}
                fill="#1e293b"
                stroke="#475569"
                strokeWidth="1"
                opacity="0.65"
              />

              {/* Motor Diameter, Offset below Spur Axle & Ground Clearance Dimension Callout */}
              {(() => {
                const isLowMotorClearance = geometry.motorGroundClearanceMm <= 0.2;
                const mColor = isLowMotorClearance ? '#f43f5e' : '#a78bfa';
                const mBg = isLowMotorClearance ? '#4c0519' : '#0f172a';
                const mText = isLowMotorClearance ? '#fda4af' : '#ddd6fe';
                const mSign = geometry.motorGroundClearanceMm >= 0 ? '+' : '';
                const calX = -geometry.motorVisualRadius - 18;
                // In motor local coords (origin at pinionY), the road surface is at geometry.roadY - geometry.pinionY
                const roadLocalY = geometry.roadY - geometry.pinionY;
                const clearMidY = (geometry.motorVisualRadius + roadLocalY) / 2;

                return (
                  <g className="motor-dimension-overlay">
                    {/* Motor top label badge */}
                    <g transform={`translate(0, ${-geometry.motorVisualRadius - 16})`}>
                      <rect
                        x="-68"
                        y="-14"
                        width="136"
                        height="22"
                        rx="5"
                        fill="#0f172a"
                        stroke="#8b5cf6"
                        strokeWidth="1.2"
                        opacity="0.95"
                      />
                      <text
                        x="0"
                        y="1"
                        textAnchor="middle"
                        fill="#c4b5fd"
                        fontSize="10"
                        fontWeight="bold"
                        fontFamily="monospace"
                      >
                        {t.visMotorCanLabel.replace('{dia}', motorDiameterMm.toFixed(1))}
                      </text>
                    </g>

                    {/* Motor vertical Offset visual callout when motor is placed below spur axle (clampedOffsetMm > 0) */}
                    {geometry.clampedOffsetMm > 0.001 && (
                      <g className="motor-offset-overlay">
                        {/* Reference horizontal centerline of Spur Axle (at y = -geometry.offsetPx in motor local coords) */}
                        <line
                          x1={calX - 6}
                          y1={-geometry.offsetPx}
                          x2={geometry.gearX - geometry.pinionX}
                          y2={-geometry.offsetPx}
                          stroke="#e879f9"
                          strokeWidth="1.2"
                          strokeDasharray="4 3"
                          opacity="0.8"
                        />
                        {/* Horizontal centerline of Motor Shaft (at y = 0 in motor local coords) */}
                        <line
                          x1={calX - 6}
                          y1={0}
                          x2={geometry.r1 + 8}
                          y2={0}
                          stroke="#e879f9"
                          strokeWidth="1.2"
                          strokeDasharray="4 3"
                          opacity="0.85"
                        />
                        <circle cx="0" cy="0" r="2.8" fill="#e879f9" />
                        {/* Vertical caliper on left showing Motor Offset below Spur Axle */}
                        <line
                          x1={calX}
                          y1={-geometry.offsetPx}
                          x2={calX}
                          y2={0}
                          stroke="#e879f9"
                          strokeWidth="1.8"
                        />
                        <line
                          x1={calX - 5}
                          y1={-geometry.offsetPx}
                          x2={calX + 5}
                          y2={-geometry.offsetPx}
                          stroke="#e879f9"
                          strokeWidth="1.8"
                        />
                        <line
                          x1={calX - 5}
                          y1={0}
                          x2={calX + 5}
                          y2={0}
                          stroke="#e879f9"
                          strokeWidth="1.8"
                        />
                        {/* Motor Offset Badge */}
                        <g transform={`translate(${calX - 156}, ${-geometry.offsetPx / 2})`}>
                          <rect
                            x="0"
                            y="-11"
                            width="148"
                            height="22"
                            rx="5"
                            fill="#0f172a"
                            stroke="#e879f9"
                            strokeWidth="1.3"
                            opacity="0.95"
                          />
                          <text
                            x="74"
                            y="3.5"
                            textAnchor="middle"
                            fill="#f5d0fe"
                            fontSize="9"
                            fontWeight="bold"
                            fontFamily="monospace"
                          >
                            Offset: -{geometry.clampedOffsetMm.toFixed(2)} mm
                          </text>
                        </g>
                      </g>
                    )}

                    {/* Horizontal extension line from Motor Bottom (y = +motorVisualRadius) */}
                    <line
                      x1="0"
                      y1={geometry.motorVisualRadius}
                      x2={calX - 8}
                      y2={geometry.motorVisualRadius}
                      stroke={mColor}
                      strokeWidth="1.2"
                      strokeDasharray="3 2"
                    />
                    <circle cx="0" cy={geometry.motorVisualRadius} r="2.8" fill={mColor} />

                    {/* Horizontal extension line from Road Surface / Tire Bottom (y = roadLocalY) */}
                    <line
                      x1="0"
                      y1={roadLocalY}
                      x2={calX - 8}
                      y2={roadLocalY}
                      stroke={mColor}
                      strokeWidth="1.2"
                      strokeDasharray="3 2"
                    />
                    <circle cx="0" cy={roadLocalY} r="2.8" fill={mColor} />

                    {/* Vertical caliper line for Motor Ground Clearance */}
                    <line
                      x1={calX}
                      y1={geometry.motorVisualRadius}
                      x2={calX}
                      y2={roadLocalY}
                      stroke={mColor}
                      strokeWidth="1.8"
                    />
                    <line
                      x1={calX - 5}
                      y1={geometry.motorVisualRadius}
                      x2={calX + 5}
                      y2={geometry.motorVisualRadius}
                      stroke={mColor}
                      strokeWidth="1.8"
                    />
                    <line
                      x1={calX - 5}
                      y1={roadLocalY}
                      x2={calX + 5}
                      y2={roadLocalY}
                      stroke={mColor}
                      strokeWidth="1.8"
                    />

                    {/* Motor Ground Clearance Badge */}
                    <g transform={`translate(${calX - 156}, ${clearMidY})`}>
                      <rect
                        x="0"
                        y="-18"
                        width="148"
                        height="36"
                        rx="6"
                        fill={mBg}
                        stroke={mColor}
                        strokeWidth="1.4"
                        opacity="0.95"
                      />
                      <text
                        x="8"
                        y="-3"
                        fill={mText}
                        fontSize="9.5"
                        fontWeight="bold"
                        fontFamily="monospace"
                      >
                        {t.visMotorClearanceCallout.replace(
                          '{clearance}',
                          `${mSign}${geometry.motorGroundClearanceMm.toFixed(2)}`
                        )}
                      </text>
                      <text
                        x="8"
                        y="11"
                        fill="#94a3b8"
                        fontSize="8.5"
                        fontFamily="sans-serif"
                      >
                        {lockAxleHeight86
                          ? t.visMotorClearanceLockedSub
                              .replace('{val}', lockedChassisMm.toFixed(1))
                              .replace('{motor}', motorDiameterMm.toFixed(1))
                          : geometry.clampedOffsetMm > 0.001
                          ? t.visMotorClearanceSubOffset
                              .replace('{tire}', tireDiameterMm.toFixed(1))
                              .replace('{motor}', motorDiameterMm.toFixed(1))
                              .replace('{offset}', geometry.clampedOffsetMm.toFixed(1))
                          : t.visMotorClearanceSub
                              .replace('{tire}', tireDiameterMm.toFixed(1))
                              .replace('{motor}', motorDiameterMm.toFixed(1))}
                      </text>
                    </g>
                  </g>
                );
              })()}
            </g>
          )}

          {/* Foreground Layer 1: Gear 2 - SPUR GEAR (mounted on the axle in front of the tire) */}
          <g transform={`translate(${geometry.gearX}, ${geometry.gearY})`}>
            {(viewMode === 'combined' || viewMode === 'gears' || viewMode === 'mesh' || viewMode === 'axle') && (
              <>
                {/* Spur Gear Outer Diameter (Addendum) circle */}
                <circle
                  r={geometry.gearTipRadius}
                  fill="none"
                  stroke={geometry.isUnder86Mm ? '#f43f5e' : '#38bdf8'}
                  strokeWidth={viewMode === 'mesh' ? 0.6 : 1}
                  strokeDasharray="3 3"
                  opacity={viewMode === 'axle' ? 0.85 : 0.45}
                />

                {/* Pitch circle */}
                <circle
                  r={geometry.r2}
                  fill="none"
                  stroke="#60a5fa"
                  strokeWidth={viewMode === 'mesh' ? 0.8 : 1}
                  strokeDasharray="4 3"
                  opacity="0.45"
                />

                <g transform={`rotate(${gearAngle})`}>
                  <path
                    d={geometry.gearPath}
                    fill="url(#gearGrad)"
                    stroke="#475569"
                    strokeWidth={viewMode === 'mesh' ? 0.8 : 1.5}
                    className="filter drop-shadow-md"
                    opacity={viewMode === 'combined' ? 0.94 : 1}
                  />

                  {/* Gear mounting holes / spokes */}
                  {Array.from({ length: 6 }).map((_, i) => {
                    const angle = (i * 2 * Math.PI) / 6;
                    const hx = Math.cos(angle) * (geometry.r2 * 0.55);
                    const hy = Math.sin(angle) * (geometry.r2 * 0.55);
                    return (
                      <circle
                        key={i}
                        cx={hx}
                        cy={hy}
                        r={Math.max(4, geometry.r2 * 0.12)}
                        fill="#0f172a"
                        stroke="#64748b"
                        strokeWidth={viewMode === 'mesh' ? 0.6 : 1}
                      />
                    );
                  })}

                  <circle cx={geometry.r2 * 0.72} cy="0" r="3.5" fill="#38bdf8" />
                </g>

                {/* True-Scale Spur Axle Shaft (3/32" = 2.381mm vs 2mm = 2.000mm) */}
                {axleSize === '2mm' && (
                  /* Reference dashed outline of 3/32" axle so the thickness change is clearly visible */
                  <circle
                    r={geometry.ref332VisualRadius}
                    fill="none"
                    stroke="#f59e0b"
                    strokeWidth="1"
                    strokeDasharray="2 2"
                    opacity="0.75"
                  />
                )}
                {(() => {
                  const spurAxleStroke = viewMode === 'mesh' ? 0.8 : 1.4;
                  return (
                    <>
                      <circle
                        r={Math.max(1, geometry.axleVisualRadius - spurAxleStroke / 2)}
                        fill="#0f172a"
                        stroke={geometry.isUnder86Mm ? '#f43f5e' : '#38bdf8'}
                        strokeWidth={spurAxleStroke}
                      />
                      {/* Axle center crosshair */}
                      <line x1="-5" y1="0" x2="5" y2="0" stroke="#64748b" strokeWidth="0.7" opacity="0.75" />
                      <line x1="0" y1="-5" x2="0" y2="5" stroke="#64748b" strokeWidth="0.7" opacity="0.75" />
                    </>
                  );
                })()}

                {/* Dimension Callout: Spur Outer Diameter (OD) & Axle Top Surface to Spur Outer Diameter */}
                {viewMode !== 'mesh' && (
                  <g className="axle-dimension-overlay">
                    {/* Vertical diametral reference line across Spur Gear (from -gearTipRadius to +gearTipRadius) */}
                    <line
                      x1="0"
                      y1={-geometry.gearTipRadius}
                      x2="0"
                      y2={geometry.gearTipRadius}
                      stroke="#38bdf8"
                      strokeWidth="1"
                      strokeDasharray="3 3"
                      opacity="0.45"
                    />

                    {/* Horizontal extension line from Top Outer Edge of Spur Gear (y = -gearTipRadius) */}
                    <line
                      x1="0"
                      y1={-geometry.gearTipRadius}
                      x2={geometry.gearTipRadius + 34}
                      y2={-geometry.gearTipRadius}
                      stroke="#38bdf8"
                      strokeWidth="1.2"
                      strokeDasharray="3 2"
                    />
                    <circle cx="0" cy={-geometry.gearTipRadius} r="2.8" fill="#38bdf8" />

                    {/* Full Spur Outer Diameter (OD = 2 * gearTipRadius) Vertical Caliper on the right */}
                    <line
                      x1={geometry.gearTipRadius + 30}
                      y1={-geometry.gearTipRadius}
                      x2={geometry.gearTipRadius + 30}
                      y2={geometry.gearTipRadius}
                      stroke="#38bdf8"
                      strokeWidth="1.6"
                      opacity="0.9"
                    />
                    <line
                      x1={geometry.gearTipRadius + 26}
                      y1={-geometry.gearTipRadius}
                      x2={geometry.gearTipRadius + 34}
                      y2={-geometry.gearTipRadius}
                      stroke="#38bdf8"
                      strokeWidth="1.8"
                    />
                    <line
                      x1={geometry.gearTipRadius + 26}
                      y1={geometry.gearTipRadius}
                      x2={geometry.gearTipRadius + 34}
                      y2={geometry.gearTipRadius}
                      stroke="#38bdf8"
                      strokeWidth="1.8"
                    />

                    {/* Spur Gear Outer Diameter (OD) Dimension Badge (Upper Right) */}
                    {(() => {
                      const spurOdBadgeY = -Math.max(84, geometry.gearTipRadius * 0.62);
                      return (
                        <g>
                          <line
                            x1={geometry.gearTipRadius + 30}
                            y1={spurOdBadgeY}
                            x2={geometry.gearTipRadius + 34}
                            y2={spurOdBadgeY}
                            stroke="#38bdf8"
                            strokeWidth="1.4"
                          />
                          <g transform={`translate(${geometry.gearTipRadius + 34}, ${spurOdBadgeY})`}>
                            <rect
                              x="0"
                              y="-18"
                              width="162"
                              height="36"
                              rx="6"
                              fill="#0f172a"
                              stroke="#38bdf8"
                              strokeWidth="1.4"
                              opacity="0.96"
                            />
                            <text
                              x="8"
                              y="-3"
                              fill="#38bdf8"
                              fontSize="10"
                              fontWeight="bold"
                              fontFamily="monospace"
                            >
                              {t.visSpurOdCallout.replace('{od}', geometry.spurOuterDiaMm.toFixed(2))}
                            </text>
                            <text
                              x="8"
                              y="11"
                              fill="#94a3b8"
                              fontSize="8.5"
                              fontFamily="sans-serif"
                            >
                              {t.visSpurOdSub
                                .replace('{pitchDia}', geometry.spurPitchDiaMm.toFixed(2))
                                .replace('{radius}', geometry.spurOuterRadiusMm.toFixed(2))}
                            </text>
                          </g>
                        </g>
                      );
                    })()}

                    {/* Horizontal extension line from Axle Top Surface (y = -axleVisualRadius) */}
                    <line
                      x1="0"
                      y1={-geometry.axleVisualRadius}
                      x2={geometry.gearTipRadius + 28}
                      y2={-geometry.axleVisualRadius}
                      stroke={geometry.isUnder86Mm ? '#fb7185' : '#34d399'}
                      strokeWidth="1.2"
                      strokeDasharray="3 2"
                    />
                    {/* Highlight dot at Axle Top Surface */}
                    <circle
                      cx="0"
                      cy={-geometry.axleVisualRadius}
                      r="2.8"
                      fill={geometry.isUnder86Mm ? '#f43f5e' : '#10b981'}
                    />

                    {/* Horizontal extension line from Bottom Outer Edge of Spur Gear (y = +gearTipRadius) */}
                    <line
                      x1="0"
                      y1={geometry.gearTipRadius}
                      x2={geometry.gearTipRadius + 34}
                      y2={geometry.gearTipRadius}
                      stroke={geometry.isUnder86Mm ? '#fb7185' : '#34d399'}
                      strokeWidth="1.2"
                      strokeDasharray="3 2"
                    />
                    <circle
                      cx="0"
                      cy={geometry.gearTipRadius}
                      r="2.8"
                      fill={geometry.isUnder86Mm ? '#f43f5e' : '#10b981'}
                    />

                    {/* Vertical caliper dimension line on the right side (Axle top surface -> Bottom Spur OD) */}
                    <line
                      x1={geometry.gearTipRadius + 24}
                      y1={-geometry.axleVisualRadius}
                      x2={geometry.gearTipRadius + 24}
                      y2={geometry.gearTipRadius}
                      stroke={geometry.isUnder86Mm ? '#f43f5e' : '#10b981'}
                      strokeWidth="1.8"
                    />
                    {/* End ticks */}
                    <line
                      x1={geometry.gearTipRadius + 19}
                      y1={-geometry.axleVisualRadius}
                      x2={geometry.gearTipRadius + 29}
                      y2={-geometry.axleVisualRadius}
                      stroke={geometry.isUnder86Mm ? '#f43f5e' : '#10b981'}
                      strokeWidth="1.8"
                    />
                    <line
                      x1={geometry.gearTipRadius + 19}
                      y1={geometry.gearTipRadius}
                      x2={geometry.gearTipRadius + 29}
                      y2={geometry.gearTipRadius}
                      stroke={geometry.isUnder86Mm ? '#f43f5e' : '#10b981'}
                      strokeWidth="1.8"
                    />

                    {/* Dimension Badge (Akselin yläpinta -> Rattaan ulkohalkaisija) */}
                    <g
                      transform={`translate(${geometry.gearTipRadius + 34}, ${
                        (geometry.gearTipRadius - geometry.axleVisualRadius) / 2
                      })`}
                    >
                      <rect
                        x="0"
                        y="-18"
                        width="148"
                        height="36"
                        rx="6"
                        fill={geometry.isUnder86Mm ? '#4c0519' : '#0f172a'}
                        stroke={geometry.isUnder86Mm ? '#f43f5e' : '#10b981'}
                        strokeWidth="1.4"
                        opacity="0.95"
                      />
                      <text
                        x="8"
                        y="-3"
                        fill={geometry.isUnder86Mm ? '#fda4af' : '#6ee7b7'}
                        fontSize="10"
                        fontWeight="bold"
                        fontFamily="monospace"
                      >
                        {geometry.axleTopToSpurOuterMm.toFixed(2)} mm ({lang === 'fi' ? 'Runkoon' : 'Chassis'}: {geometry.spurToChassisBottomMm >= 0 ? '+' : ''}{geometry.spurToChassisBottomMm.toFixed(2)})
                      </text>
                      <text
                        x="8"
                        y="11"
                        fill="#94a3b8"
                        fontSize="8.5"
                        fontFamily="sans-serif"
                      >
                        {axleSize === '3/32' ? '3/32" (2.38mm)' : '2mm'} · R−r: {geometry.axleRadialWallMm.toFixed(2)}mm
                      </text>
                    </g>

                    {/* Dimension Callout 2: Chassis 8.60 mm Lock (Axle Top Surface -> Chassis Bottom Surface) & Ground Clearance (Spur -> Road) */}
                    {(() => {
                      const isLowClearance = geometry.spurGroundClearanceMm <= 0.2;
                      const clearanceColor = isLowClearance ? '#f43f5e' : '#38bdf8';
                      const clearanceDashColor = isLowClearance ? '#fb7185' : '#7dd3fc';
                      const clearanceTextColor = isLowClearance ? '#fda4af' : '#7dd3fc';
                      const clearanceBgColor = isLowClearance ? '#4c0519' : '#0f172a';
                      const clearanceSign = geometry.spurGroundClearanceMm >= 0 ? '+' : '';
                      const chassisClearanceSign = geometry.chassisGroundClearanceMm >= 0 ? '+' : '';
                      const groundLocalY = geometry.groundDistancePx;
                      const chassisLocalY = geometry.chassisBottomPx;
                      const midY = Math.max(
                        geometry.gearTipRadius + 24,
                        (geometry.gearTipRadius + groundLocalY) / 2
                      );
                      const lockStartY = -geometry.axleVisualRadius;

                      return (
                        <g className="ground-clearance-dimension-overlay">
                          {/* Subtle tire bottom / road reference line in 'gears' or 'axle' mode where full tire isn't shown */}
                          {(viewMode === 'gears' || viewMode === 'axle') && (
                            <line
                              x1="-65"
                              y1={groundLocalY}
                              x2={geometry.gearTipRadius + 32}
                              y2={groundLocalY}
                              stroke="#38bdf8"
                              strokeWidth="1.5"
                              strokeDasharray="6 4"
                              opacity="0.8"
                            />
                          )}

                          {/* Chassis Bottom Caliper (from Spur Axle Top Surface or Centerline to Chassis Bottom Surface y = +chassisLocalY) */}
                          <g className="locked-axle-86-overlay">
                            {/* Horizontal extension line from Spur Axle Reference Point */}
                            <line
                              x1="0"
                              y1={lockStartY}
                              x2={geometry.gearTipRadius + 16}
                              y2={lockStartY}
                              stroke="#f59e0b"
                              strokeWidth="1.2"
                              strokeDasharray="3 2"
                              opacity="0.9"
                            />
                            <circle cx="0" cy={lockStartY} r="2.8" fill="#f59e0b" />

                            {/* Highlight dot on Chassis Bottom Surface */}
                            <circle cx="0" cy={chassisLocalY} r="2.8" fill="#f59e0b" />

                            {/* Vertical caliper line (Spur Axle Reference -> Chassis Bottom Surface) */}
                            <line
                              x1={geometry.gearTipRadius + 12}
                              y1={lockStartY}
                              x2={geometry.gearTipRadius + 12}
                              y2={chassisLocalY}
                              stroke="#f59e0b"
                              strokeWidth="1.8"
                              strokeDasharray={lockAxleHeight86 ? 'none' : '4 2'}
                            />
                            <line
                              x1={geometry.gearTipRadius + 8}
                              y1={lockStartY}
                              x2={geometry.gearTipRadius + 16}
                              y2={lockStartY}
                              stroke="#f59e0b"
                              strokeWidth="1.8"
                            />
                            <line
                              x1={geometry.gearTipRadius + 8}
                              y1={chassisLocalY}
                              x2={geometry.gearTipRadius + 16}
                              y2={chassisLocalY}
                              stroke="#f59e0b"
                              strokeWidth="1.8"
                            />
                            <g transform={`translate(${geometry.gearTipRadius + 34}, ${-geometry.axleVisualRadius - 24})`}>
                              <rect
                                x="0"
                                y="-11"
                                width="176"
                                height="22"
                                rx="5"
                                fill="#451a03"
                                stroke="#f59e0b"
                                strokeWidth="1.3"
                                opacity="0.95"
                              />
                              <text
                                x="88"
                                y="3.5"
                                textAnchor="middle"
                                fill="#fde68a"
                                fontSize="9"
                                fontWeight="bold"
                                fontFamily="monospace"
                              >
                                {lockAxleHeight86
                                  ? t.visAxleLocked86Callout.replace('{val}', lockedChassisMm.toFixed(2))
                                  : t.visChassisUnlockedCallout.replace('{dist}', geometry.axleTopToChassisBottomMm.toFixed(2))}
                              </text>
                            </g>
                          </g>

                          {/* Horizontal extension line from Tire Bottom / Road Surface (y = +groundLocalY) */}
                          <line
                            x1="0"
                            y1={groundLocalY}
                            x2={geometry.gearTipRadius + 32}
                            y2={groundLocalY}
                            stroke={clearanceDashColor}
                            strokeWidth="1.2"
                            strokeDasharray="3 2"
                          />
                          {/* Highlight dot at Tire Bottom / Road Contact */}
                          <circle
                            cx="0"
                            cy={groundLocalY}
                            r="2.8"
                            fill={clearanceColor}
                          />

                          {/* Vertical caliper dimension line between Spur Bottom OD and Tire Bottom / Road */}
                          <line
                            x1={geometry.gearTipRadius + 24}
                            y1={geometry.gearTipRadius}
                            x2={geometry.gearTipRadius + 24}
                            y2={groundLocalY}
                            stroke={clearanceColor}
                            strokeWidth="1.8"
                          />
                          {/* End ticks */}
                          <line
                            x1={geometry.gearTipRadius + 19}
                            y1={geometry.gearTipRadius}
                            x2={geometry.gearTipRadius + 29}
                            y2={geometry.gearTipRadius}
                            stroke={clearanceColor}
                            strokeWidth="1.8"
                          />
                          <line
                            x1={geometry.gearTipRadius + 19}
                            y1={groundLocalY}
                            x2={geometry.gearTipRadius + 29}
                            y2={groundLocalY}
                            stroke={clearanceColor}
                            strokeWidth="1.8"
                          />

                          {/* Connector leader from midpoint of clearance caliper to the badge */}
                          <line
                            x1={geometry.gearTipRadius + 24}
                            y1={(geometry.gearTipRadius + groundLocalY) / 2}
                            x2={geometry.gearTipRadius + 34}
                            y2={midY}
                            stroke={clearanceColor}
                            strokeWidth="1.2"
                          />

                          {/* Ground Clearance Dimension Badge (Maavara) */}
                          <g transform={`translate(${geometry.gearTipRadius + 34}, ${midY})`}>
                            <rect
                              x="0"
                              y="-18"
                              width="162"
                              height="36"
                              rx="6"
                              fill={clearanceBgColor}
                              stroke={clearanceColor}
                              strokeWidth="1.4"
                              opacity="0.95"
                            />
                            <text
                              x="8"
                              y="-3"
                              fill={clearanceTextColor}
                              fontSize="10"
                              fontWeight="bold"
                              fontFamily="monospace"
                            >
                              {t.visGroundClearanceCallout.replace(
                                '{clearance}',
                                `${clearanceSign}${geometry.spurGroundClearanceMm.toFixed(2)}`
                              )}
                            </text>
                            <text
                              x="8"
                              y="11"
                              fill="#94a3b8"
                              fontSize="8.5"
                              fontFamily="sans-serif"
                            >
                              {t.visGroundClearanceLockedSub
                                .replace('{chassisClearance}', `${chassisClearanceSign}${geometry.chassisGroundClearanceMm.toFixed(2)}`)
                                .replace('{tire}', tireDiameterMm.toFixed(1))}
                            </text>
                          </g>
                        </g>
                      );
                    })()}

                    {/* Extra close-up labels in 'axle' view mode */}
                    {viewMode === 'axle' && (
                      <g>
                        <text
                          x="8"
                          y={-geometry.axleVisualRadius - 5}
                          fill="#f8fafc"
                          fontSize="9"
                          fontWeight="bold"
                          fontFamily="sans-serif"
                        >
                          {t.visAxleTopSurfaceCallout} (r = {geometry.axleRadiusMm.toFixed(2)} mm)
                        </text>
                        <text
                          x="8"
                          y={geometry.chassisBottomPx - 5}
                          fill="#fbbf24"
                          fontSize="9"
                          fontWeight="bold"
                          fontFamily="sans-serif"
                        >
                          {t.visChassisBottomEdgeCallout.replace('{dist}', geometry.axleTopToChassisBottomMm.toFixed(2))}
                        </text>
                        <text
                          x="8"
                          y={geometry.gearTipRadius + 11}
                          fill="#38bdf8"
                          fontSize="9"
                          fontWeight="bold"
                          fontFamily="sans-serif"
                        >
                          {t.visSpurOuterEdgeCallout.replace('{od}', geometry.spurOuterDiaMm.toFixed(2))}
                        </text>
                        <text
                          x="8"
                          y={geometry.groundDistancePx + 13}
                          fill="#38bdf8"
                          fontSize="9"
                          fontWeight="bold"
                          fontFamily="sans-serif"
                        >
                          {t.visRoadSurfaceCallout} (Ø {tireDiameterMm.toFixed(1)} mm)
                        </text>
                      </g>
                    )}
                  </g>
                )}
              </>
            )}

            {/* Gear & Tire Label (hidden in close-up mesh/axle mode) */}
            {viewMode !== 'mesh' && viewMode !== 'axle' && (
              <>
                <g transform={`translate(0, ${-Math.max(geometry.r2, geometry.wheelVisualRadius) - 24})`}>
                  <rect
                    x="-115"
                    y="-18"
                    width="230"
                    height="26"
                    rx="6"
                    fill="#0f172a"
                    stroke="#38bdf8"
                    strokeWidth="1"
                    opacity="0.9"
                  />
                  <text
                    x="0"
                    y="-1"
                    textAnchor="middle"
                    fill="#38bdf8"
                    fontSize="11"
                    fontWeight="bold"
                    fontFamily="sans-serif"
                  >
                    {t.visGearLabel.replace('{gear}', gearTeeth.toString())} · {pitch}P (Ø {geometry.spurOuterDiaMm.toFixed(2)}mm)
                  </text>
                </g>

                <text
                  x="0"
                  y={Math.max(geometry.r2, geometry.wheelVisualRadius) + 26}
                  textAnchor="middle"
                  fill="#94a3b8"
                  fontSize="11"
                >
                  {t.visWheelRevs.replace('{revs}', (totalWheelRevs % 1000).toFixed(2)).replace('{dia}', tireDiameterMm.toString())}
                </text>
              </>
            )}
          </g>

          {/* Foreground Layer 2B: Dashed Motor Outer Diameter Contour ON TOP of Spur Gear & Motor ↔ Axle Gap Measurement */}
          {(viewMode === 'combined' || viewMode === 'gears' || viewMode === 'axle' || viewMode === 'mesh') &&
            (() => {
              const isGapTight = geometry.motorToAxleGapMm <= 0.1;
              const gapColor = isGapTight ? '#f43f5e' : '#a78bfa';
              const gapBg = isGapTight ? '#4c0519' : '#0f172a';
              const gapText = isGapTight ? '#fda4af' : '#ddd6fe';
              const gapSign = geometry.motorToAxleGapMm >= 0 ? '+' : '';

              const cosA = Math.cos(geometry.offsetAngleRad);
              const sinA = Math.sin(geometry.offsetAngleRad);

              // Closest point on the Motor's outer diameter toward the Spur Axle
              const motorEdgeX = geometry.pinionX + geometry.motorVisualRadius * cosA;
              const motorEdgeY = geometry.pinionY - geometry.motorVisualRadius * sinA;

              // Closest point on the Spur Axle's outer surface toward the Motor
              const axleEdgeX = geometry.gearX - geometry.axleVisualRadius * cosA;
              const axleEdgeY = geometry.gearY + geometry.axleVisualRadius * sinA;

              const midGapX = (motorEdgeX + axleEdgeX) / 2;
              const calY = Math.min(motorEdgeY, axleEdgeY) - (viewMode === 'axle' ? 36 : 44);

              return (
                <g className="motor-on-spur-foreground-overlay pointer-events-none">
                  {/* Dashed Motor Outer Diameter (Ø 13.5 - 14.5 mm) rendered ON TOP of the Spur gear */}
                  <circle
                    cx={geometry.pinionX}
                    cy={geometry.pinionY}
                    r={geometry.motorVisualRadius}
                    fill="none"
                    stroke={gapColor}
                    strokeWidth={viewMode === 'mesh' ? 1.2 : 2.2}
                    strokeDasharray={viewMode === 'mesh' ? '4 2.5' : '6 4'}
                    opacity="0.95"
                  />

                  {/* Motor ↔ Axle Gap Caliper & Dimension Badge (visible in combined, gears, and axle close-up modes) */}
                  {viewMode !== 'mesh' && (
                    <g className="motor-to-axle-gap-caliper">
                      {/* Subtle line of centers connecting Motor shaft center and Spur axle center */}
                      <line
                        x1={geometry.pinionX}
                        y1={geometry.pinionY}
                        x2={geometry.gearX}
                        y2={geometry.gearY}
                        stroke="#a78bfa"
                        strokeWidth="1"
                        strokeDasharray="3 3"
                        opacity="0.45"
                      />

                      {/* Direct gap line between Motor outer edge and Spur Axle outer edge */}
                      <line
                        x1={motorEdgeX}
                        y1={motorEdgeY}
                        x2={axleEdgeX}
                        y2={axleEdgeY}
                        stroke={gapColor}
                        strokeWidth="2.2"
                      />

                      {/* Highlight dots on Motor right edge and Spur Axle left edge */}
                      <circle cx={motorEdgeX} cy={motorEdgeY} r="3" fill={gapColor} />
                      <circle cx={axleEdgeX} cy={axleEdgeY} r="3" fill={gapColor} />

                      {/* Vertical extension lines up to the caliper bar */}
                      <line
                        x1={motorEdgeX}
                        y1={motorEdgeY}
                        x2={motorEdgeX}
                        y2={calY - 5}
                        stroke={gapColor}
                        strokeWidth="1.2"
                        strokeDasharray="3 2"
                      />
                      <line
                        x1={axleEdgeX}
                        y1={axleEdgeY}
                        x2={axleEdgeX}
                        y2={calY - 5}
                        stroke={gapColor}
                        strokeWidth="1.2"
                        strokeDasharray="3 2"
                      />

                      {/* Horizontal caliper bar & end ticks */}
                      <line
                        x1={motorEdgeX}
                        y1={calY}
                        x2={axleEdgeX}
                        y2={calY}
                        stroke={gapColor}
                        strokeWidth="1.8"
                      />
                      <line
                        x1={motorEdgeX}
                        y1={calY - 5}
                        x2={motorEdgeX}
                        y2={calY + 5}
                        stroke={gapColor}
                        strokeWidth="1.8"
                      />
                      <line
                        x1={axleEdgeX}
                        y1={calY - 5}
                        x2={axleEdgeX}
                        y2={calY + 5}
                        stroke={gapColor}
                        strokeWidth="1.8"
                      />

                      {/* Leader line from caliper midpoint up to the badge */}
                      <line
                        x1={midGapX}
                        y1={calY}
                        x2={midGapX}
                        y2={calY - 10}
                        stroke={gapColor}
                        strokeWidth="1.2"
                      />

                      {/* Motor ↔ Axle Gap Dimension Badge */}
                      <g transform={`translate(${midGapX - 78}, ${calY - 46})`}>
                        <rect
                          x="0"
                          y="0"
                          width="156"
                          height="36"
                          rx="6"
                          fill={gapBg}
                          stroke={gapColor}
                          strokeWidth="1.4"
                          opacity="0.96"
                        />
                        <text
                          x="78"
                          y="15"
                          textAnchor="middle"
                          fill={gapText}
                          fontSize="9.5"
                          fontWeight="bold"
                          fontFamily="monospace"
                        >
                          {t.visMotorToAxleGap.replace(
                            '{gap}',
                            `${gapSign}${geometry.motorToAxleGapMm.toFixed(2)}`
                          )}
                        </text>
                        <text
                          x="78"
                          y="28"
                          textAnchor="middle"
                          fill="#94a3b8"
                          fontSize="8"
                          fontFamily="sans-serif"
                        >
                          {t.visMotorToAxleGapSub
                            .replace('{center}', geometry.centerDistanceMm.toFixed(2))
                            .replace('{rm}', geometry.motorRadiusMm.toFixed(2))
                            .replace('{toCenter}', geometry.motorToAxleCenterMm.toFixed(2))
                            .replace('{ra}', geometry.axleRadiusMm.toFixed(2))}
                        </text>
                      </g>
                    </g>
                  )}
                </g>
              );
            })()}

          {/* Foreground Layer 2C: Gear 1 - PINION & Pinion Info Callouts (rendered ON TOP of Spur Gear so Pinion info is never hidden) */}
          {(viewMode === 'combined' || viewMode === 'gears' || viewMode === 'mesh') && (
            <g transform={`translate(${geometry.pinionX}, ${geometry.pinionY})`}>
              {/* Pinion Outer Diameter (Addendum / OD) circle */}
              <circle
                r={geometry.pinionTipRadius}
                fill="none"
                stroke="#fde047"
                strokeWidth={viewMode === 'mesh' ? 0.6 : 1}
                strokeDasharray="3 3"
                opacity="0.7"
              />

              {/* Pitch circle indicator */}
              <circle
                r={geometry.r1}
                fill="none"
                stroke="#eab308"
                strokeWidth={viewMode === 'mesh' ? 0.8 : 1}
                strokeDasharray="4 3"
                opacity="0.65"
              />

              {/* Animated rotating pinion gear */}
              <g transform={`rotate(${pinionRenderAngle})`}>
                <path
                  d={geometry.pinionPath}
                  fill="url(#pinionGrad)"
                  stroke="#ca8a04"
                  strokeWidth={viewMode === 'mesh' ? 0.8 : 1.5}
                  className="filter drop-shadow-md"
                />

                {/* Visual tooth position marker dot on tooth 0 */}
                <circle
                  cx={(geometry.pinionRootRadius + geometry.r1) / 2}
                  cy="0"
                  r={viewMode === 'mesh' ? 1.5 : 2.2}
                  fill="#fef08a"
                />
              </g>

              {/* True-Scale Motor Pinion Shaft: Ø 2.00 mm (r = 1.00 mm) for 64P, Ø 1.50 mm (r = 0.75 mm) for 72P & 80P */}
              {(() => {
                const shaftStroke = viewMode === 'mesh' ? 0.8 : 1.4;
                return (
                  <>
                    <circle
                      r={Math.max(1, geometry.effectivePinionBoreVisualRadius - shaftStroke / 2)}
                      fill="#0f172a"
                      stroke="#eab308"
                      strokeWidth={shaftStroke}
                    />
                    {/* Pinion shaft center crosshairs */}
                    <line x1="-3.5" y1="0" x2="3.5" y2="0" stroke="#ca8a04" strokeWidth="0.7" opacity="0.75" />
                    <line x1="0" y1="-3.5" x2="0" y2="3.5" stroke="#ca8a04" strokeWidth="0.7" opacity="0.75" />
                    {/* Shaft & OD dimension pill in close-up mesh view */}
                    {viewMode === 'mesh' && (
                      <g transform={`translate(0, ${geometry.pinionShaftVisualRadius + 7})`}>
                        <rect
                          x="-36"
                          y="-4.5"
                          width="72"
                          height="7.5"
                          rx="2"
                          fill="#0f172a"
                          stroke="#eab308"
                          strokeWidth="0.5"
                          opacity="0.94"
                        />
                        <text
                          x="0"
                          y="0.7"
                          textAnchor="middle"
                          fill="#fef08a"
                          fontSize="3.9"
                          fontWeight="bold"
                          fontFamily="monospace"
                        >
                          OD Ø {geometry.pinionOuterDiaMm.toFixed(2)}mm · {t.visPinionShaftInfo.replace('{dia}', geometry.pinionShaftDiaMm.toFixed(1))}
                        </text>
                      </g>
                    )}
                  </>
                );
              })()}

              {/* Pinion Outer Diameter (OD) Caliper, Label, OD/Pitch/Shaft specs, Rotation indicator, and Motor Revs (rendered on top of Spur Gear) */}
              {viewMode !== 'mesh' && (
                <>
                  {/* Vertical diametral reference line across Pinion (-pinionTipRadius to +pinionTipRadius) */}
                  <line
                    x1="0"
                    y1={-geometry.pinionTipRadius}
                    x2="0"
                    y2={geometry.pinionTipRadius}
                    stroke="#fde047"
                    strokeWidth="0.9"
                    strokeDasharray="2 2"
                    opacity="0.55"
                  />

                  {/* Highlight dots at Pinion Top and Bottom Outer Edges */}
                  <circle cx="0" cy={-geometry.pinionTipRadius} r="2.5" fill="#facc15" />
                  <circle cx="0" cy={geometry.pinionTipRadius} r="2.5" fill="#facc15" />

                  {/* Horizontal extension lines on left of Pinion for Pinion OD Caliper */}
                  <line
                    x1="0"
                    y1={-geometry.pinionTipRadius}
                    x2={-geometry.pinionTipRadius - 14}
                    y2={-geometry.pinionTipRadius}
                    stroke="#facc15"
                    strokeWidth="1.2"
                    strokeDasharray="2.5 2"
                  />
                  <line
                    x1="0"
                    y1={geometry.pinionTipRadius}
                    x2={-geometry.pinionTipRadius - 14}
                    y2={geometry.pinionTipRadius}
                    stroke="#facc15"
                    strokeWidth="1.2"
                    strokeDasharray="2.5 2"
                  />

                  {/* Vertical Pinion OD Caliper line on left of Pinion */}
                  <line
                    x1={-geometry.pinionTipRadius - 10}
                    y1={-geometry.pinionTipRadius}
                    x2={-geometry.pinionTipRadius - 10}
                    y2={geometry.pinionTipRadius}
                    stroke="#facc15"
                    strokeWidth="1.8"
                  />
                  {/* Caliper top and bottom ticks */}
                  <line
                    x1={-geometry.pinionTipRadius - 14}
                    y1={-geometry.pinionTipRadius}
                    x2={-geometry.pinionTipRadius - 6}
                    y2={-geometry.pinionTipRadius}
                    stroke="#facc15"
                    strokeWidth="1.8"
                  />
                  <line
                    x1={-geometry.pinionTipRadius - 14}
                    y1={geometry.pinionTipRadius}
                    x2={-geometry.pinionTipRadius - 6}
                    y2={geometry.pinionTipRadius}
                    stroke="#facc15"
                    strokeWidth="1.8"
                  />

                  {/* Compact Pinion OD Caliper Readout Pill on the left of the caliper */}
                  <g transform={`translate(${-geometry.pinionTipRadius - 15}, 0)`}>
                    <rect
                      x="-68"
                      y="-9.5"
                      width="68"
                      height="19"
                      rx="4"
                      fill="#0f172a"
                      stroke="#eab308"
                      strokeWidth="1.2"
                      opacity="0.96"
                    />
                    <text
                      x="-34"
                      y="3.5"
                      textAnchor="middle"
                      fill="#fef08a"
                      fontSize="9"
                      fontWeight="bold"
                      fontFamily="monospace"
                    >
                      Ø {geometry.pinionOuterDiaMm.toFixed(2)} mm
                    </text>
                  </g>

                  {/* Leader line from Pinion top outer edge to Pinion Info Badge */}
                  <line
                    x1="0"
                    y1={-geometry.pinionTipRadius}
                    x2="-20"
                    y2={-geometry.pinionTipRadius - 10}
                    stroke="#eab308"
                    strokeWidth="1.2"
                    strokeDasharray="2 2"
                    opacity="0.85"
                  />

                  <g transform={`translate(-28, ${-geometry.pinionTipRadius - 24})`}>
                    <rect
                      x="-96"
                      y="-34"
                      width="192"
                      height="48"
                      rx="6"
                      fill="#0f172a"
                      stroke="#eab308"
                      strokeWidth="1.3"
                      opacity="0.97"
                    />
                    <text
                      x="0"
                      y="-19"
                      textAnchor="middle"
                      fill="#facc15"
                      fontSize="10.5"
                      fontWeight="bold"
                      fontFamily="sans-serif"
                    >
                      {t.visPinionLabel.replace('{pinion}', pinionTeeth.toString())} · {pitch}P
                    </text>
                    <text
                      x="0"
                      y="-6"
                      textAnchor="middle"
                      fill="#fef08a"
                      fontSize="9.5"
                      fontWeight="bold"
                      fontFamily="monospace"
                    >
                      {t.visPinionOdCallout.replace('{od}', geometry.pinionOuterDiaMm.toFixed(2))}
                    </text>
                    <text
                      x="0"
                      y="7"
                      textAnchor="middle"
                      fill="#94a3b8"
                      fontSize="8.5"
                      fontFamily="sans-serif"
                    >
                      {t.visPinionOdSub
                        .replace('{pitchDia}', geometry.pinionPitchDiaMm.toFixed(2))
                        .replace('{radius}', geometry.pinionOuterRadiusMm.toFixed(2))
                        .replace('{shaft}', geometry.pinionShaftDiaMm.toFixed(1))}
                    </text>
                  </g>

                  {/* Rotation direction indicator */}
                  <path
                    d={`M ${-geometry.r1 * 0.8} ${-geometry.r1 * 0.8} A ${geometry.r1 * 1.15} ${geometry.r1 * 1.15} 0 0 1 ${geometry.r1 * 0.8} ${-geometry.r1 * 0.8}`}
                    fill="none"
                    stroke="#facc15"
                    strokeWidth="2"
                    strokeDasharray="4 2"
                    markerEnd="url(#arrow)"
                    opacity="0.85"
                  />

                  {/* Motor revolutions pill badge below Pinion */}
                  <g transform={`translate(0, ${geometry.pinionTipRadius + 16})`}>
                    <rect
                      x="-58"
                      y="-11"
                      width="116"
                      height="18"
                      rx="4"
                      fill="#0f172a"
                      stroke="#eab308"
                      strokeWidth="0.9"
                      opacity="0.94"
                    />
                    <text
                      x="0"
                      y="2"
                      textAnchor="middle"
                      fill="#fef08a"
                      fontSize="10"
                      fontWeight="600"
                      fontFamily="monospace"
                    >
                      {t.visMotorRevs.replace('{revs}', (totalMotorRevs % 1000).toFixed(2))}
                    </text>
                  </g>
                </>
              )}
            </g>
          )}

          {/* Foreground Layer 3: Meshing contact callout (on top of both gears) */}
          {(viewMode === 'combined' || viewMode === 'gears' || viewMode === 'mesh') && (
            <g transform={`translate(${geometry.meshX}, ${geometry.meshY})`}>
              <circle r={viewMode === 'mesh' ? 1.6 : 4} fill="#ef4444" className="animate-ping" opacity="0.7" />
              <circle r={viewMode === 'mesh' ? 1.2 : 3} fill="#ef4444" />
              {viewMode !== 'mesh' ? (
                <g transform="translate(0, 17)">
                  <rect
                    x="-62"
                    y="-10"
                    width="124"
                    height="15"
                    rx="3.5"
                    fill="#0f172a"
                    stroke="#ef4444"
                    strokeWidth="0.9"
                    opacity="0.94"
                  />
                  <text
                    x="0"
                    y="1"
                    textAnchor="middle"
                    fill="#fca5a5"
                    fontSize="8.5"
                    fontWeight="bold"
                    fontFamily="monospace"
                  >
                    {t.visMeshPoint.replace('{mesh}', geometry.meshClearanceMm.toFixed(2))}
                  </text>
                </g>
              ) : (
                <g>
                  {/* Line of Action & Pitch Circle Clearance Boundaries (-meshClearancePx/2 and +meshClearancePx/2) */}
                  <line
                    x1={-geometry.meshClearancePx / 2}
                    y1="-42"
                    x2={-geometry.meshClearancePx / 2}
                    y2="42"
                    stroke="#eab308"
                    strokeWidth="0.45"
                    strokeDasharray="2 1.5"
                    opacity="0.75"
                  />
                  <line
                    x1={geometry.meshClearancePx / 2}
                    y1="-42"
                    x2={geometry.meshClearancePx / 2}
                    y2="42"
                    stroke="#38bdf8"
                    strokeWidth="0.45"
                    strokeDasharray="2 1.5"
                    opacity="0.75"
                  />
                  <line x1="0" y1="-45" x2="0" y2="45" stroke="#ef4444" strokeWidth="0.5" strokeDasharray="3 2" opacity="0.55" />
                  <line x1="-40" y1="0" x2="40" y2="0" stroke="#94a3b8" strokeWidth="0.5" strokeDasharray="2 2" opacity="0.3" />
                  {/* Caliper bar across the 0.10 mm mesh clearance */}
                  <line
                    x1={-geometry.meshClearancePx / 2}
                    y1="-24"
                    x2={geometry.meshClearancePx / 2}
                    y2="-24"
                    stroke="#ef4444"
                    strokeWidth="0.9"
                  />
                  <circle r="3.5" fill="none" stroke="#ef4444" strokeWidth="0.7" opacity="0.7" />
                  <g transform="translate(0, -31)">
                    <rect
                      x="-26"
                      y="-5"
                      width="52"
                      height="8"
                      rx="2"
                      fill="#0f172a"
                      stroke="#ef4444"
                      strokeWidth="0.5"
                      opacity="0.95"
                    />
                    <text
                      x="0"
                      y="0.5"
                      textAnchor="middle"
                      fill="#fca5a5"
                      fontSize="4.2"
                      fontWeight="bold"
                      fontFamily="monospace"
                    >
                      Mesh: +{geometry.meshClearanceMm.toFixed(2)} mm
                    </text>
                  </g>
                </g>
              )}
            </g>
          )}

          {/* Interactive Drag Instruction Hint */}
          {viewMode !== 'mesh' && viewMode !== 'axle' && (
            <text
              x="430"
              y="475"
              textAnchor="middle"
              fill="#64748b"
              fontSize="11"
              fontFamily="sans-serif"
            >
              {t.visDragHint}
            </text>
          )}
        </svg>
      </div>

      {/* Bottom Telemetry Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-slate-800 bg-slate-950/80 border-t border-slate-800 text-xs">
        <div className="p-3 flex flex-col">
          <span className="text-slate-400">{t.visGearRatio}</span>
          <span className="text-sm font-bold text-amber-400 tabular-nums">
            {gearRatio.toFixed(2)} : 1
          </span>
          <span className="text-[11px] text-slate-500">
            {t.visRatioDesc.replace('{ratio}', gearRatio.toFixed(2))}
          </span>
        </div>

        <div className="p-3 flex flex-col">
          <span className="text-slate-400">{t.visRollout}</span>
          <span className="text-sm font-bold text-emerald-400 tabular-nums">
            {rolloutMm.toFixed(4)} mm
          </span>
          <span className="text-[11px] text-slate-500">{t.visRolloutDesc}</span>
        </div>

        <div className="p-3 flex flex-col">
          <span className="text-slate-400">{t.visCircumference}</span>
          <span className="text-sm font-bold text-sky-400 tabular-nums">
            {tireCircumferenceMm.toFixed(2)} mm
          </span>
          <span className="text-[11px] text-slate-500">{t.visCircumferenceDesc}</span>
        </div>

        <div className="p-3 flex flex-col">
          <div className="flex items-center justify-between">
            <span className="text-slate-400">{t.visAnimSpeed}</span>
            <span className="text-slate-300 font-mono text-[11px]">{speedMultiplier}x</span>
          </div>
          <div className="flex items-center gap-2 mt-1.5">
            <input
              type="range"
              min="0.2"
              max="3"
              step="0.2"
              value={speedMultiplier}
              onChange={(e) => setSpeedMultiplier(parseFloat(e.target.value))}
              className="w-full h-1 bg-slate-700 rounded-lg cursor-pointer"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

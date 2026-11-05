import React from 'react';
import { Settings2, Plus, Minus, Bookmark, Lock, Unlock } from 'lucide-react';
import { AxleSize, GearSetup } from '../types/gears';
import {
  GEAR_MESH_CLEARANCE_MM,
  getPinionOuterDiameterMm,
  getPinionPitchDiameterMm,
  getSpurOuterDiameterMm,
  PRESETS,
} from '../utils/gearMath';
import { Language, translations } from '../i18n/translations';

interface GearControlsProps {
  setup: GearSetup;
  onChange: (updated: Partial<GearSetup>) => void;
  onSelectPreset: (presetId: string) => void;
  lang: Language;
}

export const GearControls: React.FC<GearControlsProps> = ({
  setup,
  onChange,
  onSelectPreset,
  lang,
}) => {
  const t = translations[lang];
  const { pinionTeeth, gearTeeth, tireDiameterMm, motorRpm } = setup;
  const currentPitch = setup.pitch ?? 72;
  const currentAxle: AxleSize = setup.axleSize ?? '3/32';
  const lockAxleHeight86: boolean = setup.lockAxleHeight86 ?? true;
  const lockedChassisMm: number = setup.lockedChassisMm ?? 8.6;
  // Pinion shaft diameter: 2.0 mm for 64p, 1.5 mm or 2.0 mm for 72p, 1.5 mm for 80p
  const currentPinionShaftDiaMm = setup.pinionShaftDiaMm ?? (currentPitch === 64 ? 2.0 : 1.5);

  // Physical module & Pinion/Spur outer diameters (Pinion includes +0.2 mm diameter offset; Spur uses exact 64P table for 64P)
  const moduleMm = 25.4 / currentPitch;
  const pinionOuterDiaMm = getPinionOuterDiameterMm(pinionTeeth, currentPitch);
  const spurOuterDiaMm = getSpurOuterDiameterMm(gearTeeth, currentPitch);
  const spurOuterRadiusMm = spurOuterDiaMm / 2;

  // Axle diameter & radius: 3/32" = 2.38125 mm (r = 1.190625 mm), 2mm = 2.000 mm (r = 1.000 mm)
  const axleDiaMm = currentAxle === '3/32' ? (3 / 32) * 25.4 : 2.0;
  const axleRadiusMm = axleDiaMm / 2;
  const ref332RadiusMm = ((3 / 32) * 25.4) / 2;

  // Distance between axle top surface and spur gear outer diameter:
  // Caliper span from axle top surface to bottom outer edge of spur gear: R_outer + r_axle = (D_outer + d_axle) / 2
  const axleTopToSpurOuterMm = spurOuterRadiusMm + axleRadiusMm;
  // Same-side radial distance from axle top surface to top outer edge of spur gear: R_outer - r_axle
  const axleRadialWallMm = spurOuterRadiusMm - axleRadiusMm;

  // Difference when switching between 3/32" and 2mm axle
  const ref332TopToOuterMm = spurOuterRadiusMm + ref332RadiusMm;
  const diffFrom332Mm = axleTopToSpurOuterMm - ref332TopToOuterMm;

  // Center-to-center distance (C = R_p1 + R_p2 + meshClearanceMm), Motor radius to Axle center (C - R_m), & Motor radius to Axle surface gap (C - R_m - r_a)
  const meshClearanceMm = setup.gearMeshClearanceMm ?? GEAR_MESH_CLEARANCE_MM;
  const pinionPitchRadiusMm = getPinionPitchDiameterMm(pinionTeeth, currentPitch) / 2;
  const spurPitchRadiusMm = (gearTeeth * moduleMm) / 2;
  const centerDistanceMm = pinionPitchRadiusMm + spurPitchRadiusMm + meshClearanceMm;
  const motorRadiusMm = (setup.motorDiameterMm ?? 14.0) / 2;
  const motorToAxleCenterMm = centerDistanceMm - motorRadiusMm;
  const motorToAxleGapMm = centerDistanceMm - motorRadiusMm - axleRadiusMm;

  // Chassis bottom surface (rungon alapinta):
  // - When locked (lockAxleHeight86 = true): locked at lockedChassisMm (default 8.60 mm) from the spur axle's top surface (-axleRadiusMm).
  // - When unlocked (lockAxleHeight86 = false): moves according to the spur gear's radius (spurOuterRadiusMm).
  const chassisBottomFromCenterMm = lockAxleHeight86
    ? lockedChassisMm - axleRadiusMm
    : spurOuterRadiusMm;
  const axleTopToChassisBottomMm = chassisBottomFromCenterMm + axleRadiusMm;
  const spurToChassisBottomMm = axleTopToChassisBottomMm - axleTopToSpurOuterMm;

  // Road surface is always at the bottom of the tire (tireDiameterMm / 2)
  const effectiveAxleCenterHeightMm = tireDiameterMm / 2;
  const chassisGroundClearanceMm = effectiveAxleCenterHeightMm - chassisBottomFromCenterMm;

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-6">
      {/* Header and Example Quick Presets */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
            <Settings2 className="w-4 h-4 text-amber-500" />
            {t.controlsHeading}
          </h2>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {t.controlsRealtime}
          </span>
        </div>

        {/* Example Quick Load Buttons */}
        <div className="p-3 bg-amber-500/10 dark:bg-amber-500/5 border border-amber-500/20 rounded-xl space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-amber-800 dark:text-amber-300">
            <span className="flex items-center gap-1.5">
              <Bookmark className="w-3.5 h-3.5" />
              {t.controlsCsvPresets}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {PRESETS.filter((p) => p.isFromUserCsv).map((preset) => {
              const presetPitch = preset.pitch ?? (preset.id === 'user-csv-1' ? 72 : 64);
              const isSelected =
                pinionTeeth === preset.pinionTeeth &&
                gearTeeth === preset.gearTeeth &&
                tireDiameterMm === preset.tireDiameterMm &&
                currentPitch === presetPitch;

              const title = preset.id === 'user-csv-1' ? t.controlsCsvCol1 : t.controlsCsvCol3;

              return (
                <button
                  key={preset.id}
                  onClick={() => onSelectPreset(preset.id)}
                  className={`px-3 py-2 rounded-lg text-left text-xs transition-all border ${
                    isSelected
                      ? 'bg-amber-500 text-slate-950 font-bold border-amber-500 shadow-xs'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-amber-400'
                  }`}
                >
                  <div className="font-semibold truncate flex items-center justify-between gap-1.5">
                    <span>{title}</span>
                    <span
                      className={`font-mono text-[10px] px-1.5 py-0.5 rounded font-bold ${
                        isSelected
                          ? 'bg-slate-950/15 text-slate-950'
                          : 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
                      }`}
                    >
                      {presetPitch}p
                    </span>
                  </div>
                  <div className="text-[11px] opacity-80 tabular-nums font-mono mt-0.5">
                    {preset.pinionTeeth}T / {preset.gearTeeth}T · {presetPitch}p · {preset.tireDiameterMm} mm
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Primary Sliders & Pitch Selector: Pitch, Axle Size, Pinion, Gear, Tire Size */}
      <div className="space-y-5">
        {/* 0. Gear Pitch Selector (64P, 72P, 80P) */}
        <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-800 dark:text-slate-200">
              {t.controlsPitchLabel}
            </label>
            <span className="text-[11px] font-mono text-amber-600 dark:text-amber-400 font-bold">
              m = {moduleMm.toFixed(3)} mm
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {([64, 72, 80] as const).map((p) => {
              const isSelected = currentPitch === p;
              const pinionDia = getPinionOuterDiameterMm(pinionTeeth, p).toFixed(2);
              const spurDia = getSpurOuterDiameterMm(gearTeeth, p).toFixed(2);
              return (
                <button
                  key={p}
                  onClick={() =>
                    onChange({
                      pitch: p,
                      pinionShaftDiaMm: p === 64 ? 2.0 : p === 72 ? currentPinionShaftDiaMm : 1.5,
                    })
                  }
                  className={`py-1.5 px-2.5 rounded-lg text-center transition-all border ${
                    isSelected
                      ? 'bg-amber-500 text-slate-950 font-bold border-amber-500 shadow-xs'
                      : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:border-amber-400'
                  }`}
                >
                  <div className="text-xs font-extrabold font-mono flex items-center justify-center gap-1">
                    <span>{p}P</span>
                    <span className="text-[9px] font-normal opacity-85">
                      ({p === 64 ? '2.0mm' : p === 72 ? `${currentPinionShaftDiaMm.toFixed(1)}mm` : '1.5mm'})
                    </span>
                  </div>
                  <div className="text-[10px] opacity-80 font-mono">
                    Ø {pinionDia}/{spurDia}mm
                  </div>
                </button>
              );
            })}
          </div>

          {/* 72P Pinion Shaft / Hole selection: 1.5 mm vs 2.0 mm */}
          {currentPitch === 72 && (
            <div className="mt-2.5 pt-2.5 border-t border-slate-200 dark:border-slate-700/60 flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                {t.controlsPitch72ShaftChoice}
              </span>
              <div className="flex items-center gap-1.5">
                {([1.5, 2.0] as const).map((dia) => {
                  const isShaftSelected = currentPinionShaftDiaMm === dia;
                  return (
                    <button
                      key={dia}
                      type="button"
                      onClick={() => onChange({ pinionShaftDiaMm: dia })}
                      className={`px-2.5 py-1 rounded-md text-xs font-mono font-bold transition-all border ${
                        isShaftSelected
                          ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-xs'
                          : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700 hover:border-amber-400'
                      }`}
                    >
                      Ø {dia.toFixed(1)} mm {dia === 2.0 ? '(2mm)' : '(1.5mm)'}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          <p className="text-[10px] text-slate-500 dark:text-slate-400">
            {t.controlsPitchDesc}
          </p>
        </div>

        {/* 0A. Gear Mesh Clearance Selector (0.00 mm – 0.50 mm, default 0.10 mm) */}
        <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              {t.controlsMeshClearanceLabel}
            </label>
            <div className="flex items-center gap-1">
              <button
                onClick={() =>
                  onChange({
                    gearMeshClearanceMm: Math.max(0, Number((meshClearanceMm - 0.01).toFixed(2))),
                  })
                }
                className="w-7 h-7 flex items-center justify-center rounded-md bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 font-bold border border-slate-300 dark:border-slate-600"
                title="-0.01 mm"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <input
                type="number"
                step="0.01"
                min="0"
                max="0.5"
                value={meshClearanceMm}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  if (!isNaN(val)) {
                    onChange({
                      gearMeshClearanceMm: Math.max(0, Math.min(0.5, Number(val.toFixed(2)))),
                    });
                  }
                }}
                className="w-16 text-center py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md text-xs font-bold font-mono text-rose-600 dark:text-rose-400 tabular-nums"
              />
              <span className="text-xs text-slate-500 font-medium mr-1">mm</span>
              <button
                onClick={() =>
                  onChange({
                    gearMeshClearanceMm: Math.min(0.5, Number((meshClearanceMm + 0.01).toFixed(2))),
                  })
                }
                className="w-7 h-7 flex items-center justify-center rounded-md bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 font-bold border border-slate-300 dark:border-slate-600"
                title="+0.01 mm"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <input
            type="range"
            min="0"
            max="0.5"
            step="0.01"
            value={Math.min(0.5, Math.max(0, meshClearanceMm))}
            onChange={(e) => onChange({ gearMeshClearanceMm: parseFloat(e.target.value) })}
            className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg cursor-pointer accent-rose-500"
          />

          <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
            <span>0.00 mm</span>
            <span className="text-rose-600 dark:text-rose-400 font-semibold">
              {meshClearanceMm <= 0.001
                ? t.controlsMeshTight
                : t.controlsMeshStandard.replace('{mesh}', meshClearanceMm.toFixed(2))}
              {' · '}C = {centerDistanceMm.toFixed(2)} mm
            </span>
            <span>0.50 mm</span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-[10px] text-slate-500 font-medium">{t.controlsPresets}</span>
            {[0.0, 0.05, 0.1, 0.15, 0.2, 0.25].map((meshVal) => (
              <button
                key={meshVal}
                onClick={() => onChange({ gearMeshClearanceMm: meshVal })}
                className={`px-2 py-0.5 text-[11px] font-mono rounded border transition-colors ${
                  Math.abs(meshClearanceMm - meshVal) < 0.001
                    ? 'bg-rose-500 text-white font-bold border-rose-500'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:border-rose-400'
                }`}
              >
                {meshVal.toFixed(2)} mm
              </button>
            ))}
          </div>

          <p className="text-[10px] text-slate-500 dark:text-slate-400">
            {t.controlsMeshClearanceDesc}
          </p>
        </div>

        {/* 0B. Spur Axle Thickness Selector (3/32" vs 2 mm) */}
        <div className="p-3 rounded-xl border bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-800 space-y-2.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-800 dark:text-slate-200">
              {t.controlsAxleLabel}
            </label>
            <span className="text-[11px] font-mono text-sky-600 dark:text-sky-400 font-bold">
              Ø {axleDiaMm.toFixed(3)} mm
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {([
              { id: '3/32' as AxleSize, label: '3/32"', sub: 'Ø 2.381 mm (r = 1.191 mm)' },
              { id: '2mm' as AxleSize, label: '2 mm', sub: 'Ø 2.000 mm (r = 1.000 mm)' },
            ]).map((opt) => {
              const isSelected = currentAxle === opt.id;
              return (
                <button
                  key={opt.id}
                  onClick={() => onChange({ axleSize: opt.id })}
                  className={`py-1.5 px-2.5 rounded-lg text-center transition-all border ${
                    isSelected
                      ? 'bg-sky-500 text-slate-950 font-bold border-sky-500 shadow-xs'
                      : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:border-sky-400'
                  }`}
                >
                  <div className="text-xs font-extrabold font-mono">{opt.label}</div>
                  <div className="text-[10px] opacity-80 font-mono">{opt.sub}</div>
                </button>
              );
            })}
          </div>

          {/* Readout of distance from axle top surface to spur gear outer diameter */}
          <div className="p-2.5 rounded-lg bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-700/80 space-y-1 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300">
                {t.controlsAxleTopToOuterLabel}
              </span>
              <span className="font-mono font-extrabold text-xs tabular-nums text-emerald-600 dark:text-emerald-400">
                {axleTopToSpurOuterMm.toFixed(2)} mm
              </span>
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
              <span>{t.controlsAxleRadialLabel}</span>
              <span className="font-mono tabular-nums">{axleRadialWallMm.toFixed(2)} mm</span>
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
              <span>{t.controlsAxleDiffVs332}</span>
              <span className="font-mono tabular-nums font-semibold">
                {diffFrom332Mm === 0 ? '0.000 mm' : `${diffFrom332Mm.toFixed(3)} mm`}
              </span>
            </div>

            <div className="pt-1.5 border-t border-slate-200/70 dark:border-slate-700/70 space-y-1">
              <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                <span>{t.controlsCenterDistanceLabel.replace('{mesh}', meshClearanceMm.toFixed(2))}</span>
                <span className="font-mono tabular-nums font-semibold text-slate-700 dark:text-slate-300">
                  {centerDistanceMm.toFixed(2)} mm ({pinionPitchRadiusMm.toFixed(2)} + {spurPitchRadiusMm.toFixed(2)} + {meshClearanceMm.toFixed(2)})
                </span>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                <span>{t.controlsMotorToAxleCenterLabel}</span>
                <span className="font-mono tabular-nums font-semibold text-violet-600 dark:text-violet-400">
                  {motorToAxleCenterMm >= 0 ? '+' : ''}
                  {motorToAxleCenterMm.toFixed(2)} mm ({centerDistanceMm.toFixed(2)} − {motorRadiusMm.toFixed(2)})
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300">
                  {t.controlsMotorToAxleGapLabel}
                </span>
                <span
                  className={`font-mono font-extrabold text-xs tabular-nums ${
                    motorToAxleGapMm <= 0.1
                      ? 'text-rose-600 dark:text-rose-400'
                      : 'text-violet-600 dark:text-violet-400'
                  }`}
                >
                  {motorToAxleGapMm >= 0 ? '+' : ''}
                  {motorToAxleGapMm.toFixed(2)} mm
                </span>
              </div>
            </div>
          </div>

          {/* Lock Axle Height to 8.60 mm setting */}
          <div className="pt-1.5 border-t border-slate-200/80 dark:border-slate-700/80 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                {lockAxleHeight86 ? (
                  <Lock className="w-3.5 h-3.5 text-amber-500" />
                ) : (
                  <Unlock className="w-3.5 h-3.5 text-slate-400" />
                )}
                {t.controlsAxleLock86Label}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => onChange({ lockAxleHeight86: false })}
                className={`py-1.5 px-2.5 rounded-lg text-xs font-semibold transition-all border flex items-center justify-center gap-1.5 ${
                  !lockAxleHeight86
                    ? 'bg-slate-800 dark:bg-slate-700 text-white border-slate-700 dark:border-slate-600 shadow-xs'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:border-amber-400'
                }`}
              >
                <Unlock className="w-3 h-3" />
                {t.controlsAxleLock86Off}
              </button>
              <button
                onClick={() => onChange({ lockAxleHeight86: true })}
                className={`py-1.5 px-2.5 rounded-lg text-xs font-bold transition-all border flex items-center justify-center gap-1.5 ${
                  lockAxleHeight86
                    ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-xs'
                    : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:border-amber-400'
                }`}
              >
                <Lock className="w-3 h-3" />
                {t.controlsAxleLock86On.replace('{val}', lockedChassisMm.toFixed(2))}
              </button>
            </div>

            {/* Lock value selector when locked */}
            {lockAxleHeight86 && (
              <div className="p-2.5 rounded-lg bg-white/90 dark:bg-slate-900/90 border border-amber-500/30 space-y-2">
                {/* Adjustable lock value (mm) + quick presets */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                    {t.controlsAxleLockValueLabel}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() =>
                        onChange({
                          lockedChassisMm: Math.max(6.0, Number((lockedChassisMm - 0.1).toFixed(2))),
                        })
                      }
                      className="w-6 h-6 flex items-center justify-center rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 font-bold border border-slate-300 dark:border-slate-700"
                      title="-0.1 mm"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <input
                      type="number"
                      step="0.05"
                      min="6.0"
                      max="12.0"
                      value={lockedChassisMm}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        if (!isNaN(val)) {
                          onChange({ lockedChassisMm: Math.max(6.0, Math.min(12.0, Number(val.toFixed(2)))) });
                        }
                      }}
                      className="w-16 text-center py-0.5 bg-slate-50 dark:bg-slate-800 border border-amber-500/50 rounded text-xs font-bold font-mono text-amber-600 dark:text-amber-400 tabular-nums"
                    />
                    <span className="text-[11px] text-slate-500 font-mono">mm</span>
                    <button
                      onClick={() =>
                        onChange({
                          lockedChassisMm: Math.min(12.0, Number((lockedChassisMm + 0.1).toFixed(2))),
                        })
                      }
                      className="w-6 h-6 flex items-center justify-center rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 font-bold border border-slate-300 dark:border-slate-700"
                      title="+0.1 mm"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-1">
                  {[8.4, 8.5, 8.6, 8.7, 8.8].map((val) => (
                    <button
                      key={val}
                      onClick={() => onChange({ lockedChassisMm: val })}
                      className={`px-2 py-0.5 text-[10px] font-mono rounded border transition-colors ${
                        Math.abs(lockedChassisMm - val) < 0.001
                          ? 'bg-amber-500 text-slate-950 font-bold border-amber-500'
                          : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:border-amber-400'
                      }`}
                    >
                      {val.toFixed(2)} mm
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className=" space-y-1.5 pt-0.5">
              <div className="text-[10px] font-mono text-amber-700 dark:text-amber-300 bg-amber-500/10 px-2.5 py-1.5 rounded-lg border border-amber-500/20 space-y-1">
                <div className="flex items-center justify-between font-bold">
                  <span>{t.controlsAxleTopToChassisLabel}</span>
                  <span className="text-amber-700 dark:text-amber-300 font-extrabold">
                    {axleTopToChassisBottomMm.toFixed(2)} mm {lockAxleHeight86 ? t.controlsLockedTag : t.controlsFreeTag}
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                  <span>{t.controlsAxleTopToOuterLabel}</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    {axleTopToSpurOuterMm.toFixed(2)} mm
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                  <span>{t.controlsSpurToChassisLabel} ({axleTopToChassisBottomMm.toFixed(2)} − {axleTopToSpurOuterMm.toFixed(2)}):</span>
                  <span
                    className={`font-bold ${
                      spurToChassisBottomMm >= 0
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-rose-600 dark:text-rose-400'
                    }`}
                  >
                    {spurToChassisBottomMm >= 0 ? '+' : ''}
                    {spurToChassisBottomMm.toFixed(2)} mm
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                  <span>{t.controlsChassisClearanceLabel}</span>
                  <span
                    className={`font-bold ${
                      chassisGroundClearanceMm >= 0
                        ? 'text-sky-600 dark:text-sky-400'
                        : 'text-rose-600 dark:text-rose-400'
                    }`}
                  >
                    {chassisGroundClearanceMm >= 0 ? '+' : ''}
                    {chassisGroundClearanceMm.toFixed(2)} mm
                  </span>
                </div>
              </div>
            </div>
          </div>

          <p className="text-[10px] text-slate-500 dark:text-slate-400">
            {t.controlsAxleDesc}
          </p>
        </div>

        {/* 1. Pinion Teeth (Z1) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                {t.controlsPinionLabel}
              </label>
              <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                {t.controlsPinionShaftBadge.replace('{dia}', currentPinionShaftDiaMm.toFixed(1))}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => onChange({ pinionTeeth: Math.max(5, pinionTeeth - 1) })}
                className="w-7 h-7 flex items-center justify-center rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 font-bold transition-colors"
                title="-1"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <input
                type="number"
                min="5"
                max="15"
                value={pinionTeeth}
                onChange={(e) => onChange({ pinionTeeth: Math.max(5, Math.min(15, parseInt(e.target.value) || 5)) })}
                className="w-14 text-center py-1 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md text-xs font-bold font-mono text-slate-900 dark:text-white tabular-nums"
              />
              <span className="text-xs text-slate-500 font-medium mr-1">T</span>
              <button
                onClick={() => onChange({ pinionTeeth: Math.min(15, pinionTeeth + 1) })}
                className="w-7 h-7 flex items-center justify-center rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 font-bold transition-colors"
                title="+1"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          <input
            type="range"
            min="5"
            max="15"
            step="1"
            value={Math.min(15, Math.max(5, pinionTeeth))}
            onChange={(e) => onChange({ pinionTeeth: parseInt(e.target.value) })}
            className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg cursor-pointer accent-amber-500"
          />
          <div className="flex justify-between text-[11px] text-slate-400 font-mono">
            <span>5T</span>
            <span className="text-amber-600 dark:text-amber-400 font-semibold">
              {t.controlsPinionTeeth.replace('{count}', pinionTeeth.toString())} (Ø {pinionOuterDiaMm.toFixed(2)} mm)
            </span>
            <span>15T</span>
          </div>

          {/* Pinion shaft/bore selector (1.5mm vs 2.0mm) */}
          <div className="p-2.5 rounded-xl bg-amber-500/5 dark:bg-amber-500/5 border border-amber-500/20 space-y-1.5 mt-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                {t.controlsPinionShaftSelectLabel}
              </span>
              <div className="flex items-center gap-1.5">
                {([1.5, 2.0] as const).map((dia) => {
                  const isShaftActive = currentPinionShaftDiaMm === dia;
                  return (
                    <button
                      key={dia}
                      type="button"
                      onClick={() => onChange({ pinionShaftDiaMm: dia })}
                      className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all border ${
                        isShaftActive
                          ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-xs'
                          : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700 hover:border-amber-400'
                      }`}
                    >
                      Ø {dia.toFixed(1)} mm
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400">
              {currentPitch === 72
                ? currentPinionShaftDiaMm === 2.0
                  ? t.controlsPinionShaft72pTip20
                  : t.controlsPinionShaft72pTip15
                : currentPitch === 64
                ? t.controlsPinionShaft64pTip
                : t.controlsPinionShaft80pTip}
            </div>
            {currentPitch === 72 && currentPinionShaftDiaMm === 2.0 && pinionTeeth < 7 && (
              <div className="text-[10px] text-amber-700 dark:text-amber-400 font-medium">
                {t.controlsPinionShaftMinTeethTip}
              </div>
            )}
          </div>
        </div>

        {/* 2. Gear Teeth (Z2) / Spur */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-sky-500" />
              {t.controlsGearLabel}
            </label>
            <div className="flex items-center gap-1">
              <button
                onClick={() => onChange({ gearTeeth: Math.max(30, gearTeeth - 1) })}
                className="w-7 h-7 flex items-center justify-center rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 font-bold transition-colors"
                title="-1"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <input
                type="number"
                min="30"
                max="45"
                value={gearTeeth}
                onChange={(e) => onChange({ gearTeeth: Math.max(30, Math.min(45, parseInt(e.target.value) || 30)) })}
                className="w-14 text-center py-1 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md text-xs font-bold font-mono text-slate-900 dark:text-white tabular-nums"
              />
              <span className="text-xs text-slate-500 font-medium mr-1">T</span>
              <button
                onClick={() => onChange({ gearTeeth: Math.min(45, gearTeeth + 1) })}
                className="w-7 h-7 flex items-center justify-center rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 font-bold transition-colors"
                title="+1"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          <input
            type="range"
            min="30"
            max="45"
            step="1"
            value={Math.min(45, Math.max(30, gearTeeth))}
            onChange={(e) => onChange({ gearTeeth: parseInt(e.target.value) })}
            className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg cursor-pointer accent-sky-500"
          />
          <div className="flex justify-between text-[11px] text-slate-400 font-mono">
            <span>30T</span>
            <span className="text-sky-600 dark:text-sky-400 font-semibold">
              {t.controlsGearTeeth.replace('{count}', gearTeeth.toString())} (Ø {spurOuterDiaMm.toFixed(2)} mm)
            </span>
            <span>45T</span>
          </div>
        </div>

        {/* 3. Tire Diameter (D in mm) */}
        <div className="space-y-2 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              {t.controlsTireLabel}
            </label>
            <div className="flex items-center gap-1">
              <button
                onClick={() => onChange({ tireDiameterMm: Math.max(15, Number((tireDiameterMm - 0.5).toFixed(1))) })}
                className="w-7 h-7 flex items-center justify-center rounded-md bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 font-bold border border-slate-300 dark:border-slate-600"
                title="-0.5 mm"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <input
                type="number"
                step="0.1"
                min="15"
                max="20"
                value={tireDiameterMm}
                onChange={(e) => onChange({ tireDiameterMm: Math.max(15, Math.min(20, parseFloat(e.target.value) || 15)) })}
                className="w-16 text-center py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md text-xs font-bold font-mono text-emerald-600 dark:text-emerald-400 tabular-nums"
              />
              <span className="text-xs text-slate-500 font-medium mr-1">mm</span>
              <button
                onClick={() => onChange({ tireDiameterMm: Math.min(20, Number((tireDiameterMm + 0.5).toFixed(1))) })}
                className="w-7 h-7 flex items-center justify-center rounded-md bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 font-bold border border-slate-300 dark:border-slate-600"
                title="+0.5 mm"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <input
            type="range"
            min="15"
            max="20"
            step="0.1"
            value={Math.min(20, Math.max(15, tireDiameterMm))}
            onChange={(e) => onChange({ tireDiameterMm: parseFloat(e.target.value) })}
            className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg cursor-pointer accent-emerald-500"
          />

          <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
            <span>15.0 mm</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{tireDiameterMm.toFixed(1)} mm</span>
            <span>20.0 mm</span>
          </div>

          {/* Quick Tire Size Buttons */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-[10px] text-slate-500 font-medium">{t.controlsPresets}</span>
            {[16.5, 16.4, 16.3, 16.2, 16.1, 16.0].map((size) => (
              <button
                key={size}
                onClick={() => onChange({ tireDiameterMm: size })}
                className={`px-2 py-0.5 text-[11px] font-mono rounded border transition-colors ${
                  Math.abs(tireDiameterMm - size) < 0.001
                    ? 'bg-emerald-500 text-slate-950 font-bold border-emerald-500'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:border-emerald-400'
                }`}
              >
                {size.toFixed(1)} mm
              </button>
            ))}
          </div>
        </div>

        {/* 4. Motor Diameter (13.5 mm – 14.5 mm, default 14.0 mm) & 5. Motor Offset below Spur Axle */}
        {(() => {
          const motorDiameterMm = setup.motorDiameterMm ?? 14.0;
          const motorOffsetMm = setup.motorOffsetMm ?? 0.0;
          const motorClearanceMm = effectiveAxleCenterHeightMm - motorDiameterMm / 2 - motorOffsetMm;
          return (
            <>
              <div className="space-y-2 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-violet-500" />
                    {t.controlsMotorDiaLabel}
                  </label>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() =>
                        onChange({
                          motorDiameterMm: Math.max(13.5, Number((motorDiameterMm - 0.1).toFixed(1))),
                        })
                      }
                      className="w-7 h-7 flex items-center justify-center rounded-md bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 font-bold border border-slate-300 dark:border-slate-600"
                      title="-0.1 mm"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <input
                      type="number"
                      step="0.1"
                      min="13.5"
                      max="14.5"
                      value={motorDiameterMm}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        if (!isNaN(val)) {
                          onChange({ motorDiameterMm: Math.max(13.5, Math.min(14.5, Number(val.toFixed(2)))) });
                        }
                      }}
                      className="w-16 text-center py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md text-xs font-bold font-mono text-violet-600 dark:text-violet-400 tabular-nums"
                    />
                    <span className="text-xs text-slate-500 font-medium mr-1">mm</span>
                    <button
                      onClick={() =>
                        onChange({
                          motorDiameterMm: Math.min(14.5, Number((motorDiameterMm + 0.1).toFixed(1))),
                        })
                      }
                      className="w-7 h-7 flex items-center justify-center rounded-md bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 font-bold border border-slate-300 dark:border-slate-600"
                      title="+0.1 mm"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <input
                  type="range"
                  min="13.5"
                  max="14.5"
                  step="0.1"
                  value={Math.min(14.5, Math.max(13.5, motorDiameterMm))}
                  onChange={(e) => onChange({ motorDiameterMm: parseFloat(e.target.value) })}
                  className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg cursor-pointer accent-violet-500"
                />

                <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                  <span>13.5 mm</span>
                  <span className="text-violet-600 dark:text-violet-400 font-semibold">
                    Ø {motorDiameterMm.toFixed(1)} mm ·{' '}
                    {t.controlsMotorDiaClearance.replace(
                      '{clearance}',
                      `${motorClearanceMm >= 0 ? '+' : ''}${motorClearanceMm.toFixed(2)}`
                    )}
                  </span>
                  <span>14.5 mm</span>
                </div>

                {/* Quick Motor Diameter Buttons */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[10px] text-slate-500 font-medium">{t.controlsPresets}</span>
                  {[13.5, 13.8, 14.0, 14.2, 14.5].map((size) => (
                    <button
                      key={size}
                      onClick={() => onChange({ motorDiameterMm: size })}
                      className={`px-2 py-0.5 text-[11px] font-mono rounded border transition-colors ${
                        Math.abs(motorDiameterMm - size) < 0.001
                          ? 'bg-violet-500 text-white font-bold border-violet-500'
                          : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:border-violet-400'
                      }`}
                    >
                      {size.toFixed(1)} mm
                    </button>
                  ))}
                </div>
              </div>

              {/* 5. Motor Offset (below Spur Axle, 0.0 mm – 3.0 mm) */}
              <div className="space-y-2 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-fuchsia-500" />
                    {t.controlsMotorOffsetLabel}
                  </label>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() =>
                        onChange({
                          motorOffsetMm: Math.max(0, Number((motorOffsetMm - 0.1).toFixed(1))),
                        })
                      }
                      className="w-7 h-7 flex items-center justify-center rounded-md bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 font-bold border border-slate-300 dark:border-slate-600"
                      title="-0.1 mm"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="3.0"
                      value={motorOffsetMm}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        if (!isNaN(val)) {
                          onChange({ motorOffsetMm: Math.max(0, Math.min(3.0, Number(val.toFixed(2)))) });
                        }
                      }}
                      className="w-16 text-center py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md text-xs font-bold font-mono text-fuchsia-600 dark:text-fuchsia-400 tabular-nums"
                    />
                    <span className="text-xs text-slate-500 font-medium mr-1">mm</span>
                    <button
                      onClick={() =>
                        onChange({
                          motorOffsetMm: Math.min(3.0, Number((motorOffsetMm + 0.1).toFixed(1))),
                        })
                      }
                      className="w-7 h-7 flex items-center justify-center rounded-md bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 font-bold border border-slate-300 dark:border-slate-600"
                      title="+0.1 mm"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <input
                  type="range"
                  min="0"
                  max="3.0"
                  step="0.1"
                  value={Math.min(3.0, Math.max(0, motorOffsetMm))}
                  onChange={(e) => onChange({ motorOffsetMm: parseFloat(e.target.value) })}
                  className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg cursor-pointer accent-fuchsia-500"
                />

                <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                  <span>0.0 mm</span>
                  <span className="text-fuchsia-600 dark:text-fuchsia-400 font-semibold">
                    {motorOffsetMm <= 0.001
                      ? t.controlsMotorOffsetLevel
                      : t.controlsMotorOffsetBelow.replace('{offset}', motorOffsetMm.toFixed(1))}
                  </span>
                  <span>-3.0 mm</span>
                </div>

                {/* Quick Motor Offset Preset Buttons */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[10px] text-slate-500 font-medium">{t.controlsPresets}</span>
                  {[0.0, 0.5, 1.0, 1.2, 1.5, 2.0].map((offsetVal) => (
                    <button
                      key={offsetVal}
                      onClick={() => onChange({ motorOffsetMm: offsetVal })}
                      className={`px-2 py-0.5 text-[11px] font-mono rounded border transition-colors ${
                        Math.abs(motorOffsetMm - offsetVal) < 0.001
                          ? 'bg-fuchsia-500 text-white font-bold border-fuchsia-500'
                          : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:border-fuchsia-400'
                      }`}
                    >
                      {offsetVal === 0 ? '0.0 mm' : `-${offsetVal.toFixed(1)} mm`}
                    </button>
                  ))}
                </div>

                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                  {t.controlsMotorOffsetDesc}
                </p>
              </div>
            </>
          );
        })()}
      </div>

      {/* 6. Motor Speed (RPM) Selector */}
      {(() => {
        const rolloutMm = (Math.PI * tireDiameterMm * pinionTeeth) / gearTeeth;
        const speedMps = (rolloutMm * (motorRpm / 60)) / 1000;
        const speedKmh = speedMps * 3.6;
        return (
          <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                {t.controlsMotorRpm}
              </label>
              <div className="flex items-center gap-1">
                <button
                  onClick={() =>
                    onChange({
                      motorRpm: Math.max(0, motorRpm - 1000),
                    })
                  }
                  className="w-7 h-7 flex items-center justify-center rounded-md bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 font-bold border border-slate-300 dark:border-slate-600"
                  title="-1000 RPM"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <input
                  type="number"
                  step="1000"
                  min="0"
                  max="200000"
                  value={motorRpm}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    if (!isNaN(val)) {
                      onChange({ motorRpm: Math.max(0, Math.min(200000, val)) });
                    } else if (e.target.value === '') {
                      onChange({ motorRpm: 0 });
                    }
                  }}
                  className="w-24 text-center py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md text-xs font-bold font-mono text-amber-600 dark:text-amber-400 tabular-nums"
                />
                <span className="text-xs text-slate-500 font-mono mr-1">RPM</span>
                <button
                  onClick={() =>
                    onChange({
                      motorRpm: Math.min(200000, motorRpm + 1000),
                    })
                  }
                  className="w-7 h-7 flex items-center justify-center rounded-md bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 font-bold border border-slate-300 dark:border-slate-600"
                  title="+1000 RPM"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <input
              type="range"
              min="0"
              max="200000"
              step="1000"
              value={Math.min(200000, Math.max(0, motorRpm))}
              onChange={(e) => onChange({ motorRpm: parseInt(e.target.value, 10) })}
              className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg cursor-pointer accent-amber-500"
            />

            <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
              <span>0 RPM</span>
              <span className="text-amber-600 dark:text-amber-400 font-semibold">
                {motorRpm.toLocaleString()} RPM → {speedKmh.toFixed(1)} km/h ({speedMps.toFixed(2)} m/s)
              </span>
              <span>200k RPM</span>
            </div>

            {/* Quick Motor RPM Preset Buttons */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[10px] text-slate-500 font-medium">{t.controlsPresets}</span>
              {[0, 15000, 25000, 50000, 75000, 100000, 150000, 200000].map((rpmVal) => (
                <button
                  key={rpmVal}
                  onClick={() => onChange({ motorRpm: rpmVal })}
                  className={`px-2 py-0.5 text-[11px] font-mono rounded border transition-colors ${
                    motorRpm === rpmVal
                      ? 'bg-amber-500 text-slate-950 font-bold border-amber-500'
                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:border-amber-400'
                  }`}
                >
                  {rpmVal === 0 ? '0' : `${(rpmVal / 1000).toFixed(0)}k`}
                </button>
              ))}
            </div>

            <p className="text-[10px] text-slate-500 dark:text-slate-400">
              {t.controlsMotorRpmDesc}
            </p>
          </div>
        );
      })()}
    </div>
  );
};

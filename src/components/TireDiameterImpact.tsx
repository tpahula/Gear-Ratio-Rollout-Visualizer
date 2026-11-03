import React, { useState, useMemo, useEffect } from 'react';
import { ArrowUpDown, TrendingDown, TrendingUp, Check, Sparkles } from 'lucide-react';
import { GearSetup } from '../types/gears';
import { calculateGearMetrics, findCompensatingGears, PI } from '../utils/gearMath';
import { Language, translations } from '../i18n/translations';

interface TireDiameterImpactProps {
  setup: GearSetup;
  onApplyGearPair: (pinion: number, gear: number) => void;
  onSetTireDiameter: (diameter: number) => void;
  lang: Language;
}

const TIRE_PRESET_SIZES = [16.5, 16.4, 16.3, 16.2, 16.1, 16.0];

export const TireDiameterImpact: React.FC<TireDiameterImpactProps> = ({
  setup,
  onApplyGearPair,
  onSetTireDiameter,
  lang,
}) => {
  const t = translations[lang];
  const { pinionTeeth, gearTeeth, tireDiameterMm, motorRpm } = setup;

  // Comparison state (default 16.0 mm when current is 16.5 mm, or 16.5 mm otherwise)
  const [compareDiameterMm, setCompareDiameterMm] = useState<number>(
    tireDiameterMm === 16.5 ? 16.0 : 16.5
  );

  // Local string states so the user can freely type decimals (e.g. "16,3" or "16.25")
  const [inputA, setInputA] = useState<string>(tireDiameterMm.toString());
  const [inputB, setInputB] = useState<string>(compareDiameterMm.toString());

  useEffect(() => {
    setInputA(tireDiameterMm.toString());
  }, [tireDiameterMm]);

  useEffect(() => {
    setInputB(compareDiameterMm.toString());
  }, [compareDiameterMm]);

  const handleInputAChange = (raw: string) => {
    setInputA(raw);
    const normalized = raw.replace(',', '.');
    const parsed = parseFloat(normalized);
    if (!isNaN(parsed) && parsed > 0 && parsed <= 100) {
      onSetTireDiameter(parsed);
    }
  };

  const handleInputABlur = () => {
    const normalized = inputA.replace(',', '.');
    const parsed = parseFloat(normalized);
    if (!isNaN(parsed) && parsed > 0) {
      const clamped = Math.max(5, Math.min(50, Number(parsed.toFixed(2))));
      onSetTireDiameter(clamped);
      setInputA(clamped.toString());
    } else {
      setInputA(tireDiameterMm.toString());
    }
  };

  const handleInputBChange = (raw: string) => {
    setInputB(raw);
    const normalized = raw.replace(',', '.');
    const parsed = parseFloat(normalized);
    if (!isNaN(parsed) && parsed > 0 && parsed <= 100) {
      setCompareDiameterMm(parsed);
    }
  };

  const handleInputBBlur = () => {
    const normalized = inputB.replace(',', '.');
    const parsed = parseFloat(normalized);
    if (!isNaN(parsed) && parsed > 0) {
      const clamped = Math.max(5, Math.min(50, Number(parsed.toFixed(2))));
      setCompareDiameterMm(clamped);
      setInputB(clamped.toString());
    } else {
      setInputB(compareDiameterMm.toString());
    }
  };

  // Compute metrics for both current and comparison tire sizes
  const currentMetrics = useMemo(() => {
    return calculateGearMetrics(setup);
  }, [setup]);

  const compareMetrics = useMemo(() => {
    return calculateGearMetrics({
      ...setup,
      tireDiameterMm: compareDiameterMm,
    });
  }, [setup, compareDiameterMm]);

  // Differences
  const diameterDiff = compareDiameterMm - tireDiameterMm;
  const diameterPercent = (diameterDiff / tireDiameterMm) * 100;

  const rolloutDiff = compareMetrics.rolloutMm - currentMetrics.rolloutMm;
  const rolloutPercent = (rolloutDiff / currentMetrics.rolloutMm) * 100;

  const speedDiff = compareMetrics.speedKmh - currentMetrics.speedKmh;

  // Compensation alternatives to match original rollout with new tire diameter
  const compensatingPairs = useMemo(() => {
    return findCompensatingGears(
      currentMetrics.rolloutMm,
      compareDiameterMm,
      [5, 15],
      [30, 45]
    );
  }, [currentMetrics.rolloutMm, compareDiameterMm]);

  // SVG Chart data generation dynamically covering the selected diameters and 16.0–16.5 mm range
  const chartData = useMemo(() => {
    const minD = Math.min(15.0, tireDiameterMm, compareDiameterMm);
    const maxD = Math.max(20.0, tireDiameterMm, compareDiameterMm);
    const steps = 25;
    const stepSize = (maxD - minD) / steps;

    const points: Array<{ d: number; rollout: number; speed: number }> = [];
    const pi = PI;

    for (let i = 0; i <= steps; i++) {
      const d = minD + i * stepSize;
      const rollout = (pi * d * pinionTeeth) / gearTeeth;
      const speed = (rollout * motorRpm * 60) / 1_000_000;
      points.push({ d, rollout, speed });
    }

    const minRollout = points[0].rollout;
    const maxRollout = points[points.length - 1].rollout;

    return { minD, maxD, points, minRollout, maxRollout };
  }, [pinionTeeth, gearTeeth, motorRpm, tireDiameterMm, compareDiameterMm]);

  // SVG dimensions for graph
  const svgWidth = 600;
  const svgHeight = 240;
  const padLeft = 55;
  const padRight = 30;
  const padTop = 25;
  const padBottom = 35;

  const mapX = (d: number) => {
    return padLeft + ((d - chartData.minD) / (chartData.maxD - chartData.minD || 1)) * (svgWidth - padLeft - padRight);
  };

  const mapY = (rollout: number) => {
    return (
      svgHeight -
      padBottom -
      ((rollout - chartData.minRollout) / (chartData.maxRollout - chartData.minRollout || 1)) *
        (svgHeight - padTop - padBottom)
    );
  };

  // Build SVG polyline points
  const polylinePoints = chartData.points
    .map((p) => `${mapX(p.d).toFixed(1)},${mapY(p.rollout).toFixed(1)}`)
    .join(' ');

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-6">
      {/* Title & Concept Explanation */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <ArrowUpDown className="w-5 h-5 text-amber-500" />
            {t.tireImpactHeading}
          </h2>
          <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
            {t.tireImpactFormula}
          </span>
        </div>
        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
          {t.tireImpactIntro
            .replace('{gear}', gearTeeth.toString())
            .replace('{pinion}', pinionTeeth.toString())
            .replace('{ratio}', currentMetrics.gearRatio.toFixed(2))}
        </p>
      </div>

      {/* Side-by-Side Comparison: Current Tire vs. Comparison Tire */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Box 1: Nykyinen rengaskoko (Asetus A) */}
        <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/5 dark:bg-amber-500/10 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wide">
              {t.tireSetupA}
            </span>
            <div className="flex items-center gap-1.5">
              <label className="text-[11px] text-slate-600 dark:text-slate-300 font-medium">
                {t.tireInputLabel}
              </label>
              <input
                type="number"
                step="0.1"
                min="5"
                max="50"
                value={inputA}
                onChange={(e) => handleInputAChange(e.target.value)}
                onBlur={handleInputABlur}
                className="w-20 text-center py-1 px-1.5 bg-white dark:bg-slate-800 border border-amber-500/40 dark:border-amber-500/40 focus:border-amber-500 rounded-md text-xs font-mono font-bold text-amber-600 dark:text-amber-400 tabular-nums"
              />
              <span className="text-xs font-mono text-slate-500">mm</span>
            </div>
          </div>

          <div className="space-y-1">
            <div className="text-2xl font-extrabold text-slate-900 dark:text-white tabular-nums">
              {currentMetrics.rolloutMm.toFixed(4)} <span className="text-xs font-normal text-slate-500">{t.metricRolloutUnit}</span>
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center justify-between">
              <span>{t.tireCircumference}: {currentMetrics.tireCircumferenceMm.toFixed(2)} mm</span>
              <span>{t.tireSpeed}: {currentMetrics.speedKmh.toFixed(2)} km/h</span>
            </div>
          </div>

          <div className="pt-2 border-t border-amber-500/20 space-y-1.5">
            <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 block">
              {t.tireQuickSelectLabel}
            </span>
            <div className="flex flex-wrap gap-1.5">
              {TIRE_PRESET_SIZES.map((size) => {
                const isSelected = Math.abs(tireDiameterMm - size) < 0.001;
                return (
                  <button
                    key={size}
                    onClick={() => onSetTireDiameter(size)}
                    className={`px-2 py-1 text-[11px] font-mono rounded border transition-colors ${
                      isSelected
                        ? 'bg-amber-500 text-slate-950 font-bold border-amber-500'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700 hover:border-amber-400'
                    }`}
                  >
                    {size.toFixed(1)} mm
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Box 2: Vertailtava rengaskoko (Asetus B) */}
        <div className="p-4 rounded-xl border border-sky-500/30 bg-sky-500/5 dark:bg-sky-500/10 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-sky-700 dark:text-sky-400 uppercase tracking-wide">
              {t.tireSetupB}
            </span>
            <div className="flex items-center gap-1.5">
              <label className="text-[11px] text-slate-600 dark:text-slate-300 font-medium">
                {t.tireInputLabel}
              </label>
              <input
                type="number"
                step="0.1"
                min="5"
                max="50"
                value={inputB}
                onChange={(e) => handleInputBChange(e.target.value)}
                onBlur={handleInputBBlur}
                className="w-20 text-center py-1 px-1.5 bg-white dark:bg-slate-800 border border-sky-500/40 dark:border-sky-500/40 focus:border-sky-500 rounded-md text-xs font-mono font-bold text-sky-600 dark:text-sky-400 tabular-nums"
              />
              <span className="text-xs font-mono text-slate-500">mm</span>
            </div>
          </div>

          <div className="space-y-1">
            <div className="text-2xl font-extrabold text-slate-900 dark:text-white tabular-nums">
              {compareMetrics.rolloutMm.toFixed(4)} <span className="text-xs font-normal text-slate-500">{t.metricRolloutUnit}</span>
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center justify-between">
              <span>{t.tireCircumference}: {compareMetrics.tireCircumferenceMm.toFixed(2)} mm</span>
              <span>{t.tireSpeed}: {compareMetrics.speedKmh.toFixed(2)} km/h</span>
            </div>
          </div>

          {/* Quick preset buttons for comparison: 16.5, 16.4, 16.3, 16.2, 16.1, 16.0 mm */}
          <div className="pt-2 border-t border-sky-500/20 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
                {t.tireQuickSelectLabel}
              </span>
              <button
                onClick={() => onSetTireDiameter(compareDiameterMm)}
                className="px-2 py-0.5 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-[10px] rounded transition-colors"
              >
                {t.tireApplyToA}
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5 items-center">
              {TIRE_PRESET_SIZES.map((size) => {
                const isSelected = Math.abs(compareDiameterMm - size) < 0.001;
                return (
                  <button
                    key={size}
                    onClick={() => setCompareDiameterMm(size)}
                    className={`px-2 py-1 text-[11px] font-mono rounded border transition-colors ${
                      isSelected
                        ? 'bg-sky-500 text-slate-950 font-bold border-sky-500'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700 hover:border-sky-400'
                    }`}
                  >
                    {size.toFixed(1)} mm
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Difference Summary Banner */}
      <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 rounded-xl flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-2">
          {rolloutDiff >= 0 ? (
            <TrendingUp className="w-5 h-5 text-emerald-500 shrink-0" />
          ) : (
            <TrendingDown className="w-5 h-5 text-rose-500 shrink-0" />
          )}
          <div>
            <div className="font-bold text-slate-900 dark:text-white">
              {t.tireChangeTitle
                .replace('{diff}', diameterDiff > 0 ? `+${diameterDiff.toFixed(1)}` : diameterDiff.toFixed(1))
                .replace('{pct}', diameterPercent > 0 ? `+${diameterPercent.toFixed(1)}` : diameterPercent.toFixed(1))}
            </div>
            <div className="text-slate-600 dark:text-slate-400">
              {t.tireChangeDesc
                .replace('{diff}', rolloutDiff > 0 ? `+${rolloutDiff.toFixed(4)}` : rolloutDiff.toFixed(4))
                .replace('{pct}', rolloutPercent > 0 ? `+${rolloutPercent.toFixed(1)}` : rolloutPercent.toFixed(1))}
            </div>
          </div>
        </div>

        <div className="text-right font-mono">
          <span className="text-slate-400 text-[11px] block">{t.tireTopSpeedChange}</span>
          <span className={`font-bold text-sm ${speedDiff >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
            {speedDiff > 0 ? `+${speedDiff.toFixed(2)}` : speedDiff.toFixed(2)} km/h
          </span>
        </div>
      </div>

      {/* Visual Linear Response Graph (Diameter vs Rollout) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-slate-700 dark:text-slate-300">
            {t.tireLinearTitle.replace('{pinion}', pinionTeeth.toString()).replace('{gear}', gearTeeth.toString())}
          </span>
          <span className="text-slate-400 font-mono text-[11px]">
            {t.tireSlope.replace('{k}', ((currentMetrics.usedPi * pinionTeeth) / gearTeeth).toFixed(4))}
          </span>
        </div>

        <div className="w-full bg-slate-950 rounded-xl p-3 border border-slate-800 overflow-x-auto">
          <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-auto min-w-[500px]">
            {/* Grid Lines */}
            <line x1={padLeft} y1={padTop} x2={padLeft} y2={svgHeight - padBottom} stroke="#334155" strokeWidth="1" />
            <line x1={padLeft} y1={svgHeight - padBottom} x2={svgWidth - padRight} y2={svgHeight - padBottom} stroke="#334155" strokeWidth="1" />

            {/* Horizontal Grid guidelines */}
            {Array.from({ length: 4 }).map((_, i) => {
              const rVal = chartData.minRollout + (i * (chartData.maxRollout - chartData.minRollout)) / 3;
              const y = mapY(rVal);
              return (
                <g key={i}>
                  <line x1={padLeft} y1={y} x2={svgWidth - padRight} y2={y} stroke="#1e293b" strokeDasharray="3 3" />
                  <text x={padLeft - 8} y={y + 3} textAnchor="end" fill="#64748b" fontSize="10" fontFamily="monospace">
                    {rVal.toFixed(1)}
                  </text>
                </g>
              );
            })}

            {/* Vertical guidelines */}
            {Array.from({ length: 5 }).map((_, i) => {
              const dVal = chartData.minD + (i * (chartData.maxD - chartData.minD)) / 4;
              const x = mapX(dVal);
              return (
                <g key={i}>
                  <line x1={x} y1={padTop} x2={x} y2={svgHeight - padBottom} stroke="#1e293b" strokeDasharray="3 3" />
                  <text x={x} y={svgHeight - padBottom + 16} textAnchor="middle" fill="#64748b" fontSize="10" fontFamily="monospace">
                    {dVal.toFixed(1)} mm
                  </text>
                </g>
              );
            })}

            {/* Linear Response Line */}
            <polyline
              fill="none"
              stroke="#f59e0b"
              strokeWidth="2.5"
              points={polylinePoints}
            />

            {/* Point A Marker (Current Tire) */}
            <g transform={`translate(${mapX(tireDiameterMm)}, ${mapY(currentMetrics.rolloutMm)})`}>
              <circle r="6" fill="#f59e0b" stroke="#ffffff" strokeWidth="2" />
              <text x="0" y="-12" textAnchor="middle" fill="#f59e0b" fontSize="11" fontWeight="bold">
                A: {tireDiameterMm} mm ({currentMetrics.rolloutMm.toFixed(2)} mm)
              </text>
            </g>

            {/* Point B Marker (Comparison Tire) */}
            <g transform={`translate(${mapX(compareDiameterMm)}, ${mapY(compareMetrics.rolloutMm)})`}>
              <circle r="6" fill="#38bdf8" stroke="#ffffff" strokeWidth="2" />
              <text x="0" y="20" textAnchor="middle" fill="#38bdf8" fontSize="11" fontWeight="bold">
                B: {compareDiameterMm} mm ({compareMetrics.rolloutMm.toFixed(2)} mm)
              </text>
            </g>

            {/* Axis Labels */}
            <text x={svgWidth - padRight} y={svgHeight - 10} textAnchor="end" fill="#94a3b8" fontSize="11">
              {t.tireXAxis}
            </text>
            <text x={padLeft} y={padTop - 8} fill="#94a3b8" fontSize="11">
              {t.tireYAxis}
            </text>
          </svg>
        </div>
      </div>

      {/* Gear Compensation Tool: How to restore rollout when tire diameter changes */}
      <div className="space-y-3 pt-3 border-t border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              {t.tireCompHeading
                .replace('{rollout}', currentMetrics.rolloutMm.toFixed(3))
                .replace('{dia}', compareDiameterMm.toString())}
            </h3>
          </div>
        </div>

        <p className="text-xs text-slate-500 dark:text-slate-400">
          {t.tireCompDesc}
        </p>

        {compensatingPairs.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
            {compensatingPairs.map((pair, idx) => (
              <div
                key={idx}
                className="p-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl flex items-center justify-between text-xs"
              >
                <div>
                  <div className="font-bold text-slate-900 dark:text-white font-mono">
                    Pinion: {pair.pinion}T / Spur: {pair.gear}T
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono">
                    {pair.rolloutMm.toFixed(3)} mm ({pair.diffPercent > 0 ? `+${pair.diffPercent.toFixed(1)}%` : `${pair.diffPercent.toFixed(1)}%`})
                  </div>
                </div>

                <button
                  onClick={() => onApplyGearPair(pair.pinion, pair.gear)}
                  className="px-2.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg transition-colors flex items-center gap-1"
                  title={t.tireCompApply}
                >
                  <Check className="w-3.5 h-3.5" />
                  {t.tireCompApply}
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs text-slate-500">
            {t.tireCompEmpty}
          </div>
        )}
      </div>
    </div>
  );
};

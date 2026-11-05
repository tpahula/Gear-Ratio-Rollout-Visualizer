import React, { useMemo } from 'react';
import { CalculationResult, GearSetup } from '../types/gears';
import { Gauge, Target, CircleDot, TrendingUp, Zap } from 'lucide-react';
import { Language, translations } from '../i18n/translations';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ReferenceDot,
} from 'recharts';

interface MetricsDisplayProps {
  setup: GearSetup;
  metrics: CalculationResult;
  lang: Language;
}

export const MetricsDisplay: React.FC<MetricsDisplayProps> = ({ setup, metrics, lang }) => {
  const t = translations[lang];
  const { pinionTeeth, gearTeeth, tireDiameterMm, motorRpm } = setup;
  const {
    gearRatio,
    speedRatio,
    tireCircumferenceMm,
    rolloutMm,
    revsPerMeter,
    speedKmh,
    speedMs,
    wheelRpm,
    usedPi,
  } = metrics;

  // Generate data points for Motor RPM from 0 to 200,000
  // Step of 5,000 RPM yields 41 distinct points for smooth rendering
  const rpmSpeedData = useMemo(() => {
    const points: Array<{
      rpm: number;
      speedKmh: number;
      speedMs: number;
      wheelRpm: number;
    }> = [];

    const maxRpm = 200000;
    const step = 5000;

    for (let r = 0; r <= maxRpm; r += step) {
      const kmh = (rolloutMm * r * 60) / 1_000_000;
      const ms = kmh / 3.6;
      const wRpm = Math.round(r * speedRatio);
      points.push({
        rpm: r,
        speedKmh: Number(kmh.toFixed(2)),
        speedMs: Number(ms.toFixed(2)),
        wheelRpm: wRpm,
      });
    }

    return points;
  }, [rolloutMm, speedRatio]);

  // Speed at 200,000 RPM (graph max range)
  const maxSpeedAt200kKmh = useMemo(() => {
    return (rolloutMm * 200000 * 60) / 1_000_000;
  }, [rolloutMm]);

  // Custom Recharts Tooltip showing RPM, speed in km/h & m/s, and drive axle wheel RPM
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-900/95 dark:bg-slate-950/95 text-white p-3 rounded-xl shadow-xl border border-slate-700/80 text-xs space-y-2 backdrop-blur-xs">
          <div className="flex items-center justify-between gap-4 font-mono font-bold text-amber-400 border-b border-slate-800 pb-1.5">
            <span className="flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              {data.rpm.toLocaleString()} RPM
            </span>
            <span className="text-[10px] text-slate-400 font-normal">
              {((data.rpm / 200000) * 100).toFixed(0)}% max
            </span>
          </div>
          <div className="space-y-1 font-mono text-[11px]">
            <div className="flex items-center justify-between gap-4">
              <span className="text-slate-300">{t.rpmSpeedChartTooltipSpeedKmh}:</span>
              <span className="font-extrabold text-amber-300 tabular-nums text-sm">
                {data.speedKmh.toFixed(2)} km/h
              </span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-slate-400">{t.rpmSpeedChartTooltipSpeedMs}:</span>
              <span className="text-slate-200 tabular-nums">
                {data.speedMs.toFixed(2)} m/s
              </span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-slate-400">{t.rpmSpeedChartTooltipWheelRpm}:</span>
              <span className="text-slate-200 tabular-nums">
                {data.wheelRpm.toLocaleString()} rpm
              </span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-4">
      {/* Primary KPI Hero Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {/* Card 1: Kokonaisvälitys / Etenemä (Rollout) */}
        <div className="p-4 bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent dark:from-amber-500/15 dark:to-slate-900 border border-amber-500/30 rounded-2xl relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-amber-700 dark:text-amber-400 font-semibold mb-1">
            <span>{t.metricRolloutTitle}</span>
            <Target className="w-4 h-4 text-amber-500" />
          </div>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-3xl font-extrabold text-slate-950 dark:text-white tabular-nums tracking-tight">
              {rolloutMm.toFixed(4)}
            </span>
            <span className="text-sm font-semibold text-amber-600 dark:text-amber-400">{t.metricRolloutUnit}</span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
            {t.metricRolloutDesc}
          </p>
          <div className="mt-2.5 pt-2 border-t border-amber-500/20 text-[11px] font-mono text-slate-600 dark:text-slate-400">
            {t.metricRolloutFormula.replace('{dia}', tireDiameterMm.toString()).replace('{pinion}', pinionTeeth.toString()).replace('{gear}', gearTeeth.toString())}
          </div>
        </div>

        {/* Card 2: Välityssuhde (Gear Ratio) */}
        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between text-xs text-sky-700 dark:text-sky-400 font-semibold mb-1">
            <span>{t.metricRatioTitle}</span>
            <CircleDot className="w-4 h-4 text-sky-500" />
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-3xl font-extrabold text-slate-950 dark:text-white tabular-nums tracking-tight">
              {gearRatio.toFixed(2)} : 1
            </span>
            <span className="text-xs text-slate-400 font-mono">({speedRatio.toFixed(3)})</span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
            {t.metricRatioDesc.replace('{ratio}', gearRatio.toFixed(2))}
          </p>
          <div className="mt-2.5 pt-2 border-t border-slate-200 dark:border-slate-800 text-[11px] font-mono text-slate-500">
            {t.metricRatioFormula.replace('{gear}', gearTeeth.toString()).replace('{pinion}', pinionTeeth.toString())}
          </div>
        </div>

        {/* Card 3: Renkaan kehä ja mitta */}
        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between text-xs text-emerald-700 dark:text-emerald-400 font-semibold mb-1">
            <span>{t.metricCircumferenceTitle}</span>
            <Gauge className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-3xl font-extrabold text-slate-950 dark:text-white tabular-nums tracking-tight">
              {tireCircumferenceMm.toFixed(2)}
            </span>
            <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">mm</span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
            {t.metricCircumferenceDesc.replace('{dia}', tireDiameterMm.toString())}
          </p>
          <div className="mt-2.5 pt-2 border-t border-slate-200 dark:border-slate-800 text-[11px] font-mono text-slate-500">
            {t.metricCircumferenceFormula.replace('{pi}', usedPi.toFixed(5)).replace('{dia}', tireDiameterMm.toString())}
          </div>
        </div>
      </div>

      {/* Secondary Calculation Strip: Speed, RPM & Mechanical Characteristics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-3.5 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl">
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block">{t.metricSpeed}</span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-xl font-bold text-slate-900 dark:text-white tabular-nums">
              {speedKmh.toFixed(2)}
            </span>
            <span className="text-xs text-slate-500 font-semibold">km/h</span>
          </div>
          <span className="text-[10px] text-slate-400 font-mono">({speedMs.toFixed(2)} m/s @ {motorRpm.toLocaleString()} rpm)</span>
        </div>

        <div className="p-3.5 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl">
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block">{t.metricWheelRpm}</span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-xl font-bold text-slate-900 dark:text-white tabular-nums">
              {Math.round(wheelRpm).toLocaleString()}
            </span>
            <span className="text-xs text-slate-500 font-semibold">rpm</span>
          </div>
          <span className="text-[10px] text-slate-400 font-mono">{t.metricWheelRpmDesc}</span>
        </div>

        <div className="p-3.5 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl">
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block">{t.metricRevsPerMeter}</span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-xl font-bold text-slate-900 dark:text-white tabular-nums">
              {revsPerMeter.toFixed(1)}
            </span>
            <span className="text-xs text-slate-500 font-semibold">{t.metricRevsPerMeterDesc}</span>
          </div>
          <span className="text-[10px] text-slate-400 font-mono">{t.metricRevsPerMeterDesc}</span>
        </div>

        <div className="p-3.5 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl">
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block">{t.metricProfile}</span>
          <div className="mt-1 flex items-center gap-1.5">
            <span
              className={`text-xs font-bold px-2 py-0.5 rounded ${
                gearRatio > 6
                  ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                  : gearRatio > 4
                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                  : 'bg-violet-500/15 text-violet-600 dark:text-violet-400'
              }`}
            >
              {gearRatio > 6 ? t.profileHighTorque : gearRatio > 4 ? t.profileBalanced : t.profileTall}
            </span>
          </div>
          <span className="text-[10px] text-slate-400 font-mono mt-0.5 block">
            {gearRatio > 6 ? t.profileHighTorqueDesc : gearRatio > 4 ? t.profileBalancedDesc : t.profileTallDesc}
          </span>
        </div>
      </div>

      {/* Recharts Top Speed vs. Motor RPM Line Graph (0 to 200,000 RPM) */}
      <div className="p-4 sm:p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs space-y-4">
        {/* Header & Status Badges */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-amber-500" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {t.rpmSpeedChartTitle}
              </h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t.rpmSpeedChartSubtitle
                .replace('{pinion}', pinionTeeth.toString())
                .replace('{gear}', gearTeeth.toString())
                .replace('{dia}', tireDiameterMm.toFixed(1))
                .replace('{rollout}', rolloutMm.toFixed(3))}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
            {/* Current RPM Indicator Badge */}
            <div className="px-2.5 py-1 rounded-lg bg-sky-500/10 dark:bg-sky-500/15 border border-sky-500/30 text-sky-700 dark:text-sky-300 font-semibold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-sky-500 animate-pulse" />
              <span>
                {t.rpmSpeedChartCurrentMarker
                  .replace('{rpm}', motorRpm.toLocaleString())
                  .replace('{kmh}', speedKmh.toFixed(2))
                  .replace('{ms}', speedMs.toFixed(2))}
              </span>
            </div>

            {/* Top Speed at 200,000 RPM Badge */}
            <div className="px-2.5 py-1 rounded-lg bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/30 text-amber-700 dark:text-amber-300 font-semibold">
              {t.rpmSpeedChartMaxAt200k.replace('{kmh}', maxSpeedAt200kKmh.toFixed(1))}
            </div>
          </div>
        </div>

        {/* Recharts LineChart */}
        <div className="w-full h-64 sm:h-72 -ml-2 sm:ml-0">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={rpmSpeedData}
              margin={{ top: 12, right: 16, left: 4, bottom: 20 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="currentColor"
                className="text-slate-200 dark:text-slate-800"
                strokeOpacity={0.6}
              />
              <XAxis
                dataKey="rpm"
                type="number"
                domain={[0, 200000]}
                ticks={[0, 25000, 50000, 75000, 100000, 125000, 150000, 175000, 200000]}
                tickFormatter={(val) => `${val / 1000}k`}
                stroke="currentColor"
                className="text-slate-400 text-[11px]"
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                label={{
                  value: t.rpmSpeedChartAxisRpm,
                  position: 'insideBottom',
                  offset: -12,
                  fill: '#94a3b8',
                  fontSize: 11,
                }}
              />
              <YAxis
                dataKey="speedKmh"
                stroke="currentColor"
                className="text-slate-400 text-[11px]"
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                unit=" km/h"
                label={{
                  value: t.rpmSpeedChartAxisSpeed,
                  angle: -90,
                  position: 'insideLeft',
                  offset: 8,
                  fill: '#94a3b8',
                  fontSize: 11,
                }}
              />
              <Tooltip content={<CustomTooltip />} />

              {/* Current operating point marker */}
              {motorRpm >= 0 && motorRpm <= 200000 && (
                <>
                  <ReferenceLine
                    x={motorRpm}
                    stroke="#0284c7"
                    strokeDasharray="4 4"
                    strokeWidth={1.5}
                  />
                  <ReferenceDot
                    x={motorRpm}
                    y={Number(speedKmh.toFixed(2))}
                    r={6}
                    fill="#0284c7"
                    stroke="#ffffff"
                    strokeWidth={2}
                  />
                </>
              )}

              <Line
                type="linear"
                dataKey="speedKmh"
                stroke="#f59e0b"
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 6, fill: '#f59e0b', stroke: '#ffffff', strokeWidth: 2 }}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Milestone Quick Speed Breakdown Bar */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {[20000, 50000, 100000, 150000, 200000].map((rpmStep) => {
              const stepKmh = (rolloutMm * rpmStep * 60) / 1_000_000;
              const stepMs = stepKmh / 3.6;
              const isCurrentRpm = Math.abs(motorRpm - rpmStep) < 2500;
              return (
                <div
                  key={rpmStep}
                  className={`p-2 rounded-xl text-center border transition-all ${
                    isCurrentRpm
                      ? 'bg-sky-50 dark:bg-sky-950/40 border-sky-400 dark:border-sky-600 shadow-xs ring-1 ring-sky-400/50'
                      : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                    {rpmStep === 20000 ? '20k (Std)' : `${rpmStep / 1000}k RPM`}
                  </div>
                  <div className="text-xs font-extrabold text-slate-900 dark:text-white font-mono tabular-nums mt-0.5">
                    {stepKmh.toFixed(1)} <span className="text-[10px] font-normal text-slate-400">km/h</span>
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    {stepMs.toFixed(1)} m/s
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

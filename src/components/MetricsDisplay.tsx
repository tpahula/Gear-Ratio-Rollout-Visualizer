import React from 'react';
import { CalculationResult, GearSetup } from '../types/gears';
import { Gauge, Target, CircleDot } from 'lucide-react';
import { Language, translations } from '../i18n/translations';

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
    </div>
  );
};

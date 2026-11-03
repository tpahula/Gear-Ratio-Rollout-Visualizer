import React, { useState, useMemo } from 'react';
import { Table, Download } from 'lucide-react';
import { GearSetup } from '../types/gears';
import { PI } from '../utils/gearMath';
import { Language, translations } from '../i18n/translations';

interface GearMatrixTableProps {
  setup: GearSetup;
  onSelectGearPair: (pinion: number, gear: number) => void;
  lang: Language;
}

export const GearMatrixTable: React.FC<GearMatrixTableProps> = ({
  setup,
  onSelectGearPair,
  lang,
}) => {
  const t = translations[lang];
  const { pinionTeeth, gearTeeth, tireDiameterMm } = setup;
  const pi = PI;

  // Custom matrix ranges (defaults to user requested scales: 5-15T and 30-45T)
  const [pinionMin, setPinionMin] = useState<number>(5);
  const [pinionMax, setPinionMax] = useState<number>(15);
  const [gearMin, setGearMin] = useState<number>(30);
  const [gearMax, setGearMax] = useState<number>(45);

  // Generate range arrays
  const pinions = useMemo(() => {
    const list: number[] = [];
    for (let p = pinionMin; p <= pinionMax; p++) list.push(p);
    return list;
  }, [pinionMin, pinionMax]);

  const gears = useMemo(() => {
    const list: number[] = [];
    for (let g = gearMin; g <= gearMax; g++) list.push(g);
    return list;
  }, [gearMin, gearMax]);

  // Export matrix to CSV
  const handleExportCsv = () => {
    let csv = `Gear Rollout Matrix (Tire diameter: ${tireDiameterMm} mm, pi: ${pi})\n`;
    csv += `${t.matrixColHeader};` + gears.map((g) => `${g}T`).join(';') + '\n';

    pinions.forEach((p) => {
      const row = [`${p}T`];
      gears.forEach((g) => {
        const rollout = (pi * tireDiameterMm * p) / g;
        row.push(rollout.toFixed(3).replace('.', ','));
      });
      csv += row.join(';') + '\n';
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `gearmatrix_d${tireDiameterMm}mm.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
      {/* Title & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Table className="w-5 h-5 text-amber-500" />
            {t.matrixHeading}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {t.matrixSubtitle.replace('{dia}', tireDiameterMm.toString())}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Quick presets for range */}
          <button
            onClick={() => {
              setPinionMin(5);
              setPinionMax(15);
              setGearMin(30);
              setGearMax(45);
            }}
            className="px-2.5 py-1 text-xs bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-300 transition-colors font-medium"
          >
            {t.matrixPresetScale}
          </button>
          <button
            onClick={() => {
              setPinionMin(5);
              setPinionMax(10);
              setGearMin(35);
              setGearMax(45);
            }}
            className="px-2.5 py-1 text-xs bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-300 transition-colors"
          >
            {t.matrixPresetShort}
          </button>
          <button
            onClick={() => {
              setPinionMin(10);
              setPinionMax(15);
              setGearMin(30);
              setGearMax(40);
            }}
            className="px-2.5 py-1 text-xs bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-300 transition-colors"
          >
            {t.matrixPresetTall}
          </button>

          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-lg transition-colors border border-slate-300 dark:border-slate-700"
            title={t.matrixExportCsv}
          >
            <Download className="w-3.5 h-3.5 text-amber-500" />
            {t.matrixExportCsv}
          </button>
        </div>
      </div>

      {/* Interactive Matrix Table */}
      <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
        <table className="w-full text-xs text-left border-collapse">
          <thead>
            <tr className="bg-slate-100 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800">
              <th className="p-3 font-bold text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-slate-800 whitespace-nowrap">
                {t.matrixColHeader}
              </th>
              {gears.map((g) => (
                <th
                  key={g}
                  className={`p-2.5 text-center font-bold tabular-nums whitespace-nowrap ${
                    g === gearTeeth
                      ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 font-extrabold'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {g}T
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-mono">
            {pinions.map((p) => {
              const isSelectedPinion = p === pinionTeeth;
              return (
                <tr
                  key={p}
                  className={
                    isSelectedPinion
                      ? 'bg-amber-500/5 dark:bg-amber-500/10'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors'
                  }
                >
                  <td
                    className={`p-3 font-bold border-r border-slate-200 dark:border-slate-800 tabular-nums whitespace-nowrap ${
                      isSelectedPinion
                        ? 'text-amber-600 dark:text-amber-400 font-extrabold'
                        : 'text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {p}T
                  </td>

                  {gears.map((g) => {
                    const isSelected = p === pinionTeeth && g === gearTeeth;
                    const rollout = (pi * tireDiameterMm * p) / g;
                    const ratio = g / p;

                    return (
                      <td
                        key={g}
                        onClick={() => onSelectGearPair(p, g)}
                        className={`p-2 text-center cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-amber-500 text-slate-950 font-extrabold shadow-sm ring-2 ring-amber-400 rounded-sm'
                            : 'hover:bg-amber-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200'
                        }`}
                        title={`Pinion: ${p}T, Spur: ${g}T\nRollout: ${rollout.toFixed(4)} mm\nRatio: ${ratio.toFixed(2)}:1`}
                      >
                        <div className="font-bold tabular-nums">
                          {rollout.toFixed(2)}
                        </div>
                        <div
                          className={`text-[10px] tabular-nums ${
                            isSelected ? 'text-slate-900 opacity-90' : 'text-slate-400'
                          }`}
                        >
                          {ratio.toFixed(2)}:1
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-1">
        <span>{t.matrixLegend}</span>
        <span>
          {t.matrixCurrentSelection.replace('{pinion}', pinionTeeth.toString()).replace('{gear}', gearTeeth.toString())}
        </span>
      </div>
    </div>
  );
};

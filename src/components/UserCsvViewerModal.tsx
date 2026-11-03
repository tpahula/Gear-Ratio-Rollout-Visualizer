import React, { useState, useEffect } from 'react';
import { FileSpreadsheet, Download, Calculator } from 'lucide-react';
import { GearSetup } from '../types/gears';
import { Language, translations } from '../i18n/translations';

interface UserCsvViewerModalProps {
  onLoadSetup: (setup: Partial<GearSetup>) => void;
  lang: Language;
}

export const UserCsvViewerModal: React.FC<UserCsvViewerModalProps> = ({ onLoadSetup, lang }) => {
  const t = translations[lang];
  const [rawCsvText, setRawCsvText] = useState<string>('');

  useEffect(() => {
    fetch('/assets/aistudio/gearratio_b60bc774.csv')
      .then((res) => res.text())
      .then((data) => setRawCsvText(data))
      .catch(() => {
        // Fallback without column 2
        setRawCsvText(
          'Total gear ratio;;\n;;\nPinion;5;8\nGear;40;35\nTire size mm;16,5;16,5\n;;\nTotal in mm;6,47625;11,84228571'
        );
      });
  }, []);

  const csvColumns = [
    {
      colId: 1,
      title: t.csvCol1Title,
      pinion: 5,
      gear: 40,
      tireMm: 16.5,
      rolloutMm: 6.47625,
      formulaNote: '(3,14 × 16,5 × 5) ÷ 40',
      description: t.csvCol1Desc,
    },
    {
      colId: 3,
      title: t.csvCol3Title,
      pinion: 8,
      gear: 35,
      tireMm: 16.5,
      rolloutMm: 11.84228571,
      formulaNote: '(3,14 × 16,5 × 8) ÷ 35',
      description: t.csvCol3Desc,
    },
  ];

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-amber-500" />
            {t.csvHeading}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {t.csvSubtitle}
          </p>
        </div>

        <a
          href="/assets/aistudio/gearratio_b60bc774.csv"
          download="gearratio.csv"
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-lg transition-colors border border-slate-300 dark:border-slate-700"
        >
          <Download className="w-3.5 h-3.5 text-amber-500" />
          {t.csvDownload}
        </a>
      </div>

      {/* Structured Card Grid for the remaining 2 columns in the user's CSV */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {csvColumns.map((col) => (
          <div
            key={col.colId}
            className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 flex flex-col justify-between space-y-3"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  {col.title}
                </span>
                <span className="text-[11px] font-mono text-amber-600 dark:text-amber-400">
                  {col.rolloutMm.toFixed(3)} mm
                </span>
              </div>

              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-200 dark:border-slate-800">
                  <span className="text-slate-500">{t.csvPinion}</span>
                  <span className="font-bold text-slate-900 dark:text-white font-mono">{col.pinion}T</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200 dark:border-slate-800">
                  <span className="text-slate-500">{t.csvGear}</span>
                  <span className="font-bold text-slate-900 dark:text-white font-mono">{col.gear}T</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200 dark:border-slate-800">
                  <span className="text-slate-500">{t.csvTireSize}</span>
                  <span className="font-bold text-slate-900 dark:text-white font-mono">{col.tireMm.toString().replace('.', ',')} mm</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500 font-semibold">{t.csvTotal}</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                    {col.rolloutMm.toString().replace('.', ',')}
                  </span>
                </div>
              </div>

              <div className="pt-2 text-[11px] text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 p-2 rounded border border-slate-200 dark:border-slate-800 font-mono">
                {col.formulaNote} = {col.rolloutMm}
              </div>

              <p className="text-[11px] text-slate-600 dark:text-slate-400">
                {col.description}
              </p>
            </div>

            <button
              onClick={() =>
                onLoadSetup({
                  pinionTeeth: col.pinion,
                  gearTeeth: col.gear,
                  tireDiameterMm: col.tireMm,
                })
              }
              className="w-full mt-2 py-2 px-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-xs"
            >
              <Calculator className="w-3.5 h-3.5" />
              {t.csvLoadButton}
            </button>
          </div>
        ))}
      </div>

      {/* Raw CSV Preview Box */}
      <div className="space-y-1.5 pt-2 border-t border-slate-200 dark:border-slate-800">
        <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
          {t.csvRawTitle}
        </span>
        <pre className="p-3 bg-slate-950 text-slate-300 font-mono text-xs rounded-xl overflow-x-auto border border-slate-800 selection:bg-amber-500/30">
          {rawCsvText || '...'}
        </pre>
      </div>
    </div>
  );
};

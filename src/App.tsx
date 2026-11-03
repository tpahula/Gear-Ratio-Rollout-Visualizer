import React, { useState, useEffect, useMemo } from 'react';
import { Header } from './components/Header';
import { GearVisualizer } from './components/GearVisualizer';
import { GearControls } from './components/GearControls';
import { MetricsDisplay } from './components/MetricsDisplay';
import { TireDiameterImpact } from './components/TireDiameterImpact';
import { GearMatrixTable } from './components/GearMatrixTable';
import { GearSetup } from './types/gears';
import { calculateGearMetrics, PRESETS } from './utils/gearMath';
import { Language, translations } from './i18n/translations';

export default function App() {
  // Language state: 'en' (English, default) or 'fi' (Finnish)
  const [lang, setLang] = useState<Language>('en');
  const t = translations[lang];

  // Theme state
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return document.documentElement.classList.contains('dark');
    }
    return true;
  });

  // Active section for navigation
  const [activeSection, setActiveSection] = useState<string>('simulator');

  // Core Gear Setup (Default: Pinion 5, Gear 40, Tire 16.5 mm, Pitch 72P, Axle 3/32", Motor Ø 14.0 mm, Offset 0.0 mm)
  const [setup, setSetup] = useState<GearSetup>({
    pinionTeeth: 5,
    gearTeeth: 40,
    tireDiameterMm: 16.5,
    motorRpm: 20000,
    pitch: 72,
    axleSize: '3/32',
    pinionShaftDiaMm: 1.5,
    motorDiameterMm: 14.0,
    motorOffsetMm: 0.0,
    gearMeshClearanceMm: 0.2,
    lockAxleHeight86: true,
    lockedChassisMm: 8.6,
    axleHeightLockRef: 'top',
  });

  // Calculate metrics reactively
  const metrics = useMemo(() => {
    return calculateGearMetrics(setup);
  }, [setup]);

  // Handle theme toggle
  const handleToggleTheme = () => {
    const nextDark = !isDark;
    setIsDark(nextDark);
    if (nextDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  // Handle language toggle
  const handleToggleLang = () => {
    setLang((prev) => (prev === 'fi' ? 'en' : 'fi'));
  };

  // Sync html lang attribute and document title
  useEffect(() => {
    document.documentElement.lang = lang;
    document.title =
      lang === 'en'
        ? 'Gear Ratio & Rollout Calculator'
        : 'Hammasvälitys ja Etenemälaskuri';
  }, [lang]);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  // Handle setting updates
  const handleUpdateSetup = (updated: Partial<GearSetup>) => {
    setSetup((prev) => {
      const next = { ...prev, ...updated };
      // 2.0mm shaft for 64p pinions, 1.5mm shaft for 72p and 80p pinions
      if (updated.pitch !== undefined && updated.pinionShaftDiaMm === undefined) {
        next.pinionShaftDiaMm = updated.pitch === 64 ? 2.0 : 1.5;
      }
      return next;
    });
  };

  // Load preset
  const handleSelectPreset = (presetId: string) => {
    const preset = PRESETS.find((p) => p.id === presetId);
    if (preset) {
      setSetup((prev) => ({
        ...prev,
        pinionTeeth: preset.pinionTeeth,
        gearTeeth: preset.gearTeeth,
        tireDiameterMm: preset.tireDiameterMm,
        motorRpm: preset.motorRpm,
      }));
    }
  };

  // Reset to default
  const handleReset = () => {
    setSetup({
      pinionTeeth: 5,
      gearTeeth: 40,
      tireDiameterMm: 16.5,
      motorRpm: 20000,
      pitch: 72,
      axleSize: '3/32',
      pinionShaftDiaMm: 1.5,
      motorDiameterMm: 14.0,
      motorOffsetMm: 0.0,
      gearMeshClearanceMm: 0.2,
      lockAxleHeight86: true,
      lockedChassisMm: 8.6,
      axleHeightLockRef: 'top',
    });
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200">
      {/* Top Bar Contract compliant Header with Language Toggle */}
      <Header
        lang={lang}
        onToggleLang={handleToggleLang}
        isDark={isDark}
        onToggleTheme={handleToggleTheme}
        onReset={handleReset}
        activeSection={activeSection}
        onSelectSection={(id) => {
          setActiveSection(id);
          const el = document.getElementById(id);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth' });
          }
        }}
      />

      {/* Main Content Container (Baseline desktop 1440px width structure) */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">
        {/* Hero Section Banner */}
        <section className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-950 dark:text-white">
                {t.heroTitle}
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-3xl">
                {t.heroSubtitle}
              </p>
            </div>

            {/* Quick stats unboxed metadata */}
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-mono">
              <span>{t.metaMotor}: {setup.pinionTeeth}T</span>
              <span aria-hidden="true">·</span>
              <span>{t.metaSpur}: {setup.gearTeeth}T</span>
              <span aria-hidden="true">·</span>
              <span>{t.metaTire}: {setup.tireDiameterMm} mm</span>
              <span aria-hidden="true">·</span>
              <span className="text-amber-500 font-bold">{metrics.rolloutMm.toFixed(3)} {t.metaPerRev}</span>
            </div>
          </div>
        </section>

        {/* Section 1: Interactive Simulation & Primary Controls (2-Zone Sandbox Layout) */}
        <section id="simulator" className="space-y-6 scroll-mt-20">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Zone: 2D Interactive Stage (7 Cols) */}
            <div className="lg:col-span-7 space-y-4">
              <GearVisualizer
                setup={setup}
                metrics={metrics}
                lang={lang}
                onChangePitch={(pitch) => handleUpdateSetup({ pitch })}
                onChangeAxleSize={(axleSize) => handleUpdateSetup({ axleSize })}
                onChangeMotorOffset={(motorOffsetMm) => handleUpdateSetup({ motorOffsetMm })}
                onChangeMeshClearance={(gearMeshClearanceMm) => handleUpdateSetup({ gearMeshClearanceMm })}
                onToggleLockAxleHeight={(lockAxleHeight86) => handleUpdateSetup({ lockAxleHeight86 })}
              />
            </div>

            {/* Right Zone: Controls & Parameters Deck (5 Cols) */}
            <div className="lg:col-span-5 space-y-4">
              <GearControls
                setup={setup}
                onChange={handleUpdateSetup}
                onSelectPreset={handleSelectPreset}
                lang={lang}
              />
            </div>
          </div>

          {/* Key Metrics Dashboard below visualizer */}
          <MetricsDisplay setup={setup} metrics={metrics} lang={lang} />
        </section>

        {/* Section 2: Dedicated Tire Diameter Impact Analysis (Addressing User's Core Query) */}
        <section id="tire-impact" className="scroll-mt-20">
          <TireDiameterImpact
            setup={setup}
            onApplyGearPair={(pinion, gear) => {
              handleUpdateSetup({ pinionTeeth: pinion, gearTeeth: gear });
            }}
            onSetTireDiameter={(diameter) => {
              handleUpdateSetup({ tireDiameterMm: diameter });
            }}
            lang={lang}
          />
        </section>

        {/* Section 3: Interactive Gear & Rollout Matrix */}
        <section id="matrix" className="scroll-mt-20">
          <GearMatrixTable
            setup={setup}
            onSelectGearPair={(pinion, gear) => {
              handleUpdateSetup({ pinionTeeth: pinion, gearTeeth: gear });
            }}
            lang={lang}
          />
        </section>
      </main>

      {/* Clean Engineering Footer */}
      <footer className="w-full border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 py-6 mt-12 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-500 dark:text-slate-400">
          <div>
            <span className="font-semibold text-slate-800 dark:text-slate-200">{t.footerTitle}</span>
            <span className="mx-2">·</span>
            <span>{t.footerFormula}</span>
          </div>

          <div className="flex items-center gap-4">
            <span className="font-mono">
              {t.footerPi.replace('{pi}', Math.PI.toFixed(8))}
            </span>
            <span>·</span>
            <span>{t.footerTagline}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

import React from 'react';
import { Cog, Moon, Sun, RotateCcw, Globe } from 'lucide-react';
import { Language, translations } from '../i18n/translations';

interface HeaderProps {
  lang: Language;
  onToggleLang: () => void;
  isDark: boolean;
  onToggleTheme: () => void;
  onReset: () => void;
  activeSection: string;
  onSelectSection: (sectionId: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  lang,
  onToggleLang,
  isDark,
  onToggleTheme,
  onReset,
  activeSection,
  onSelectSection,
}) => {
  const t = translations[lang];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-950/90 backdrop-blur-md px-4 sm:px-8 py-3.5 flex items-center justify-between gap-8 transition-colors">
      {/* Zone 1: Single text wordmark */}
      <a
        href="#"
        onClick={(e) => {
          e.preventDefault();
          onSelectSection('simulator');
        }}
        className="flex items-center gap-2.5 text-slate-900 dark:text-white font-bold text-lg tracking-tight whitespace-nowrap shrink-0 hover:opacity-90 transition-opacity"
      >
        <span className="p-1.5 rounded-lg bg-amber-500/10 text-amber-500 border border-amber-500/20">
          <Cog className="w-5 h-5 animate-[spin_20s_linear_infinite]" />
        </span>
        <span>{t.appTitle}</span>
      </a>

      {/* Zone 2: Clean single-line text navigation links */}
      <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600 dark:text-slate-400">
        <button
          onClick={() => onSelectSection('simulator')}
          className={`whitespace-nowrap shrink-0 transition-colors ${
            activeSection === 'simulator'
              ? 'text-amber-500 font-semibold'
              : 'hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          {t.navSimulator}
        </button>
        <button
          onClick={() => onSelectSection('model-3d')}
          className={`whitespace-nowrap shrink-0 transition-colors ${
            activeSection === 'model-3d'
              ? 'text-amber-500 font-semibold'
              : 'hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          {t.navModel3D}
        </button>
        <button
          onClick={() => onSelectSection('tire-impact')}
          className={`whitespace-nowrap shrink-0 transition-colors ${
            activeSection === 'tire-impact'
              ? 'text-amber-500 font-semibold'
              : 'hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          {t.navTireImpact}
        </button>
        <button
          onClick={() => onSelectSection('matrix')}
          className={`whitespace-nowrap shrink-0 transition-colors ${
            activeSection === 'matrix'
              ? 'text-amber-500 font-semibold'
              : 'hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          {t.navMatrix}
        </button>
      </nav>

      {/* Zone 3: Primary action & utility controls */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Language selector toggle button */}
        <button
          onClick={onToggleLang}
          title={lang === 'fi' ? 'Switch to English' : 'Vaihda suomeksi'}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg transition-colors whitespace-nowrap shrink-0"
        >
          <Globe className="w-3.5 h-3.5 text-amber-500" />
          <span>{lang === 'fi' ? 'FI / EN' : 'EN / FI'}</span>
        </button>

        <button
          onClick={onReset}
          title={t.resetTooltip}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap shrink-0"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">{t.reset}</span>
        </button>

        <button
          onClick={onToggleTheme}
          title={isDark ? t.themeLightTooltip : t.themeDarkTooltip}
          className="p-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors shrink-0"
          aria-label="Vaihda teemaa"
        >
          {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
        </button>
      </div>
    </header>
  );
};

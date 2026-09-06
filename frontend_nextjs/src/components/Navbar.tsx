'use client';

import React, { useState, useEffect } from 'react';
import { 
  Satellite, 
  Layers, 
  Cpu, 
  Activity, 
  ShieldCheck, 
  Flame, 
  Truck, 
  RefreshCw,
  Compass,
  Box,
  Mountain
} from 'lucide-react';

interface NavbarProps {
  activeView: 'exploration' | 'operations' | 'training';
  setActiveView: (view: 'exploration' | 'operations' | 'training') => void;
  activeLayersCount: number;
  aiHeatmapActive: boolean;
  onResetMap?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeView,
  setActiveView,
  activeLayersCount,
  aiHeatmapActive,
  onResetMap
}) => {
  const [time, setTime] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour12: false }) + ' IST');
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="h-16 bg-[#090d16]/95 border-b border-slate-800/80 px-4 sm:px-6 flex items-center justify-between z-40 backdrop-blur-md select-none shrink-0 shadow-lg shadow-black/40">
      {/* Brand & Title */}
      <div className="flex items-center gap-3">
        <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-600 via-teal-700 to-emerald-900 border border-emerald-500/40 shadow-md shadow-emerald-950/60 group">
          <Layers className="w-5 h-5 text-emerald-100 group-hover:scale-110 transition-transform" />
          <span className="absolute -top-1 -right-1 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
          </span>
        </div>

        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base sm:text-lg font-bold tracking-tight text-white flex items-center gap-2">
              <span className="bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
                MOIL AI
              </span>
              <span className="text-emerald-400 font-mono text-xs px-1.5 py-0.5 rounded border border-emerald-500/30 bg-emerald-950/40 hidden sm:inline-block">
                GEO-CORE v2.4
              </span>
            </h1>
            <span className="text-slate-600">|</span>
            <span className="text-xs sm:text-sm font-medium text-slate-300 hidden md:inline-block">
              Geo-Spatial Reserve Explorer
            </span>
          </div>
          <p className="text-[11px] text-slate-400 hidden sm:block">
            Autonomous Earth Observation & ML Mineral Prospecting • Manganese Ore India Ltd.
          </p>
        </div>
      </div>

      {/* Center View Mode Switcher (Unified 4 Enterprise Pillars) */}
      <div className="flex items-center bg-slate-900/90 p-1 rounded-xl border border-slate-800 shadow-inner">
        <button
          onClick={() => setActiveView('exploration')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
            activeView === 'exploration'
              ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-900/40 border border-emerald-400/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <Satellite className="w-3.5 h-3.5" />
          <span>2D Satellite GIS</span>
          {aiHeatmapActive && (
            <span className="inline-flex items-center justify-center px-1.5 py-0.2 rounded-full text-[9px] bg-red-500/20 text-red-300 border border-red-500/30 font-mono animate-pulse">
              AI LIVE
            </span>
          )}
        </button>


        <button
          onClick={() => setActiveView('operations')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
            activeView === 'operations'
              ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-md shadow-amber-900/40 border border-amber-400/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <Truck className="w-3.5 h-3.5" />
          <span>Equipment & AI Scheduling</span>
          <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-amber-950 text-amber-300 border border-amber-500/30">
            PS 26009
          </span>
        </button>

        <button
          onClick={() => setActiveView('training')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
            activeView === 'training'
              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-900/40 border border-blue-400/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <Cpu className="w-3.5 h-3.5" />
          <span>AI Studio</span>
          <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-blue-950 text-blue-300 border border-blue-500/30">
            GEE
          </span>
        </button>
      </div>

      {/* Right Telemetry & Status Badges */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Reset Extent Button */}
        {activeView === 'exploration' && onResetMap && (
          <button
            onClick={onResetMap}
            title="Recenter Map to MOIL Manganese Belt"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 text-slate-300 border border-slate-700/60 text-xs transition-colors"
          >
            <Compass className="w-3.5 h-3.5 text-teal-400" />
            <span className="hidden lg:inline">Recenter Belt</span>
          </button>
        )}

        {/* Satellite Sync Pill */}
        <div className="hidden xl:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900/70 border border-slate-800 text-xs text-slate-300">
          <Satellite className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
          <span className="font-mono text-slate-400 text-[11px]">Sentinel-2 / Landsat-9:</span>
          <span className="text-emerald-400 font-medium">99.8% Sync</span>
        </div>

        {/* Live Clock */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900/90 border border-slate-800/80 font-mono text-xs text-emerald-300">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>{time || 'LIVE'}</span>
        </div>
      </div>
    </header>
  );
};

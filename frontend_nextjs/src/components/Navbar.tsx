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
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] flex items-center bg-slate-900/90 p-1.5 rounded-2xl border border-slate-700/80 shadow-2xl backdrop-blur-xl">

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


    </div>
  );
};

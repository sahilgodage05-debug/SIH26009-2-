'use client';

import React, { useState } from 'react';
import { Navbar } from '@/components/Navbar';
import { RemoteSensingSidebar } from '@/components/RemoteSensingSidebar';
import { MapWrapper } from '@/components/MapWrapper';
import { ConfidenceInspector } from '@/components/ConfidenceInspector';
import { MLTrainingStudio } from '@/components/MLTrainingStudio';
import { RESERVE_ZONES } from '@/data/moilData';
import { LayerState, ReserveZone } from '@/types/moil';
import { Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();
  const [activeView, setActiveView] = useState<'exploration' | 'training'>('exploration');
  const [layers, setLayers] = useState<LayerState>({
    ndvi: true,
    soilMoisture: true,
    landTemperature: false,
    historicalDrilling: true,
    aiHeatmap: true,
    radarPrecipitation: false,
    structuralFaults: true,
  });

  const [selectedZone, setSelectedZone] = useState<ReserveZone | null>(RESERVE_ZONES[0]);
  const [isInspectorOpen, setIsInspectorOpen] = useState<boolean>(false);
  const [confidenceThreshold, setConfidenceThreshold] = useState<number>(75);
  const [isGeneratingAI, setIsGeneratingAI] = useState<boolean>(false);
  const [notification, setNotification] = useState<string | null>(null);

  // Metal-Stressed Vegetation (MSV) Integrated Controls State
  const [msvOpacity, setMsvOpacity] = useState<number>(0.65);
  const [msvAnomalyScore, setMsvAnomalyScore] = useState<number>(1.8);
  const [msvClipOutOfRange, setMsvClipOutOfRange] = useState<boolean>(true);
  const [msvRasterMode, setMsvRasterMode] = useState<string>('chlorosis_zscore');

  // Trigger AI Manganese Heatmap Generation Simulation
  const handleGenerateAIHeatmap = () => {
    if (layers.aiHeatmap) {
      setLayers(prev => ({ ...prev, aiHeatmap: false }));
      setNotification('AI Heatmap overlay deactivated.');
      setTimeout(() => setNotification(null), 3000);
      return;
    }

    setIsGeneratingAI(true);
    setNotification('Synthesizing Sentinel-2 L2A + Landsat-9 TIR + Bouguer Gravity data...');

    setTimeout(() => {
      setLayers(prev => ({
        ...prev,
        aiHeatmap: true,
        ndvi: true,
        soilMoisture: true
      }));
      setIsGeneratingAI(false);
      setNotification('AI Manganese Heatmap generated! Identified 4 high-probability reserve clusters (>75% Mn).');
      setTimeout(() => setNotification(null), 5000);
    }, 1200);
  };

  const handleSelectZone = (zone: ReserveZone) => {
    setSelectedZone(zone);
    router.push(`/mine/${zone.id}`);
  };

  const handleResetMap = () => {
    setSelectedZone(RESERVE_ZONES[0]);
    setIsInspectorOpen(false);
    setNotification('Recenter map view to Central India Manganese Belt.');
    setTimeout(() => setNotification(null), 3000);
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#090d16] select-none">
      {/* 1. Top Navbar with Unified 4 Enterprise Pillars */}
      <Navbar
        activeView={activeView}
        setActiveView={setActiveView}
        activeLayersCount={Object.values(layers).filter(Boolean).length}
        aiHeatmapActive={layers.aiHeatmap}
        onResetMap={handleResetMap}
      />

      {/* Floating System Notification Toast */}
      {notification && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[1000] px-4 py-2.5 rounded-xl bg-slate-900/95 border border-emerald-500/40 text-xs text-white shadow-2xl backdrop-blur-md flex items-center gap-2.5 animate-in fade-in slide-in-from-top-4">
          <Sparkles className="w-4 h-4 text-emerald-400 shrink-0 animate-pulse" />
          <span className="font-medium">{notification}</span>
        </div>
      )}

      {/* 2. Body Workspace: Seamlessly Switch Between Unified Views */}
      {activeView === 'exploration' ? (
        <div className="relative flex-1 flex h-screen overflow-hidden">
          {/* Center Main Leaflet GIS Map (Clean & Unobstructed) */}
          <main className="relative flex-1 h-full bg-[#070b12] overflow-hidden">
            {/* Floating Generate AI Heatmap Button */}
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-[500]">
              <button
                onClick={handleGenerateAIHeatmap}
                disabled={isGeneratingAI}
                className={`flex items-center justify-center gap-2 px-6 py-3 rounded-full text-sm font-bold text-white shadow-2xl transition-all ${
                  isGeneratingAI 
                    ? 'bg-slate-700 cursor-not-allowed opacity-80' 
                    : layers.aiHeatmap 
                      ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-900/50' 
                      : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900/50 hover:scale-105'
                }`}
              >
                {isGeneratingAI ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Synthesizing ML...
                  </>
                ) : layers.aiHeatmap ? (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Disable AI Heatmap
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Generate AI Heatmap
                  </>
                )}
              </button>
            </div>
            <MapWrapper
              layers={layers}
              selectedZone={selectedZone}
              onSelectZone={handleSelectZone}
              confidenceThreshold={confidenceThreshold}
              msvOpacity={msvOpacity}
            />

            {/* Reopen Inspector Button if closed and zone is selected */}
            {!isInspectorOpen && selectedZone && (
              <button
                onClick={() => router.push(`/mine/${selectedZone.id}`)}
                className="absolute top-4 right-4 z-[500] flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-emerald-400 border border-emerald-500/40 shadow-xl backdrop-blur-md text-xs font-semibold transition-all hover:scale-105"
              >
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <span>Inspect Zone: {selectedZone.name.split(' ')[0]}</span>
              </button>
            )}
          </main>

            {/* Draggable Inspector Widget for Deep Analysis removed as it is now on a separate page */}</div>
      ) : (
        /* Synthetic Ground Truth & GEE AI Studio */
        <MLTrainingStudio />
      )}
    </div>
  );
}

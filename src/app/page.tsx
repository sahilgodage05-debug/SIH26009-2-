'use client';

import React, { useState } from 'react';
import { Navbar } from '@/components/Navbar';
import { RemoteSensingSidebar } from '@/components/RemoteSensingSidebar';
import { MapWrapper } from '@/components/MapWrapper';
import { ConfidenceInspector } from '@/components/ConfidenceInspector';
import { OperationsControlRoom } from '@/components/OperationsControlRoom';
import { MLTrainingStudio } from '@/components/MLTrainingStudio';
import { RESERVE_ZONES } from '@/data/moilData';
import { LayerState, ReserveZone } from '@/types/moil';
import { Sparkles } from 'lucide-react';

export default function Home() {
  const [activeView, setActiveView] = useState<'exploration' | 'operations' | 'training'>('exploration');
  const [layers, setLayers] = useState<LayerState>({
    ndvi: true,
    soilMoisture: true,
    landTemperature: false,
    historicalDrilling: true,
    aiHeatmap: false,
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
    setIsInspectorOpen(true);
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
        <div className="relative flex-1 flex h-[calc(100vh-64px)] overflow-hidden">
          {/* Geospatial Intelligence Sidebar (Includes integrated SAM & MSV controls) */}
          <RemoteSensingSidebar
            layers={layers}
            setLayers={setLayers}
            isGeneratingAI={isGeneratingAI}
            onGenerateAIHeatmap={handleGenerateAIHeatmap}
            msvOpacity={msvOpacity}
            setMsvOpacity={setMsvOpacity}
            msvAnomalyScore={msvAnomalyScore}
            setMsvAnomalyScore={setMsvAnomalyScore}
            msvClipOutOfRange={msvClipOutOfRange}
            setMsvClipOutOfRange={setMsvClipOutOfRange}
            msvRasterMode={msvRasterMode}
            setMsvRasterMode={setMsvRasterMode}
          />

          {/* Center Main Leaflet GIS Map (Clean & Unobstructed) */}
          <main className="relative flex-1 h-full bg-[#070b12] overflow-hidden">
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
                onClick={() => setIsInspectorOpen(true)}
                className="absolute top-4 right-4 z-[500] flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-emerald-400 border border-emerald-500/40 shadow-xl backdrop-blur-md text-xs font-semibold transition-all hover:scale-105"
              >
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <span>Inspect Zone: {selectedZone.name.split(' ')[0]}</span>
              </button>
            )}
          </main>

          {/* Right Sliding Panel: Deposit Dossier */}
          <ConfidenceInspector
            zone={selectedZone}
            isOpen={isInspectorOpen}
            onClose={() => setIsInspectorOpen(false)}
          />
        </div>
      ) : activeView === 'operations' ? (
        /* Operations Room & Problem Statement 26009 Command Dashboard */
        <OperationsControlRoom 
          onOpen2DMap={() => setActiveView('exploration')}
        />
      ) : (
        /* Synthetic Ground Truth & GEE AI Studio */
        <MLTrainingStudio />
      )}
    </div>
  );
}

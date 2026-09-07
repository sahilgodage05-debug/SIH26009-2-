'use client';

import React, { useState } from 'react';
import { 
  ChevronDown, 
  ChevronRight, 
  Satellite, 
  Sparkles, 
  Layers, 
  Eye, 
  Download, 
  Sprout, 
  Cpu, 
  Sliders, 
  Activity, 
  CheckCircle2,
  Filter
} from 'lucide-react';
import { LayerState } from '@/types/moil';

interface MineralEndmember {
  id: string;
  name: string;
  formula: string;
  band: string;
  active: boolean;
  confidence: number;
}

interface RemoteSensingSidebarProps {
  layers: LayerState;
  setLayers: React.Dispatch<React.SetStateAction<LayerState>>;
  isGeneratingAI: boolean;
  onGenerateAIHeatmap: () => void;
  // MSV Controls
  msvOpacity: number;
  setMsvOpacity: (val: number) => void;
  msvAnomalyScore: number;
  setMsvAnomalyScore: (val: number) => void;
  msvClipOutOfRange: boolean;
  setMsvClipOutOfRange: (val: boolean) => void;
  msvRasterMode: string;
  setMsvRasterMode: (val: string) => void;
}

export const RemoteSensingSidebar: React.FC<RemoteSensingSidebarProps> = ({
  layers,
  setLayers,
  isGeneratingAI,
  onGenerateAIHeatmap,
  msvOpacity,
  setMsvOpacity,
  msvAnomalyScore,
  setMsvAnomalyScore,
  msvClipOutOfRange,
  setMsvClipOutOfRange,
  msvRasterMode,
  setMsvRasterMode
}) => {
  // Accordion open states
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    sam_sff: false,
    indices: false,
    bare_earth: false,
    msv: true,
    sentinel_predictor: true,
    lineaments: false,
    layers_quick: true
  });

  // SAM Minerals State
  const [minerals, setMinerals] = useState<MineralEndmember[]>([
    { id: 'calcite', name: 'Calcite', formula: 'CaCO₃', band: 'SWIR 2.33µm', active: true, confidence: 91 },
    { id: 'quartz', name: 'Quartz', formula: 'SiO₂', band: 'TIR 8.65µm', active: false, confidence: 84 },
    { id: 'illite', name: 'Illite', formula: 'K,Al-silicate', band: 'SWIR 2.20µm', active: true, confidence: 88 },
    { id: 'kaolinite', name: 'Kaolinite', formula: 'Al₂Si₂O₅(OH)₄', band: 'SWIR 2.16µm', active: true, confidence: 94 },
    { id: 'gypsum', name: 'Gypsum', formula: 'CaSO₄·2H₂O', band: 'SWIR 1.75µm', active: false, confidence: 76 },
    { id: 'montmorillonite', name: 'Montmorillonite', formula: '(Na,Ca)Al-clay', band: 'SWIR 2.21µm', active: false, confidence: 82 },
    { id: 'goethite', name: 'Goethite', formula: 'FeO(OH)', band: 'VNIR 0.90µm', active: true, confidence: 96 },
    { id: 'chlorite', name: 'Chlorite', formula: '(Mg,Fe)Al-silicate', band: 'SWIR 2.25µm', active: false, confidence: 79 },
  ]);

  const [spectralAngleTolerance, setSpectralAngleTolerance] = useState<number>(0.12);
  const [downloadNotice, setDownloadNotice] = useState<string | null>(null);

  // Sentinel Ecosystem Parameters State
  const [s2Ndvi, setS2Ndvi] = useState<number>(0.32);
  const [s2SwirRatio, setS2SwirRatio] = useState<number>(2.15);
  const [s1SarVv, setS1SarVv] = useState<number>(-12.5);
  const [s1SoilMoisture, setS1SoilMoisture] = useState<number>(45.0);
  const [s3LstAnomaly, setS3LstAnomaly] = useState<number>(2.8);
  const [era5MonsoonRain, setEra5MonsoonRain] = useState<number>(1150.0);

  const sentinelPred = (() => {
    const baseGrade = 8.5;
    const deltaSpectral = Math.min(22.0, Math.max(0, (s2SwirRatio - 1.0)) * 11.5 + (s2Ndvi < 0.50 ? (0.50 - s2Ndvi) * 8.0 : 0));
    const deltaSar = Math.min(14.0, Math.max(0, (s1SarVv - (-18.0))) * 1.4 + Math.max(0, (s1SoilMoisture - 20.0)) * 0.18);
    const deltaThermal = Math.min(10.0, Math.max(0, s3LstAnomaly) * 3.6);
    const deltaSupergene = Math.min(8.0, (Math.max(0, era5MonsoonRain - 750.0) / 150.0) * (4.2 / 3.0) * 1.8);
    
    const mnPercent = Math.min(51.5, Math.max(5.0, baseGrade + deltaSpectral + deltaSar + deltaThermal + deltaSupergene));
    
    let classification = "Low-Grade Ferromanganese Ore";
    let gradeCode = "LOW";
    if (mnPercent >= 44.0) {
      classification = "High-Grade Metallurgical Pyrolusite (>44% Mn)";
      gradeCode = "HIGH";
    } else if (mnPercent >= 30.0) {
      classification = "Medium-Grade Siliceous Braunite (30-44% Mn)";
      gradeCode = "MEDIUM";
    }

    const bulkDensity = Math.min(4.65, Math.max(3.2, 3.1 + (mnPercent / 100.0) * 2.8));
    const inferredVolume = 45000.0 * 65.0 * 0.68;
    const rawTonnage = inferredVolume * bulkDensity;
    const weightedTonnage = rawTonnage * 0.85;
    const metalTonnage = weightedTonnage * (mnPercent / 100.0);

    return {
      mnPercent: Math.round(mnPercent * 10) / 10,
      classification,
      gradeCode,
      bulkDensity: Math.round(bulkDensity * 100) / 100,
      rawTonnage: Math.round(rawTonnage),
      weightedTonnage: Math.round(weightedTonnage),
      metalTonnage: Math.round(metalTonnage),
      breakdown: {
        spectral: Math.round(deltaSpectral * 10) / 10,
        sar: Math.round(deltaSar * 10) / 10,
        thermal: Math.round(deltaThermal * 10) / 10,
        supergene: Math.round(deltaSupergene * 10) / 10
      }
    };
  })();

  const toggleMineral = (id: string) => {
    setMinerals(prev => prev.map(m => m.id === id ? { ...m, active: !m.active } : m));
  };

  const handleDownloadGeoTIFF = (mineralName: string) => {
    setDownloadNotice(`Exporting GeoTIFF for ${mineralName}...`);
    setTimeout(() => {
      setDownloadNotice(`Exported ${mineralName}_SAM_Mask.tif`);
      setTimeout(() => setDownloadNotice(null), 3000);
    }, 1000);
  };

  const toggleSection = (key: string) => {
    setOpenSections(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const toggleLayer = (key: keyof LayerState) => {
    setLayers(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const rasterModes = [
    { id: 'chlorosis_zscore', name: 'Chlorosis Anomaly Z-Score' },
    { id: 'rededge_nir', name: 'Sentinel-2 RedEdge-3 / NIR' },
    { id: 'canopy_stress', name: 'Normalized Canopy Stress (NCSI)' },
    { id: 're_ndvi', name: 'Red-Edge NDVI (B8A - B5)' },
    { id: 'water_content', name: 'Canopy Water Deficit (B11/B8)' }
  ];

  return (
    <aside className="w-[340px] bg-slate-50/98 border-r border-slate-200/90 flex flex-col h-full z-30 shrink-0 backdrop-blur-xl select-none">
      {/* Sidebar Header & Enterprise Remote Sensing Branding */}
      <div className="p-4 border-b border-slate-200/80 bg-white/40">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-mono font-bold tracking-widest text-emerald-400 uppercase bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30">
            GEOSPATIAL INTELLIGENCE
          </span>
          <span className="text-[10px] font-mono text-slate-600 flex items-center gap-1">
            <Satellite className="w-3 h-3 text-cyan-400 animate-pulse" />
            ASTER / S-2
          </span>
        </div>

        <h2 className="text-sm font-extrabold text-slate-900 tracking-tight uppercase">
          Remote Sensing & Spectral
        </h2>

        <p className="text-[11px] text-slate-600 mt-1.5 leading-relaxed">
          Reflected optical & radar spectra across dozens of satellite bands reveal subsurface mineralization.
        </p>

        {/* Generate AI Manganese Heatmap CTA */}
        <div className="mt-3.5">
          <button
            onClick={onGenerateAIHeatmap}
            disabled={isGeneratingAI}
            className={`w-full relative group overflow-hidden rounded-xl p-2.5 text-left transition-all duration-300 ${
              layers.aiHeatmap
                ? 'bg-gradient-to-r from-red-600 via-orange-600 to-amber-600 text-slate-900 shadow-md shadow-orange-950/50 border border-amber-400/40'
                : 'bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-slate-900 shadow-md shadow-emerald-950/40 hover:shadow-emerald-900/60 border border-emerald-400/30'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1 rounded-md bg-black/20">
                  {isGeneratingAI ? (
                    <Cpu className="w-3.5 h-3.5 animate-spin text-slate-900" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5 text-slate-900 animate-pulse" />
                  )}
                </div>
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-900">
                    {layers.aiHeatmap ? 'AI Heatmap Live (>75% Mn)' : 'Generate AI Heatmap'}
                  </div>
                  <div className="text-[9px] text-slate-900/80">
                    {isGeneratingAI ? 'Processing Multi-Bands...' : 'Bayesian Deposit Probability'}
                  </div>
                </div>
              </div>
              <ChevronRight className={`w-3.5 h-3.5 text-slate-900/70 transition-transform ${layers.aiHeatmap ? 'rotate-90' : ''}`} />
            </div>
          </button>
        </div>
      </div>

      {/* Accordion Menu List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
        {/* Accordion Item: Quick Satellite Layer Toggles */}
        <div className="rounded-xl border border-slate-200 bg-slate-50/40 overflow-hidden transition-colors hover:border-slate-300">
          <button
            onClick={() => toggleSection('layers_quick')}
            className="w-full p-3 flex items-center justify-between text-left text-xs font-bold text-slate-800 hover:text-slate-900 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-400" />
              <span>Map Layer Overlays</span>
            </div>
            {openSections.layers_quick ? (
              <ChevronDown className="w-4 h-4 text-emerald-400" />
            ) : (
              <ChevronRight className="w-4 h-4 text-slate-600" />
            )}
          </button>

          {openSections.layers_quick && (
            <div className="p-3 pt-0 border-t border-slate-200/60 space-y-2 text-xs">
              {[
                { key: 'ndvi' as keyof LayerState, label: 'NDVI Vegetation Stress', color: 'bg-emerald-500' },
                { key: 'soilMoisture' as keyof LayerState, label: 'Soil Moisture (SMAP)', color: 'bg-cyan-500' },
                { key: 'landTemperature' as keyof LayerState, label: 'Thermal LST Anomaly', color: 'bg-amber-500' },
                { key: 'historicalDrilling' as keyof LayerState, label: 'Historical Borehole Collars', color: 'bg-blue-500' },
                { key: 'structuralFaults' as keyof LayerState, label: 'Structural Fault Lineaments', color: 'bg-purple-500' }
              ].map(item => (
                <div 
                  key={item.key}
                  onClick={() => toggleLayer(item.key)}
                  className="flex items-center justify-between p-1.5 px-2 rounded-lg bg-white/60 border border-slate-200/60 cursor-pointer hover:border-slate-300"
                >
                  <span className="text-[11px] text-slate-700">{item.label}</span>
                  <div className={`w-7 h-3.5 rounded-full p-0.5 transition-colors ${layers[item.key] ? item.color : 'bg-slate-200'}`}>
                    <div className={`w-2.5 h-2.5 rounded-full bg-white transition-transform ${layers[item.key] ? 'translate-x-3.5' : 'translate-x-0'}`} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Accordion Item: Metal-Stressed Vegetation (MSV) */}
        <div className="rounded-xl border border-slate-200 bg-slate-50/40 overflow-hidden transition-colors hover:border-slate-300">
          <button
            onClick={() => toggleSection('msv')}
            className="w-full p-3 flex items-center justify-between text-left text-xs font-bold text-slate-800 hover:text-slate-900 transition-colors"
          >
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>Metal-Stressed Vegetation (MSV)</span>
            </div>
            {openSections.msv ? (
              <ChevronDown className="w-4 h-4 text-emerald-400" />
            ) : (
              <ChevronRight className="w-4 h-4 text-slate-600" />
            )}
          </button>

          {openSections.msv && (
            <div className="p-3 pt-0 border-t border-slate-200/60 space-y-3 text-xs">
              <p className="text-[10px] text-slate-600 leading-snug">
                Chlorosis and canopy phytotoxicity anomalies induced by heavy metal bio-accumulation over manganese lodes.
              </p>

              {/* Anomaly Score Slider with Color Gradient */}
              <div className="p-2.5 rounded-xl bg-white/60 border border-slate-200 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-700 text-[11px]">Spatial Anomaly Score</span>
                  <span className="font-mono text-[11px] font-bold text-orange-400 bg-orange-950/60 px-1.5 py-0.2 rounded border border-orange-500/30">
                    {msvAnomalyScore.toFixed(1)} σ
                  </span>
                </div>
                <div className="relative py-1">
                  <input
                    type="range"
                    min="1.0"
                    max="3.5"
                    step="0.1"
                    value={msvAnomalyScore}
                    onChange={(e) => setMsvAnomalyScore(parseFloat(e.target.value))}
                    className="w-full h-2 rounded-lg appearance-none cursor-pointer"
                    style={{
                      background: 'linear-gradient(to right, #0284c7 0%, #10b981 35%, #f59e0b 70%, #ef4444 100%)'
                    }}
                  />
                </div>
                <div className="flex justify-between text-[9px] font-mono text-slate-500">
                  <span>1.0σ (Low)</span>
                  <span>2.0σ (Median)</span>
                  <span>3.5σ (Extreme)</span>
                </div>
              </div>

              {/* Raster Mode Selector */}
              <div className="space-y-1">
                <label className="text-[10px] font-medium text-slate-600">Sentinel-2 Algorithm</label>
                <select
                  value={msvRasterMode}
                  onChange={(e) => setMsvRasterMode(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-[11px] text-slate-800 focus:outline-none focus:border-emerald-500"
                >
                  {rasterModes.map(mode => (
                    <option key={mode.id} value={mode.id}>{mode.name}</option>
                  ))}
                </select>
              </div>

              {/* Opacity Slider */}
              <div className="p-2 rounded-lg bg-white/50 border border-slate-200 space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-600">Layer Opacity</span>
                  <span className="font-mono text-emerald-400">{Math.round(msvOpacity * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="1.0"
                  step="0.05"
                  value={msvOpacity}
                  onChange={(e) => setMsvOpacity(parseFloat(e.target.value))}
                  className="w-full h-1 bg-slate-200 rounded-lg accent-emerald-400 cursor-pointer"
                />
              </div>

              {/* Clip Out of Range Checkbox */}
              <label className="flex items-center justify-between p-2 rounded-lg bg-white/50 border border-slate-200 cursor-pointer">
                <span className="text-[11px] text-slate-700">Clip Out-of-Range Background</span>
                <input
                  type="checkbox"
                  checked={msvClipOutOfRange}
                  onChange={(e) => setMsvClipOutOfRange(e.target.checked)}
                  className="w-3.5 h-3.5 accent-emerald-500 rounded cursor-pointer"
                />
              </label>
            </div>
          )}
        </div>

        {/* Accordion Item: Sentinel Ecosystem Manganese Grade & Tonnage Predictor */}
        <div className="rounded-xl border border-emerald-500/40 bg-emerald-950/20 overflow-hidden transition-colors hover:border-emerald-500/60 shadow-lg shadow-emerald-950/30">
          <button
            onClick={() => toggleSection('sentinel_predictor')}
            className="w-full p-3 flex items-center justify-between text-left text-xs font-bold text-emerald-200 hover:text-slate-900 transition-colors"
          >
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Sentinel Ecosystem % Mn & Tonnage Predictor</span>
            </div>
            {openSections.sentinel_predictor ? (
              <ChevronDown className="w-4 h-4 text-emerald-400" />
            ) : (
              <ChevronRight className="w-4 h-4 text-slate-600" />
            )}
          </button>

          {openSections.sentinel_predictor && (
            <div className="p-3 pt-0 border-t border-emerald-800/40 space-y-3 text-xs">
              <p className="text-[10px] text-slate-700 leading-snug">
                Fuses Sentinel-2 (NDVI/SWIR), Sentinel-1 (SAR Backscatter & Soil Moisture), Sentinel-3 (LST Thermal Anomaly), and ERA5-Land Rainfall to predict Manganese Ore Grade (% Mn) and Tonnage.
              </p>

              {/* Live Predictions Display Card */}
              <div className="p-3 rounded-xl bg-white/80 border border-emerald-500/30 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-slate-700">Predicted Mn Grade</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                    sentinelPred.gradeCode === 'HIGH' 
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50' 
                      : sentinelPred.gradeCode === 'MEDIUM' 
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/50' 
                      : 'bg-slate-200 text-slate-600 border-slate-300'
                  }`}>
                    {sentinelPred.gradeCode} GRADE
                  </span>
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-2xl font-black text-emerald-400 font-mono">{sentinelPred.mnPercent}% <span className="text-xs font-normal text-slate-600">Mn</span></span>
                  <span className="text-[10px] text-slate-600 font-mono">Density: {sentinelPred.bulkDensity} t/m³</span>
                </div>
                <p className="text-[10px] text-slate-600 border-t border-slate-200 pt-1.5">{sentinelPred.classification}</p>
                
                {/* Ore Tonnage Estimate */}
                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200/80">
                  <div className="bg-slate-50/80 p-2 rounded-lg border border-slate-200">
                    <div className="text-[9px] text-slate-600">Est. Reserve Tonnage</div>
                    <div className="text-xs font-bold font-mono text-cyan-300">{(sentinelPred.weightedTonnage / 1e6).toFixed(2)}M MT</div>
                  </div>
                  <div className="bg-slate-50/80 p-2 rounded-lg border border-slate-200">
                    <div className="text-[9px] text-slate-600">Recoverable Mn Metal</div>
                    <div className="text-xs font-bold font-mono text-purple-300">{(sentinelPred.metalTonnage / 1e6).toFixed(2)}M MT</div>
                  </div>
                </div>
              </div>

              {/* Parameter Controls */}
              <div className="space-y-2">
                {/* Sentinel-2 NDVI */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] text-slate-700">
                    <span>Sentinel-2 Plant NDVI (Veg Stress)</span>
                    <span className="font-mono text-emerald-400">{s2Ndvi.toFixed(2)}</span>
                  </div>
                  <input
                    type="range" min="0.05" max="0.75" step="0.01"
                    value={s2Ndvi} onChange={(e) => setS2Ndvi(parseFloat(e.target.value))}
                    className="w-full h-1 bg-slate-200 rounded-lg accent-emerald-400 cursor-pointer"
                  />
                </div>

                {/* Sentinel-2 SWIR Pyrolusite Ratio */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] text-slate-700">
                    <span>Sentinel-2 SWIR 2.2µm Ratio (Pyrolusite)</span>
                    <span className="font-mono text-emerald-400">{s2SwirRatio.toFixed(2)}</span>
                  </div>
                  <input
                    type="range" min="1.0" max="3.5" step="0.05"
                    value={s2SwirRatio} onChange={(e) => setS2SwirRatio(parseFloat(e.target.value))}
                    className="w-full h-1 bg-slate-200 rounded-lg accent-emerald-400 cursor-pointer"
                  />
                </div>

                {/* Sentinel-1 SAR Backscatter */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] text-slate-700">
                    <span>Sentinel-1 SAR VV Backscatter σ° (dB)</span>
                    <span className="font-mono text-cyan-400">{s1SarVv.toFixed(1)} dB</span>
                  </div>
                  <input
                    type="range" min="-25.0" max="-5.0" step="0.5"
                    value={s1SarVv} onChange={(e) => setS1SarVv(parseFloat(e.target.value))}
                    className="w-full h-1 bg-slate-200 rounded-lg accent-cyan-400 cursor-pointer"
                  />
                </div>

                {/* Sentinel-1 Soil Moisture */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] text-slate-700">
                    <span>Sentinel-1 Soil Moisture (SSM %)</span>
                    <span className="font-mono text-cyan-400">{s1SoilMoisture.toFixed(0)}%</span>
                  </div>
                  <input
                    type="range" min="10.0" max="80.0" step="1.0"
                    value={s1SoilMoisture} onChange={(e) => setS1SoilMoisture(parseFloat(e.target.value))}
                    className="w-full h-1 bg-slate-200 rounded-lg accent-cyan-400 cursor-pointer"
                  />
                </div>

                {/* Sentinel-3 LST Anomaly */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] text-slate-700">
                    <span>Sentinel-3 Surface Temp Anomaly (LST)</span>
                    <span className="font-mono text-amber-400">+{s3LstAnomaly.toFixed(1)}°C</span>
                  </div>
                  <input
                    type="range" min="0.0" max="5.0" step="0.1"
                    value={s3LstAnomaly} onChange={(e) => setS3LstAnomaly(parseFloat(e.target.value))}
                    className="w-full h-1 bg-slate-200 rounded-lg accent-amber-400 cursor-pointer"
                  />
                </div>

                {/* ERA5 Monsoonal Rain */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] text-slate-700">
                    <span>ERA5 Monsoon Rain (Supergene Leaching)</span>
                    <span className="font-mono text-blue-400">{era5MonsoonRain.toFixed(0)} mm</span>
                  </div>
                  <input
                    type="range" min="500.0" max="2000.0" step="25.0"
                    value={era5MonsoonRain} onChange={(e) => setEra5MonsoonRain(parseFloat(e.target.value))}
                    className="w-full h-1 bg-slate-200 rounded-lg accent-blue-400 cursor-pointer"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Accordion Item: Spectral Mineral Mapping (SAM and SFF) */}
        <div className="rounded-xl border border-slate-200 bg-slate-50/40 overflow-hidden transition-colors hover:border-slate-300">
          <button
            onClick={() => toggleSection('sam_sff')}
            className="w-full p-3 flex items-center justify-between text-left text-xs font-bold text-slate-800 hover:text-slate-900 transition-colors"
          >
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-orange-400" />
              <span>Spectral Mineral Mapping (SAM)</span>
            </div>
            {openSections.sam_sff ? (
              <ChevronDown className="w-4 h-4 text-orange-400" />
            ) : (
              <ChevronRight className="w-4 h-4 text-slate-600" />
            )}
          </button>

          {openSections.sam_sff && (
            <div className="p-3 pt-0 border-t border-slate-200/60 space-y-2.5 text-xs">
              <p className="text-[10px] text-slate-600 leading-snug">
                Spectral Angle Mapper calibrated against USGS laboratory reflectance spectra.
              </p>

              {/* Endmember Pills Grid */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-[10px] text-slate-600 font-medium">
                  <span>Reference Endmembers</span>
                  <span className="text-orange-400 font-mono">
                    {minerals.filter(m => m.active).length}/{minerals.length} active
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-1.5 max-h-[160px] overflow-y-auto pr-1">
                  {minerals.map(mineral => (
                    <button
                      key={mineral.id}
                      onClick={() => toggleMineral(mineral.id)}
                      className={`p-1.5 rounded-lg border text-left transition-all flex flex-col justify-between ${
                        mineral.active
                          ? 'bg-orange-950/40 border-orange-500/50 text-slate-900'
                          : 'bg-white/60 border-slate-200 text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[11px] truncate">{mineral.name}</span>
                        {mineral.active && <div className="w-1.5 h-1.5 rounded-full bg-orange-400 shrink-0" />}
                      </div>
                      <div className="flex justify-between text-[9px] text-slate-600 font-mono mt-0.5">
                        <span>{mineral.band.split(' ')[0]}</span>
                        <span className="text-emerald-400">{mineral.confidence}%</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Spectral Angle Cutoff Slider */}
              <div className="p-2 rounded-lg bg-white/60 border border-slate-200 space-y-1">
                <div className="flex justify-between text-[10px]">
                  <span className="text-slate-600">Angle Cutoff Tolerance</span>
                  <span className="font-mono text-orange-400">{spectralAngleTolerance.toFixed(2)} rad</span>
                </div>
                <input
                  type="range"
                  min="0.05"
                  max="0.30"
                  step="0.01"
                  value={spectralAngleTolerance}
                  onChange={(e) => setSpectralAngleTolerance(parseFloat(e.target.value))}
                  className="w-full h-1 bg-slate-200 rounded-lg accent-orange-400 cursor-pointer"
                />
              </div>

              {/* Export GeoTIFF Button */}
              <button
                onClick={() => handleDownloadGeoTIFF('Calcite_Pyrolusite')}
                className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-800 text-[11px] font-medium transition-colors border border-slate-300/60"
              >
                <Download className="w-3.5 h-3.5 text-orange-400" />
                <span>Export Active Minerals GeoTIFF</span>
              </button>

              {downloadNotice && (
                <div className="p-1.5 rounded bg-emerald-950/60 border border-emerald-500/40 text-[10px] text-emerald-300 text-center font-mono">
                  {downloadNotice}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Accordion Item: Geological Spectral Indices */}
        <div className="rounded-xl border border-slate-200 bg-slate-50/40 overflow-hidden transition-colors hover:border-slate-300">
          <button
            onClick={() => toggleSection('indices')}
            className="w-full p-3 flex items-center justify-between text-left text-xs font-bold text-slate-800 hover:text-slate-900 transition-colors"
          >
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-cyan-400" />
              <span>Geological Spectral Indices</span>
            </div>
            {openSections.indices ? (
              <ChevronDown className="w-4 h-4 text-cyan-400" />
            ) : (
              <ChevronRight className="w-4 h-4 text-slate-600" />
            )}
          </button>

          {openSections.indices && (
            <div className="p-3 pt-0 border-t border-slate-200/60 space-y-2 text-xs">
              <p className="text-[10px] text-slate-600 leading-snug">
                Band ratio indexes for mineral alterations and iron/manganese oxide identification.
              </p>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between p-2 rounded-lg bg-white/60 border border-slate-200 text-[11px]">
                  <span>Ferric Oxide (Fe³⁺) Ratio: B4/B2</span>
                  <span className="font-mono text-emerald-400 font-bold">1.84</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-white/60 border border-slate-200 text-[11px]">
                  <span>Ferrous Silicate Index: B12/B8</span>
                  <span className="font-mono text-cyan-400 font-bold">0.92</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-white/60 border border-slate-200 text-[11px]">
                  <span>Al-OH Hydroxyl Alteration: B7/B6</span>
                  <span className="font-mono text-amber-400 font-bold">2.14</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Accordion Item: Bare Earth Composite */}
        <div className="rounded-xl border border-slate-200 bg-slate-50/40 overflow-hidden transition-colors hover:border-slate-300">
          <button
            onClick={() => toggleSection('bare_earth')}
            className="w-full p-3 flex items-center justify-between text-left text-xs font-bold text-slate-800 hover:text-slate-900 transition-colors"
          >
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-amber-400" />
              <span>Bare Earth Composite</span>
            </div>
            {openSections.bare_earth ? (
              <ChevronDown className="w-4 h-4 text-amber-400" />
            ) : (
              <ChevronRight className="w-4 h-4 text-slate-600" />
            )}
          </button>

          {openSections.bare_earth && (
            <div className="p-3 pt-0 border-t border-slate-200/60 space-y-2 text-xs">
              <p className="text-[10px] text-slate-600 leading-snug">
                Synthetic time-series composite stripping green canopy to reveal pure bedrock spectral reflectance.
              </p>
              <div className="p-2 rounded-lg bg-white/60 border border-slate-200 text-[11px] space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-600">Vegetation Penetration:</span>
                  <span className="text-emerald-400 font-mono">92.4% Clear</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Seasonal Composite:</span>
                  <span className="text-slate-700 font-mono">Dry Season Median</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Accordion Item: Lineament and Structure Detection */}
        <div className="rounded-xl border border-slate-200 bg-slate-50/40 overflow-hidden transition-colors hover:border-slate-300">
          <button
            onClick={() => toggleSection('lineaments')}
            className="w-full p-3 flex items-center justify-between text-left text-xs font-bold text-slate-800 hover:text-slate-900 transition-colors"
          >
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-purple-400" />
              <span>Lineament & Structure Detection</span>
            </div>
            {openSections.lineaments ? (
              <ChevronDown className="w-4 h-4 text-purple-400" />
            ) : (
              <ChevronRight className="w-4 h-4 text-slate-600" />
            )}
          </button>

          {openSections.lineaments && (
            <div className="p-3 pt-0 border-t border-slate-200/60 space-y-2 text-xs">
              <p className="text-[10px] text-slate-600 leading-snug">
                Automated Hough transform & directional Sobel filtering tracing fold hinges and fault zones.
              </p>
              <div className="p-2 rounded-lg bg-white/60 border border-slate-200 space-y-1 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-slate-600">Dominant Strike:</span>
                  <span className="font-mono text-purple-400 font-bold">N68°E (Sausar Belt)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Fault Correlation:</span>
                  <span className="font-mono text-slate-900">94.8%</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer Info */}
      <div className="p-3 border-t border-slate-200/80 bg-white/60 text-[11px] text-slate-600 flex items-center justify-between">
        <span className="font-mono text-[10px]">MOIL EO Intelligence</span>
        <span className="text-emerald-400 font-mono text-[10px]">24 Bands Active</span>
      </div>
    </aside>
  );
};

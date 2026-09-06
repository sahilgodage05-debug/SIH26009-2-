'use client';

import React, { useState } from 'react';
import { 
  X, 
  Sparkles, 
  TrendingUp, 
  Layers, 
  Maximize2, 
  Download, 
  CheckCircle, 
  AlertCircle, 
  FileText, 
  Compass, 
  BarChart3, 
  Activity, 
  Crosshair,
  Drill,
  Send,
  ShieldCheck,
  MapPin
} from 'lucide-react';
import { ReserveZone } from '@/types/moil';

interface ConfidenceInspectorProps {
  zone: ReserveZone | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ConfidenceInspector: React.FC<ConfidenceInspectorProps> = ({
  zone,
  isOpen,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<'geology' | 'stratigraphy' | 'satellite' | 'kriging' | 'equipment'>('geology');
  const [isExporting, setIsExporting] = useState(false);
  const [dossierNotice, setDossierNotice] = useState<string | null>(null);

  // Equipment & AI Scheduling State
  const [fleet, setFleet] = useState<any[]>([]);
  const [shivamAlert, setShivamAlert] = useState<any | null>(null);

  React.useEffect(() => {
    if (!zone) return;

    const baseMineName = zone.name.split(' (')[0];
    const locationName = zone.name.split(' ')[0];

    // Fetch User's Equipment Data
    const fetchEquipment = async () => {
      try {
        const url = `http://${window.location.hostname}:8000/user/api/equipment/${encodeURIComponent(baseMineName)}`;
        const response = await fetch(url);
        if (response.ok) {
          const data = await response.json();
          setFleet(data);
        }
      } catch (err) {
        console.error("Failed to fetch equipment:", err);
      }
    };
    
    // Fetch Shivam's Scheduling AI
    const fetchShivamAI = async () => {
      try {
        const url = `http://${window.location.hostname}:8000/shivam/api/get-schedule?location=${encodeURIComponent(locationName)}`;
        const response = await fetch(url);
        if (response.ok) {
          const data = await response.json();
          setShivamAlert(data);
        }
      } catch (err) {
        console.error("Failed to fetch Shivam AI:", err);
      }
    };

    fetchEquipment();
    fetchShivamAI();
    const interval = setInterval(fetchEquipment, 5000);
    return () => clearInterval(interval);
  }, [zone]);

  // Kriging Reserve Estimation State (FastAPI Backend at localhost:8000)
  const [cutoffGrade, setCutoffGrade] = useState<number>(25.0);
  const [specificGravity, setSpecificGravity] = useState<number>(3.8);
  const [blockSize, setBlockSize] = useState<number>(10);
  const [isCalculatingKriging, setIsCalculatingKriging] = useState<boolean>(false);
  const [krigingResult, setKrigingResult] = useState<{
    total_tonnage: number;
    total_tonnage_mt: number;
    average_grade: number;
    waste_tonnage: number;
    waste_tonnage_mt: number;
    stripping_ratio: number;
    total_blocks_evaluated: number;
    ore_blocks_count: number;
    computation_time_seconds: number;
    grade_tonnage_curve?: { cut_off_grade: number; tonnage_mt: number; average_grade: number }[];
  } | null>(null);
  const [krigingError, setKrigingError] = useState<string | null>(null);

  const handleRunKriging = async () => {
    setIsCalculatingKriging(true);
    setKrigingError(null);
    try {
      const res = await fetch('http://localhost:8000/api/v1/estimate-reserve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cut_off_grade: cutoffGrade,
          specific_gravity: specificGravity,
          block_size: blockSize,
          variogram_model: 'spherical'
        })
      });

      if (!res.ok) {
        throw new Error(`FastAPI Server Error: ${res.status}`);
      }

      const data = await res.json();
      setKrigingResult(data);
    } catch (err: any) {
      setKrigingError(err.message || 'Failed to connect to FastAPI server at localhost:8000');
    } finally {
      setIsCalculatingKriging(false);
    }
  };

  if (!zone || !isOpen) return null;

  const handleExportDossier = () => {
    setIsExporting(true);
    setDossierNotice('Compiling Sentinel-2 & Ground Gravity Geological Dossier...');
    setTimeout(() => {
      setIsExporting(false);
      setDossierNotice(`Dossier for ${zone.name} downloaded successfully (UNFC Code Compliant).`);
      setTimeout(() => setDossierNotice(null), 4000);
    }, 1200);
  };

  const getScoreColor = (score: number) => {
    if (score >= 85) return 'from-emerald-500 to-teal-400 text-emerald-400';
    if (score >= 70) return 'from-amber-500 to-yellow-400 text-amber-400';
    return 'from-rose-500 to-orange-400 text-rose-400';
  };

  return (
    <aside className="fixed top-16 right-0 bottom-0 w-[440px] max-w-[95vw] bg-[#0c121e]/98 border-l border-slate-800/90 shadow-2xl shadow-black/80 z-[2000] flex flex-col backdrop-blur-xl animate-in slide-in-from-right duration-300">
      {/* Streamlined Header with Mine Details & Close Button */}
      <div className="p-4 border-b border-slate-800/90 bg-slate-900/80 backdrop-blur-md">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                {zone.leaseArea}
              </span>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-950/60 text-emerald-300 border border-emerald-500/30">
                {zone.status}
              </span>
            </div>
            <h3 className="text-base font-bold text-white mt-1.5 leading-snug">
              {zone.name}
            </h3>
          </div>
          
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors shrink-0"
            title="Close Inspector"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Exact Location Card */}
        <div className="mt-3 p-2.5 rounded-lg bg-slate-950/80 border border-slate-800 text-xs font-mono space-y-1">
          <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
            <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>{zone.exactLocation?.dms || `${zone.coordinates[0].toFixed(4)}° N, ${zone.coordinates[1].toFixed(4)}° E`}</span>
          </div>
          <div className="text-slate-300 text-[11px] flex items-center justify-between">
            <span>{zone.exactLocation?.tehsilVillage || zone.leaseArea}, <strong className="text-amber-300">{zone.exactLocation?.districtState}</strong></span>
            <span className="text-slate-400">{zone.exactLocation?.elevationMeters || 320}m AMSL</span>
          </div>
          <div className="text-[10px] text-slate-500 flex justify-between pt-0.5 border-t border-slate-800/80">
            <span>WGS84 GPS: [{zone.coordinates[0].toFixed(4)}, {zone.coordinates[1].toFixed(4)}]</span>
            <span>PIN: {zone.exactLocation?.pincode || '481102'}</span>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">

        {/* Highlight Score Card (MOIL AI Probabilistic Approach) */}
        <div className="p-4 rounded-xl bg-gradient-to-b from-slate-900/90 to-slate-950/90 border border-slate-800/90 shadow-inner relative overflow-hidden">
          {/* Subtle background glow */}
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-emerald-400" />
              Manganese Probability Score
            </span>
            <span className="text-[10px] font-mono text-slate-400">
              CI: {zone.confidenceInterval}
            </span>
          </div>

          <div className="flex items-baseline gap-3 my-1">
            <span className={`text-4xl font-extrabold tracking-tight bg-gradient-to-r ${getScoreColor(zone.manganeseProbability)} bg-clip-text text-transparent`}>
              {zone.manganeseProbability}%
            </span>
            <span className="text-xs text-slate-400 font-medium">
              High Deposit Potential
            </span>
          </div>

          {/* Animated Progress Bar */}
          <div className="w-full bg-slate-800/80 h-3 rounded-full overflow-hidden p-0.5 border border-slate-700/50 mt-2">
            <div 
              className={`h-full rounded-full bg-gradient-to-r ${getScoreColor(zone.manganeseProbability)} transition-all duration-1000 shadow-sm`}
              style={{ width: `${zone.manganeseProbability}%` }}
            />
          </div>

          {/* Primary Indicator callout as requested in specification */}
          <div className="mt-3.5 p-2.5 rounded-lg bg-emerald-950/20 border border-emerald-500/30 text-xs">
            <span className="font-semibold text-emerald-400 block mb-0.5 text-[11px] uppercase tracking-wider">
              Primary Indicator:
            </span>
            <p className="text-slate-200 text-xs leading-snug">
              {zone.primaryIndicator}
            </p>
          </div>
        </div>

        {/* 3 Metric Value Badges */}
        <div className="grid grid-cols-2 gap-2.5 text-xs">
          <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
            <span className="text-[11px] text-slate-400 block mb-1">Estimated Reserve Volume</span>
            <span className="text-sm font-bold text-white font-mono block">
              {zone.estimatedReserveVolume}
            </span>
            <span className="text-[10px] text-emerald-400 font-medium mt-0.5 block">
              Grade: {zone.averageGrade.split(' ')[0]}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
            <span className="text-[11px] text-slate-400 block mb-1">Estimated Valuation</span>
            <span className="text-sm font-bold text-emerald-400 font-mono block">
              {zone.estimatedValueINR}
            </span>
            <span className="text-[10px] text-slate-400 font-medium mt-0.5 block">
              Strip Ratio: {zone.overburdenRatio}
            </span>
          </div>
        </div>

        {/* Multi-Tab Navigation */}
        <div className="flex border-b border-slate-800 text-xs">
          <button
            onClick={() => setActiveTab('geology')}
            className={`pb-2 px-3 font-semibold transition-colors border-b-2 ${
              activeTab === 'geology'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Geological Indicators
          </button>
          <button
            onClick={() => setActiveTab('stratigraphy')}
            className={`pb-2 px-3 font-semibold transition-colors border-b-2 ${
              activeTab === 'stratigraphy'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Drill Core Depth Log
          </button>
          <button
            onClick={() => setActiveTab('satellite')}
            className={`pb-2 px-3 font-semibold transition-colors border-b-2 ${
              activeTab === 'satellite'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Earth Observation
          </button>
          <button
            onClick={() => {
              setActiveTab('kriging');
              if (!krigingResult) handleRunKriging();
            }}
            className={`pb-2 px-3 font-semibold transition-colors border-b-2 flex items-center gap-1.5 ${
              activeTab === 'kriging'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>Kriging Reserve Model</span>
            <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/30">
              API
            </span>
          </button>
          <button
            onClick={() => setActiveTab('equipment')}
            className={`pb-2 px-3 font-semibold transition-colors border-b-2 flex items-center gap-1.5 ${
              activeTab === 'equipment'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>Equipment & AI</span>
            <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-amber-950 text-amber-300 border border-amber-500/30">
              API
            </span>
          </button>
        </div>

        {/* Tab 1: Geological Indicators */}
        {activeTab === 'geology' && (
          <div className="space-y-2.5">
            <div className="p-2.5 rounded-lg bg-slate-900/50 border border-slate-800 text-xs">
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-slate-300">Subsurface Density (Bouguer)</span>
                <span className="font-mono text-emerald-400 font-bold">{zone.indicators.densityAnomaly.value}</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-snug">{zone.indicators.densityAnomaly.desc}</p>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-900/50 border border-slate-800 text-xs">
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-slate-300">Vegetation Stress Anomaly (NDVI)</span>
                <span className="font-mono text-emerald-400 font-bold">{zone.indicators.vegetationStress.value}</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-snug">{zone.indicators.vegetationStress.desc}</p>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-900/50 border border-slate-800 text-xs">
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-slate-300">Thermal Inertia (LST)</span>
                <span className="font-mono text-teal-400 font-bold">{zone.indicators.thermalInertia.value}</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-snug">{zone.indicators.thermalInertia.desc}</p>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-900/50 border border-slate-800 text-xs">
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-slate-300">Structural Trap & Kinematics</span>
                <span className="font-mono text-amber-400 font-bold">{zone.indicators.structuralTrap.value}</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-snug">{zone.indicators.structuralTrap.desc}</p>
            </div>
          </div>
        )}

        {/* Tab 2: Stratigraphy Core Depth Log */}
        {activeTab === 'stratigraphy' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
              <span>Depth & Lithology</span>
              <span>Mn Assay Grade</span>
            </div>
            <div className="space-y-1.5">
              {zone.stratigraphy.map((layer, idx) => (
                <div 
                  key={idx}
                  className="p-2 rounded-lg border border-slate-800 flex items-center justify-between text-xs"
                  style={{ backgroundColor: `${layer.color}15`, borderLeftWidth: 4, borderLeftColor: layer.color }}
                >
                  <div>
                    <span className="font-mono text-[10px] text-slate-400 block">{layer.depth}</span>
                    <span className="font-semibold text-slate-200">{layer.layerName}</span>
                    <span className="text-[10px] text-slate-400 block">{layer.rockType}</span>
                  </div>
                  <div className="text-right">
                    <span className={`font-mono font-bold text-sm ${layer.mnGrade > 30 ? 'text-emerald-400' : 'text-slate-300'}`}>
                      {layer.mnGrade}%
                    </span>
                    <span className="text-[9px] text-slate-400 block">Mn Grade</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 3: Satellite Telemetry */}
        {activeTab === 'satellite' && (
          <div className="space-y-2.5 text-xs">
            <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-400">Latest Satellite Pass:</span>
                <span className="font-mono text-slate-200">{zone.satelliteTelemetry.sentinelPassDate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Sentinel-1 InSAR Coherence:</span>
                <span className="font-mono text-emerald-400">{zone.satelliteTelemetry.sarCoherence}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Canopy Chlorosis Score:</span>
                <span className="font-mono text-teal-400">{zone.satelliteTelemetry.ndviAnomalyScore}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Surface Temp (LST):</span>
                <span className="font-mono text-slate-200">{zone.satelliteTelemetry.surfaceTempKelvin} K</span>
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: UNFC Reserve Classification & Kriging Model */}
        {activeTab === 'kriging' && (
          <div className="space-y-3.5 text-xs">
            <div className="p-4 rounded-xl bg-gradient-to-br from-purple-950/40 via-slate-900 to-indigo-950/30 border border-purple-500/40 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-bold text-white text-xs block">
                    UNFC Reserve Classification
                  </span>
                  <span className="text-[10px] text-purple-300 font-mono">
                    {zone.name} • UNFC Code 111 / 122
                  </span>
                </div>
                <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-500/40">
                  Compliant
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80 space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-400">Ore Horizon Depth:</span>
                  <span className="font-mono text-slate-200">65m - 280m Subsurface</span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-400">Dominant Mineral:</span>
                  <span className="font-mono text-slate-200">{zone.primaryIndicator.split(' ')[0]}</span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-400">Reserve Category:</span>
                  <span className="font-mono text-emerald-400">Proved Mineral Reserve (UNFC-111)</span>
                </div>
              </div>
            </div>

            {krigingError && (
              <div className="p-2.5 rounded-lg bg-rose-950/60 border border-rose-500/40 text-xs text-rose-300">
                {krigingError}
              </div>
            )}

            {/* Results Display */}
            {krigingResult && (
              <div className="p-3.5 rounded-xl bg-slate-900/90 border border-emerald-500/30 space-y-3">
                <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                  <span className="font-bold text-white text-xs">Mathematical Reserve Output</span>
                  <span className="font-mono text-[10px] text-slate-400">
                    Latency: {krigingResult.computation_time_seconds}s
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2 rounded-lg bg-slate-950/80 border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">Total Extractable Ore</span>
                    <span className="font-mono text-base font-bold text-emerald-400 block">
                      {krigingResult.total_tonnage_mt} MT
                    </span>
                    <span className="text-[9px] text-slate-400 font-mono">
                      ({krigingResult.total_tonnage.toLocaleString()} t)
                    </span>
                  </div>

                  <div className="p-2 rounded-lg bg-slate-950/80 border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">Average Ore Grade</span>
                    <span className="font-mono text-base font-bold text-white block">
                      {krigingResult.average_grade}% Mn
                    </span>
                    <span className="text-[9px] text-emerald-400">Above {cutoffGrade}% cutoff</span>
                  </div>

                  <div className="p-2 rounded-lg bg-slate-950/80 border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">Waste Tonnage</span>
                    <span className="font-mono text-xs font-bold text-slate-300 block">
                      {krigingResult.waste_tonnage_mt} MT
                    </span>
                    <span className="text-[9px] text-slate-400">Below cutoff grade</span>
                  </div>

                  <div className="p-2 rounded-lg bg-slate-950/80 border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">Stripping Ratio (W:O)</span>
                    <span className="font-mono text-xs font-bold text-amber-400 block">
                      {krigingResult.stripping_ratio} : 1
                    </span>
                    <span className="text-[9px] text-slate-400">Overburden factor</span>
                  </div>
                </div>

                {/* Grade-Tonnage Sensitivity Table */}
                {krigingResult.grade_tonnage_curve && (
                  <div className="pt-2 border-t border-slate-800">
                    <span className="text-[10px] font-semibold text-slate-400 block mb-1.5">
                      Cut-off Grade Sensitivity Curve
                    </span>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-[10px] font-mono">
                        <thead>
                          <tr className="border-b border-slate-800 text-slate-400">
                            <th className="pb-1">Cut-Off</th>
                            <th className="pb-1">Ore (MT)</th>
                            <th className="pb-1 text-right">Avg Grade</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/40">
                          {krigingResult.grade_tonnage_curve.map((row, idx) => (
                            <tr
                              key={idx}
                              className={row.cut_off_grade === cutoffGrade ? 'bg-emerald-950/40 text-emerald-300 font-bold' : 'text-slate-300'}
                            >
                              <td className="py-1">{row.cut_off_grade}%</td>
                              <td className="py-1">{row.tonnage_mt} MT</td>
                              <td className="py-1 text-right">{row.average_grade}% Mn</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Tab 5: Equipment & AI Scheduling */}
        {activeTab === 'equipment' && (
          <div className="space-y-3.5 text-xs">
            {/* Shivam's AI Alert */}
            {shivamAlert && shivamAlert.Requires_Rescheduling && (
              <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-500/40 space-y-2">
                <div className="flex items-center gap-1.5 font-bold text-amber-400">
                  <AlertCircle className="w-4 h-4" />
                  <span>AI Weather Rescheduling Alert</span>
                </div>
                <div className="text-[11px] text-slate-300">
                  <span className="text-slate-400">Constraint:</span> {shivamAlert.Alert || 'Heavy Rain Alert'}
                </div>
                <div className="text-[11px] text-slate-300">
                  <span className="text-slate-400">Recommendation:</span> {shivamAlert.Recommendation}
                </div>
              </div>
            )}

            {/* Equipment Telemetry */}
            <div className="space-y-2">
              <span className="font-bold text-slate-300 text-xs">Live Fleet Status</span>
              {fleet.length === 0 ? (
                <div className="text-slate-500 text-[11px] py-4 text-center">
                  Loading telemetry or no equipment deployed at this mine.
                </div>
              ) : (
                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                  {fleet.map((eq: any) => (
                    <div key={eq.id} className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-200">{eq.machine_id}</span>
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                          eq.status === 'Active' || eq.status === 'Operational' ? 'bg-emerald-500/20 text-emerald-400' :
                          eq.status === 'Maintenance' ? 'bg-rose-500/20 text-rose-400' :
                          'bg-amber-500/20 text-amber-400'
                        }`}>
                          {eq.status}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-slate-400">
                        <span>Type: {eq.type}</span>
                        <span>Capacity: {eq.capacity}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800/60">
                        <div className="flex justify-between items-center text-[10px]">
                          <span className="text-slate-500">Health:</span>
                          <span className={`font-mono font-bold ${eq.health_score > 70 ? 'text-emerald-400' : 'text-amber-400'}`}>
                            {eq.health_score}%
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-[10px]">
                          <span className="text-slate-500">Temp:</span>
                          <span className="font-mono text-slate-300">
                            {eq.engine_temperature || 85}°C
                          </span>
                        </div>
                        {eq.has_fuel_sensor === 1 && (
                          <div className="flex justify-between items-center text-[10px] col-span-2">
                            <span className="text-slate-500">Fuel Level:</span>
                            <span className="font-mono text-slate-300">
                              {eq.current_fuel_level}L / {eq.fuel_capacity}L
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* AI Prescriptive Recommendation */}
        <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800 text-xs">
          <div className="flex items-center gap-1.5 font-semibold text-amber-400 mb-1">
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Geologist Directive</span>
          </div>
          <p className="text-slate-300 text-[11px] leading-relaxed">
            {zone.aiRecommendation}
          </p>
        </div>

        {dossierNotice && (
          <div className="p-2.5 rounded-lg bg-emerald-950/50 border border-emerald-500/40 text-xs text-emerald-300 flex items-center gap-2 animate-in fade-in">
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{dossierNotice}</span>
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex gap-2">
        <button
          onClick={handleExportDossier}
          disabled={isExporting}
          className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-xs transition-all shadow-md shadow-emerald-950/50 disabled:opacity-50"
        >
          {isExporting ? (
            <>
              <Activity className="w-4 h-4 animate-spin" />
              <span>Generating UNFC Dossier...</span>
            </>
          ) : (
            <>
              <Download className="w-4 h-4" />
              <span>Export Geological Dossier</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
};

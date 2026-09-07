'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { RESERVE_ZONES } from '@/data/moilData';
import { 
  ArrowLeft, Activity, MapPin, Layers, Pickaxe, 
  CloudRain, Thermometer, Droplets, Leaf, 
  HardHat, Truck, AlertTriangle, CheckCircle2, TrendingUp,
  Compass, Mountain, Radio, Zap, Settings, Clock
} from 'lucide-react';

export default function MinePage() {
  const { id } = useParams();
  const router = useRouter();

  const [fleet, setFleet] = useState<any[]>([]);
  const [loadingFleet, setLoadingFleet] = useState(true);

  const zone = RESERVE_ZONES.find(z => z.id === id);

  useEffect(() => {
    if (!zone) return;
    const baseMineName = zone.name.split(' (')[0];
    
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
      } finally {
        setLoadingFleet(false);
      }
    };

    fetchEquipment();
    const interval = setInterval(fetchEquipment, 10000);
    return () => clearInterval(interval);
  }, [zone]);

  if (!zone) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#090d16] text-white">
        <h1 className="text-2xl font-bold mb-4">Mine Not Found</h1>
        <button 
          onClick={() => router.push('/')}
          className="px-4 py-2 bg-emerald-600 rounded-lg hover:bg-emerald-500 transition-colors"
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  // Calculate fleet stats
  const activeFleet = fleet.filter(f => f.status === 'Active').length;
  const maintenanceFleet = fleet.filter(f => f.status === 'Maintenance').length;
  const avgHealth = fleet.length > 0 ? fleet.reduce((acc, f) => acc + f.health_score, 0) / fleet.length : 0;
  // Fallback worker count if backend doesn't provide it on fleet, though it does duplicate it currently
  const workerCount = fleet.length > 0 ? fleet[0].workers_count : 'Loading...';

  const getScoreColor = (score: number) => {
    if (score >= 85) return 'text-emerald-400';
    if (score >= 70) return 'text-amber-400';
    return 'text-rose-400';
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#090d16] text-slate-300 overflow-y-auto custom-scrollbar">
      {/* Header with full metadata */}
      <div className="sticky top-0 z-50 flex items-center justify-between p-4 px-8 border-b border-slate-800/80 bg-[#0c121e]/90 backdrop-blur-md">
        <div className="flex items-center gap-6">
          <button 
            onClick={() => router.push('/')}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition-colors border border-slate-700"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold text-white uppercase tracking-wider">{zone.name}</h1>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[11px] font-bold border border-emerald-500/30">
                {zone.status}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-mono text-slate-400">
              <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {zone.exactLocation?.tehsilVillage}, {zone.exactLocation?.districtState} - {zone.exactLocation?.pincode}</span>
              <span className="text-slate-600">|</span>
              <span className="flex items-center gap-1"><Compass className="w-3.5 h-3.5" /> {zone.exactLocation?.dms}</span>
              <span className="text-slate-600">|</span>
              <span className="flex items-center gap-1"><Mountain className="w-3.5 h-3.5" /> Elev: {zone.exactLocation?.elevationMeters}m</span>
              <span className="text-slate-600">|</span>
              <span>Lease: {zone.leaseArea}</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Dashboard Grid */}
      <div className="max-w-[1400px] mx-auto w-full p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* ROW 1 */}
        {/* Core AI & Reserve Specs */}
        <div className="col-span-1 md:col-span-2 grid grid-cols-2 gap-4">
          <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800/50 border border-slate-800 shadow-lg">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">AI Manganese Probability</h3>
            </div>
            <div className="flex items-baseline gap-3">
              <span className={`text-5xl font-extrabold ${getScoreColor(zone.manganeseProbability)}`}>
                {zone.manganeseProbability}%
              </span>
              <span className="text-xs font-mono text-slate-500">CI: {zone.confidenceInterval}</span>
            </div>
            <p className="mt-3 text-xs text-slate-300 leading-relaxed bg-slate-950/50 p-2.5 rounded-lg border border-slate-800/50">
              <strong className="text-emerald-400 block mb-1">Primary Indicator:</strong>
              {zone.primaryIndicator}
            </p>
          </div>

          <div className="grid grid-rows-2 gap-4">
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 shadow-lg flex flex-col justify-center">
              <span className="text-xs font-bold text-slate-400 uppercase mb-1">Estimated Reserve Volume</span>
              <span className="text-2xl font-mono text-white">{zone.estimatedReserveVolume}</span>
              <span className="text-xs text-emerald-400 mt-1 font-medium flex items-center gap-1">
                <Pickaxe className="w-3.5 h-3.5" /> Grade: {zone.averageGrade}
              </span>
            </div>
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 shadow-lg flex flex-col justify-center">
              <span className="text-xs font-bold text-slate-400 uppercase mb-1">Estimated Valuation</span>
              <span className="text-2xl font-mono text-emerald-400">{zone.estimatedValueINR}</span>
              <span className="text-xs text-slate-400 mt-1 font-medium flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5" /> Strip Ratio: {zone.overburdenRatio}
              </span>
            </div>
          </div>
        </div>

        {/* Weather & Space Telemetry */}
        <div className="col-span-1 p-5 rounded-2xl bg-slate-900/60 border border-slate-800 shadow-lg">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Live Earth Observation (GEE)</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-800/50 text-center">
              <CloudRain className="w-5 h-5 text-blue-400 mx-auto mb-2" />
              <div className="text-lg font-mono text-white">{zone.spaceTelemetry?.rainfall_mm_hr || 'N/A'}</div>
              <div className="text-[10px] text-slate-400 uppercase mt-1">Rainfall (mm/hr)</div>
            </div>
            <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-800/50 text-center">
              <Droplets className="w-5 h-5 text-cyan-400 mx-auto mb-2" />
              <div className="text-lg font-mono text-white">{zone.spaceTelemetry?.soilMoisturePercent || 'N/A'}%</div>
              <div className="text-[10px] text-slate-400 uppercase mt-1">Soil Moisture</div>
            </div>
            <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-800/50 text-center">
              <Thermometer className="w-5 h-5 text-orange-400 mx-auto mb-2" />
              <div className="text-lg font-mono text-white">{zone.spaceTelemetry?.surfaceTempKelvin || 'N/A'}</div>
              <div className="text-[10px] text-slate-400 uppercase mt-1">Surface Temp (K)</div>
            </div>
            <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-800/50 text-center">
              <Leaf className="w-5 h-5 text-emerald-400 mx-auto mb-2" />
              <div className="text-lg font-mono text-white">{zone.spaceTelemetry?.ndviVegetationIndex || 'N/A'}</div>
              <div className="text-[10px] text-slate-400 uppercase mt-1">NDVI Anomaly</div>
            </div>
          </div>
        </div>

        {/* ROW 2 */}
        {/* Geophysical Indicators */}
        <div className="col-span-1 md:col-span-2 p-6 rounded-2xl bg-slate-900/60 border border-slate-800 shadow-lg">
          <div className="flex items-center gap-2 mb-4">
            <Radio className="w-5 h-5 text-indigo-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Geophysical & Structural Indicators</h3>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {Object.entries(zone.indicators || {}).map(([key, ind]: [string, any]) => (
              <div key={key} className="bg-slate-950/50 p-4 rounded-xl border border-slate-800/50">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs font-bold text-slate-400 uppercase">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    {ind.status}
                  </span>
                </div>
                <div className="text-lg font-mono text-white mb-1">{ind.value}</div>
                <p className="text-[11px] text-slate-500 leading-relaxed">{ind.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Workforce Capacity & Satellite Details */}
        <div className="col-span-1 flex flex-col gap-6">
          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 shadow-lg flex items-center gap-4">
            <div className="p-4 bg-indigo-500/10 rounded-full border border-indigo-500/20 text-indigo-400">
              <HardHat className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Workforce Capacity</h3>
              <div className="text-3xl font-mono text-white">{workerCount}</div>
              <div className="text-[11px] text-slate-500 mt-1">Active Miners & Staff</div>
            </div>
          </div>

          <div className="flex-1 p-5 rounded-2xl bg-slate-900/60 border border-slate-800 shadow-lg">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Satellite Telemetry</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between border-b border-slate-800 pb-2">
                <span className="text-slate-500">Pass Date</span>
                <span className="text-slate-300 font-mono">{zone.satelliteTelemetry?.sentinelPassDate}</span>
              </div>
              <div className="flex justify-between border-b border-slate-800 pb-2">
                <span className="text-slate-500">SAR Coherence</span>
                <span className="text-emerald-400 font-mono font-bold">{zone.satelliteTelemetry?.sarCoherence}</span>
              </div>
              <div className="flex justify-between border-b border-slate-800 pb-2">
                <span className="text-slate-500">NDVI Score</span>
                <span className="text-slate-300 font-mono">{zone.satelliteTelemetry?.ndviAnomalyScore}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ROW 3 */}
        {/* Stratigraphy / Geological Profile */}
        <div className="col-span-1 md:col-span-3 p-6 rounded-2xl bg-slate-900/60 border border-slate-800 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-indigo-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Geological Stratigraphy Log</h3>
            </div>
            {/* AI Recommendation Badge */}
            <div className="max-w-xl p-2.5 rounded-lg bg-indigo-950/20 border border-indigo-500/30 text-indigo-200 text-xs flex gap-2 items-start">
              <Zap className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
              <p>{zone.aiRecommendation}</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {zone.stratigraphy.map((layer, idx) => (
              <div key={idx} className="flex items-center bg-slate-950/50 rounded-xl p-3 border border-slate-800/50 hover:bg-slate-800 transition-colors">
                <div 
                  className="w-2 h-10 rounded-full mr-4 shrink-0" 
                  style={{ backgroundColor: layer.color }}
                />
                <div className="w-24 shrink-0 text-sm font-mono text-slate-400">{layer.depth}</div>
                <div className="flex-1">
                  <div className="text-sm font-bold text-slate-200">{layer.rockType}</div>
                  <div className="text-xs text-slate-500">{layer.layerName}</div>
                </div>
                <div className="w-24 shrink-0 text-right font-mono text-emerald-400 text-base font-bold">{layer.mnGrade.toFixed(1)}% Mn</div>
              </div>
            ))}
          </div>
        </div>

        {/* ROW 4 */}
        {/* Full Equipment Telemetry Grid */}
        <div className="col-span-1 md:col-span-3 p-6 rounded-2xl bg-slate-900/60 border border-slate-800 shadow-lg">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Truck className="w-5 h-5 text-emerald-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Live Fleet Telemetry & Diagnostics</h3>
            </div>
            <div className="flex gap-6">
              <div className="flex flex-col items-end">
                <span className="text-[10px] text-slate-500 uppercase">Avg Fleet Health</span>
                <span className="text-lg font-mono font-bold text-emerald-400">{avgHealth.toFixed(1)}%</span>
              </div>
              <div className="flex gap-2">
                <div className="bg-emerald-950/30 px-3 py-1.5 rounded-lg border border-emerald-900/50 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span className="text-sm font-mono text-white">{activeFleet} Active</span>
                </div>
                <div className="bg-rose-950/30 px-3 py-1.5 rounded-lg border border-rose-900/50 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-500" />
                  <span className="text-sm font-mono text-white">{maintenanceFleet} Maint</span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {fleet.map((f: any, idx) => (
              <div key={idx} className="bg-slate-950/50 p-4 rounded-xl border border-slate-800/70 hover:border-slate-600 transition-colors">
                <div className="flex justify-between items-start mb-3 border-b border-slate-800/80 pb-3">
                  <div>
                    <h4 className="font-mono text-emerald-400 font-bold">{f.machine_id}</h4>
                    <span className="text-[10px] text-slate-500 uppercase">{f.equipment_type}</span>
                  </div>
                  <div className="text-right">
                    <span className={`text-lg font-bold font-mono ${f.status === 'Active' ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {f.health_score}%
                    </span>
                    <span className="block text-[10px] uppercase text-slate-500">{f.status}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-y-3 gap-x-2 text-xs">
                  <div>
                    <span className="block text-[10px] text-slate-500 uppercase mb-0.5">Engine Temp</span>
                    <span className="font-mono text-slate-300">{f.engine_temp_c}°C</span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-slate-500 uppercase mb-0.5">Oil Pressure</span>
                    <span className="font-mono text-slate-300">{f.oil_pressure_psi} PSI</span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-slate-500 uppercase mb-0.5">Vibration</span>
                    <span className="font-mono text-slate-300">{f.vibration_hz} Hz</span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-slate-500 uppercase mb-0.5">Fuel / Battery</span>
                    <span className="font-mono text-slate-300">
                      {f.equipment_type === 'Electric LHD' ? `${f.battery_voltage_v}V` : `${f.fuel_consumption_lph} L/h`}
                    </span>
                  </div>
                  <div className="col-span-2 flex items-center gap-2 mt-1">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    <span className="text-slate-400">Total Ops: {f.operating_hours} hrs</span>
                  </div>
                </div>
              </div>
            ))}
            
            {fleet.length === 0 && !loadingFleet && (
              <div className="col-span-3 text-center p-8 text-slate-500">
                No equipment data found for this mine.
              </div>
            )}
            {loadingFleet && (
              <div className="col-span-3 text-center p-8 text-slate-500 animate-pulse">
                Fetching secure telemetry...
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
